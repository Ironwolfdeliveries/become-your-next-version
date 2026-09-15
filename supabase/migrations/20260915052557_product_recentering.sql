-- Additive member experience. Existing answers, scores, plans and reflections
-- are never backfilled or rewritten. Root will create the migration via CLI.

create or replace function public.bynv_valid_plan_steps(p_steps jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare v_step jsonb; v_ids text[] := '{}';
begin
  if jsonb_typeof(p_steps) is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_steps) not between 1 and 3 then return false; end if;
  for v_step in select value from jsonb_array_elements(p_steps) loop
    if jsonb_typeof(v_step) is distinct from 'object'
      or jsonb_typeof(v_step->'id') is distinct from 'string'
      or char_length(btrim(v_step->>'id')) not between 1 and 80
      or jsonb_typeof(v_step->'text') is distinct from 'string'
      or char_length(btrim(v_step->>'text')) not between 1 and 1000
      or jsonb_typeof(v_step->'done') is distinct from 'boolean'
      or (v_step->>'id') = any(v_ids) then return false; end if;
    v_ids := array_append(v_ids, v_step->>'id');
  end loop;
  return true;
end;
$$;
revoke all on function public.bynv_valid_plan_steps(jsonb) from public, anon;
grant execute on function public.bynv_valid_plan_steps(jsonb) to authenticated;

alter table public.profiles add column if not exists timezone text not null default 'America/New_York';
alter table public.daily_focus_entries
  add column if not exists steps jsonb,
  add column if not exists check_in text,
  add column if not exists recovery jsonb,
  add column if not exists cycle_id uuid references public.architect_cycles(id) on delete set null;
alter table public.architect_cycles
  add column if not exists success_vision text,
  add column if not exists plan_steps text[] not null default '{}',
  add column if not exists commitment_rule text,
  add column if not exists pillar_key text,
  add column if not exists goal_id uuid references public.goals(id) on delete set null,
  add column if not exists completed_at timestamptz;
alter table public.goals
  add column if not exists success_vision text,
  add column if not exists commitment_rule text,
  add column if not exists advanced_at timestamptz;

alter table public.daily_focus_entries add constraint daily_focus_steps_valid
  check (steps is null or public.bynv_valid_plan_steps(steps));
alter table public.daily_focus_entries add constraint daily_focus_check_in_valid
  check (check_in is null or check_in in ('done','progress','missed'));
alter table public.daily_focus_entries add constraint daily_focus_recovery_object
  check (recovery is null or jsonb_typeof(recovery) = 'object');
alter table public.architect_cycles add constraint architect_cycles_commitment_valid
  check (commitment_rule is null or commitment_rule in ('recommit','blocker','shrink','reset','partner'));
alter table public.architect_cycles add constraint architect_cycles_plan_size
  check (cardinality(plan_steps) between 0 and 3);
alter table public.architect_cycles add constraint architect_cycles_area_valid
  check (pillar_key is null or pillar_key in ('clarity','energy','action','resilience','relationships','environment','growth'));
alter table public.goals add constraint goals_commitment_valid
  check (commitment_rule is null or commitment_rule in ('recommit','blocker','shrink','reset','partner'));
alter table public.goals add constraint goals_success_vision_length
  check (success_vision is null or char_length(success_vision) <= 1000);
create index if not exists daily_focus_cycle_idx on public.daily_focus_entries(cycle_id);
create index if not exists architect_cycles_goal_idx on public.architect_cycles(goal_id);

-- Existing tables remain writable under their ownership RLS policies. Enforce
-- linked ownership and modern plan consistency for direct Data API writes too.
create or replace function public.bynv_guard_experience_links()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_all_done boolean; v_any_done boolean; v_action_text text;
begin
  if tg_table_name='architect_cycles' then
    if new.status='active' and (tg_op='INSERT' or old.status is distinct from 'active') then
      perform 1 from public.profiles where id=new.user_id for update;
      if not found then raise exception using errcode='42501', message='That member profile is not available.'; end if;
      if exists(select 1 from public.architect_cycles where user_id=new.user_id and status='active' and id<>new.id) then
        raise exception using errcode='40001', message='This member already has an active cycle. Review it before starting another.';
      end if;
    end if;
    if new.goal_id is not null and not exists(select 1 from public.goals where id=new.goal_id and user_id=new.user_id) then
      raise exception using errcode='42501', message='That goal is not available to this account.';
    end if;
  elsif tg_table_name='daily_focus_entries' then
    if new.cycle_id is not null and not exists(select 1 from public.architect_cycles where id=new.cycle_id and user_id=new.user_id) then
      raise exception using errcode='42501', message='That cycle is not available to this account.';
    end if;
    if new.steps is not null then
      if not public.bynv_valid_plan_steps(new.steps) then raise exception using errcode='22023', message='Choose one to three valid steps.'; end if;
      select bool_and((value->>'done')::boolean),bool_or((value->>'done')::boolean),string_agg(value->>'text',E'\n' order by ordinal)
        into v_all_done,v_any_done,v_action_text from jsonb_array_elements(new.steps) with ordinality as items(value,ordinal);
      if new.completed is distinct from v_all_done or (coalesce(new.check_in='done',false) is distinct from v_all_done)
        or (new.check_in='missed' and v_any_done) or new.action is distinct from v_action_text then
        raise exception using errcode='22023', message='Your saved steps and check-in do not match. Reload your plan before saving.';
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.bynv_guard_experience_links() from public, anon;
grant execute on function public.bynv_guard_experience_links() to authenticated;
create trigger bynv_guard_daily_experience before insert or update on public.daily_focus_entries
  for each row execute function public.bynv_guard_experience_links();
create trigger bynv_guard_cycle_experience before insert or update on public.architect_cycles
  for each row execute function public.bynv_guard_experience_links();

-- All mutations run under the caller's RLS policies. Locking the caller's
-- profile serializes the new experience operations without changing any
-- existing member data or requiring a destructive duplicate-cycle cleanup.
create or replace function public.bynv_change_experience(p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_action text := p_payload->>'action';
  v_timezone text;
  v_today date;
  v_date date;
  v_expected timestamptz;
  v_entry public.daily_focus_entries%rowtype;
  v_target public.daily_focus_entries%rowtype;
  v_cycle public.architect_cycles%rowtype;
  v_exists boolean;
  v_target_exists boolean;
  v_steps jsonb;
  v_target_steps jsonb;
  v_step jsonb;
  v_status text;
  v_done boolean;
  v_any_done boolean;
  v_cycle_id uuid;
  v_goal_id uuid;
  v_id uuid;
  v_focus text;
  v_success text;
  v_rule text;
  v_pillar text;
  v_plan text[];
  v_next_action text;
  v_strategy text;
  v_blocker text;
  v_note text;
begin
  if v_user is null then raise exception using errcode='42501', message='Sign in to continue your plan.'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>20000 then
    raise exception using errcode='22023', message='Please check your plan.';
  end if;
  select timezone into v_timezone from public.profiles where id=v_user for update;
  if not found then raise exception using errcode='42501', message='Your member profile is not available.'; end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=v_timezone) then v_timezone := 'America/New_York'; end if;
  v_today := (current_timestamp at time zone v_timezone)::date;

  if v_action='orientation' then
    v_timezone := p_payload->>'timezone';
    if jsonb_typeof(p_payload->'timezone') is distinct from 'string' or char_length(v_timezone)>64
      or not exists(select 1 from pg_catalog.pg_timezone_names where name=v_timezone) then
      raise exception using errcode='22023', message='Choose a valid timezone.';
    end if;
    update public.profiles set onboarding_completed=true,timezone=v_timezone where id=v_user;
    return jsonb_build_object('ok',true);
  end if;

  if v_action in ('save-day','recover','review-cycle') then
    if not (p_payload ? 'expected_updated_at') or jsonb_typeof(p_payload->'expected_updated_at') not in ('string','null') then
      raise exception using errcode='22023', message='Reload your saved plan before trying again.';
    end if;
    v_expected := (p_payload->>'expected_updated_at')::timestamptz;
  end if;

  if v_action='save-day' then
    if coalesce(p_payload->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception using errcode='22023', message='Choose a valid date.'; end if;
    v_date := (p_payload->>'date')::date;
    if v_date<>v_today then raise exception using errcode='40001', message='A new day has started. Reload Today’s Plan before saving.'; end if;
    v_steps := p_payload->'steps';
    if not public.bynv_valid_plan_steps(v_steps) then raise exception using errcode='22023', message='Choose one to three realistic steps, up to 1,000 characters each.'; end if;
    if jsonb_typeof(p_payload->'priority') is distinct from 'string' or char_length(p_payload->>'priority')>200
      or jsonb_typeof(p_payload->'reflection') is distinct from 'string' or char_length(p_payload->>'reflection')>2000 then
      raise exception using errcode='22023', message='Keep your priority under 200 characters and note under 2,000 characters.';
    end if;
    v_status := p_payload->>'check_in';
    if not (p_payload ? 'check_in') or jsonb_typeof(p_payload->'check_in') not in ('string','null')
      or (v_status is not null and v_status not in ('done','progress','missed')) then
      raise exception using errcode='22023', message='Choose how today went.';
    end if;
    v_cycle_id := (p_payload->>'cycle_id')::uuid;
    if v_cycle_id is not null and not exists(select 1 from public.architect_cycles where id=v_cycle_id and user_id=v_user) then
      raise exception using errcode='42501', message='That cycle is not available to your account.';
    end if;
    select * into v_entry from public.daily_focus_entries where user_id=v_user and focus_date=v_date for update;
    v_exists := found;
    if (v_exists and v_entry.updated_at is distinct from v_expected) or (not v_exists and v_expected is not null) then
      raise exception using errcode='40001', message='Today’s Plan changed in another window. Reload it before saving.';
    end if;
    if v_status='done' then
      select jsonb_agg(jsonb_set(value,'{done}','true'::jsonb) order by ordinal) into v_steps from jsonb_array_elements(v_steps) with ordinality as items(value,ordinal);
    end if;
    select bool_and((value->>'done')::boolean),bool_or((value->>'done')::boolean) into v_done,v_any_done from jsonb_array_elements(v_steps);
    if v_status='missed' and v_any_done then raise exception using errcode='22023', message='You completed a step. Choose Made progress or adjust the step first.'; end if;
    if v_done then v_status := 'done'; end if;
    select string_agg(value->>'text',E'\n' order by ordinal) into v_next_action from jsonb_array_elements(v_steps) with ordinality as items(value,ordinal);
    if v_exists then
      update public.daily_focus_entries set priority=nullif(btrim(p_payload->>'priority'),''), action=v_next_action,
        steps=v_steps,completed=v_done,check_in=v_status,reflection=nullif(btrim(p_payload->>'reflection'),''),cycle_id=v_cycle_id
        where id=v_entry.id and user_id=v_user;
    else
      insert into public.daily_focus_entries(user_id,focus_date,priority,action,steps,completed,check_in,reflection,cycle_id)
        values(v_user,v_date,nullif(btrim(p_payload->>'priority'),''),v_next_action,v_steps,v_done,v_status,nullif(btrim(p_payload->>'reflection'),''),v_cycle_id);
    end if;
    if v_status in ('done','progress') and v_cycle_id is not null then
      update public.goals set advanced_at=current_timestamp where user_id=v_user and status='active'
        and id=(select goal_id from public.architect_cycles where id=v_cycle_id and user_id=v_user);
    end if;
    return jsonb_build_object('ok',true);
  end if;

  if v_action='recover' then
    v_id := (p_payload->>'entry_id')::uuid;
    v_strategy := p_payload->>'strategy';
    v_next_action := btrim(p_payload->>'next_action');
    v_blocker := coalesce(btrim(p_payload->>'blocker'),'');
    if v_strategy is null or v_strategy not in ('keep','shrink','reschedule','replace')
      or jsonb_typeof(p_payload->'next_action') is distinct from 'string' or char_length(v_next_action) not between 1 and 1000
      or char_length(v_blocker)>1000 then raise exception using errcode='22023', message='Choose a recovery option and a short next action.'; end if;
    if coalesce(p_payload->>'next_date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception using errcode='22023', message='Choose a valid date.'; end if;
    v_date := (p_payload->>'next_date')::date;
    select * into v_entry from public.daily_focus_entries where id=v_id and user_id=v_user for update;
    if not found then raise exception using errcode='42501', message='That action is not available to your account.'; end if;
    if v_entry.updated_at is distinct from v_expected or v_entry.recovery is not null then
      raise exception using errcode='40001', message='This action has already changed. Reload your plan to continue.';
    end if;
    if v_date<v_today or v_date<=v_entry.focus_date or v_date>v_today+365 then
      raise exception using errcode='22023', message='Choose today or a future date after the original action, within the next year.';
    end if;
    v_steps := v_entry.steps;
    if v_steps is null then
      v_steps := case when nullif(btrim(v_entry.action),'') is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('id','legacy','text',v_entry.action,'done',v_entry.completed)) end;
    end if;
    if v_entry.completed or v_entry.check_in='done' or not exists(select 1 from jsonb_array_elements(v_steps) where (value->>'done')::boolean=false) then
      raise exception using errcode='40001', message='This action is already complete or has no unfinished steps.';
    end if;
    select * into v_target from public.daily_focus_entries where user_id=v_user and focus_date=v_date for update;
    v_target_exists := found;
    v_target_steps := coalesce(v_target.steps,'[]'::jsonb);
    if v_target_exists and v_target.steps is null and nullif(btrim(v_target.action),'') is not null then
      -- Carry legacy action text and completion through intact.
      v_target_steps := jsonb_build_array(jsonb_build_object('id','legacy','text',v_target.action,'done',v_target.completed));
    end if;
    if v_target_exists and (v_target.completed or v_target.check_in='done') then
      raise exception using errcode='40001', message='That day is already complete. Choose a different day; the original action is still saved.';
    end if;
    if exists(select 1 from jsonb_array_elements(v_target_steps) where btrim(value->>'text')=v_next_action and (value->>'done')::boolean) then
      raise exception using errcode='40001', message='That action is already completed on the chosen day. Choose another action or date.';
    end if;
    if not exists(select 1 from jsonb_array_elements(v_target_steps) where btrim(value->>'text')=v_next_action and not (value->>'done')::boolean) then
      if jsonb_array_length(v_target_steps)>=3 then raise exception using errcode='40001', message='That day already has three steps. Choose another day; the original action is still saved.'; end if;
      v_target_steps := v_target_steps || jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'text',v_next_action,'done',false));
    end if;
    -- Legacy text may exceed new input limits. Never truncate it to merge.
    if not public.bynv_valid_plan_steps(v_target_steps) then raise exception using errcode='40001', message='That day contains an older detailed plan. Choose an empty day to preserve it.'; end if;
    select string_agg(value->>'text',E'\n' order by ordinal) into v_focus from jsonb_array_elements(v_target_steps) with ordinality as items(value,ordinal);
    if v_target_exists then
      update public.daily_focus_entries set steps=v_target_steps,action=v_focus,
        priority=coalesce(priority,v_entry.priority),cycle_id=coalesce(cycle_id,v_entry.cycle_id)
        where id=v_target.id and user_id=v_user;
    else
      insert into public.daily_focus_entries(user_id,focus_date,priority,action,steps,completed,cycle_id)
        values(v_user,v_date,v_entry.priority,v_focus,v_target_steps,false,v_entry.cycle_id);
    end if;
    update public.daily_focus_entries set recovery=jsonb_build_object('strategy',v_strategy,'next_date',v_date,'next_action',v_next_action,'resolved_at',current_timestamp,'blocker',v_blocker)
      where id=v_entry.id and user_id=v_user;
    return jsonb_build_object('ok',true);
  end if;

  if v_action='start-cycle' then
    v_focus := btrim(p_payload->>'focus'); v_success := btrim(p_payload->>'success_vision');
    v_rule := p_payload->>'commitment_rule'; v_pillar := p_payload->>'pillar_key'; v_goal_id := (p_payload->>'goal_id')::uuid;
    if jsonb_typeof(p_payload->'focus') is distinct from 'string' or char_length(v_focus) not between 1 and 240
      or jsonb_typeof(p_payload->'success_vision') is distinct from 'string' or char_length(v_success) not between 1 and 1000 then
      raise exception using errcode='22023', message='Name your focus and what meaningful progress would look like.';
    end if;
    if (v_rule is not null and v_rule not in ('recommit','blocker','shrink','reset','partner'))
      or (v_pillar is not null and v_pillar not in ('clarity','energy','action','resilience','relationships','environment','growth')) then
      raise exception using errcode='22023', message='Choose one of the available life areas and commitment rules.';
    end if;
    if jsonb_typeof(p_payload->'plan_steps') is distinct from 'array' then raise exception using errcode='22023', message='Choose one to three steps.'; end if;
    if jsonb_array_length(p_payload->'plan_steps') not between 1 and 3 then raise exception using errcode='22023', message='Choose one to three steps.'; end if;
    v_plan := '{}'; v_steps := '[]';
    for v_step in select value from jsonb_array_elements(p_payload->'plan_steps') loop
      v_next_action := btrim(v_step #>> '{}');
      if jsonb_typeof(v_step) is distinct from 'string' or char_length(v_next_action) not between 1 and 1000 then raise exception using errcode='22023', message='Keep each step specific and under 1,000 characters.'; end if;
      v_plan := array_append(v_plan,v_next_action);
      v_steps := v_steps || jsonb_build_array(jsonb_build_object('id',gen_random_uuid()::text,'text',v_next_action,'done',false));
    end loop;
    if not exists(select 1 from public.architect_assessments where user_id=v_user and status='completed') then
      raise exception using errcode='22023', message='Complete your Architect Assessment before starting your first cycle.';
    end if;
    if exists(select 1 from public.architect_cycles where user_id=v_user and status='active') then
      raise exception using errcode='40001', message='You already have an active cycle. Reload it to continue or review it before starting another.';
    end if;
    if v_goal_id is not null and not exists(select 1 from public.goals where id=v_goal_id and user_id=v_user and status='active') then
      raise exception using errcode='42501', message='That active goal is not available to your account.';
    end if;
    insert into public.architect_cycles(user_id,starts_on,ends_on,focus,success_vision,plan_steps,commitment_rule,pillar_key,goal_id)
      values(v_user,v_today,v_today+13,v_focus,v_success,v_plan,v_rule,v_pillar,v_goal_id) returning id into v_cycle_id;
    -- A saved day is never replaced by automatic cycle seeding, even when empty.
    if not exists(select 1 from public.daily_focus_entries where user_id=v_user and focus_date=v_today) then
      insert into public.daily_focus_entries(user_id,focus_date,priority,action,steps,completed,cycle_id)
        values(v_user,v_today,left(v_focus,200),array_to_string(v_plan,E'\n'),v_steps,false,v_cycle_id);
    end if;
    return jsonb_build_object('ok',true);
  end if;

  if v_action='review-cycle' then
    v_id := (p_payload->>'cycle_id')::uuid;
    v_note := btrim(p_payload->>'outcome');
    if jsonb_typeof(p_payload->'outcome') is distinct from 'string' or char_length(v_note)>3000 then raise exception using errcode='22023', message='Keep the cycle review under 3,000 characters.'; end if;
    select * into v_cycle from public.architect_cycles where id=v_id and user_id=v_user for update;
    if not found then raise exception using errcode='42501', message='That cycle is not available to your account.'; end if;
    if v_cycle.updated_at is distinct from v_expected or v_cycle.status<>'active' then
      raise exception using errcode='40001', message='This cycle has already changed. Reload it before saving your review.';
    end if;
    update public.architect_cycles set status='completed',outcome=nullif(v_note,''),completed_at=current_timestamp where id=v_id and user_id=v_user;
    -- A completed cycle advances its linked goal; it never claims the goal itself is finished.
    if v_cycle.goal_id is not null then update public.goals set advanced_at=current_timestamp where id=v_cycle.goal_id and user_id=v_user and status='active'; end if;
    return jsonb_build_object('ok',true);
  end if;
  raise exception using errcode='22023', message='That change is not supported.';
end;
$$;
revoke all on function public.bynv_change_experience(jsonb) from public, anon;
grant execute on function public.bynv_change_experience(jsonb) to authenticated;

-- Additive assessment preservation: no existing scores, answers, or Blueprints are rewritten.
-- Root includes this SQL in the single reviewed product-recentering migration.
alter table public.architect_assessments add column if not exists revision bigint not null default 0;

create or replace function public.guard_architect_assessment_history()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.status = 'completed' then
    raise exception 'Completed assessments are saved history. Start a new assessment to reassess.' using errcode = '55000';
  end if;
  if new.id <> old.id or new.user_id <> old.user_id or new.version <> old.version then
    raise exception 'Assessment identity cannot be changed.' using errcode = '22023';
  end if;
  new.revision := old.revision + 1;
  return new;
end;
$$;
drop trigger if exists guard_architect_assessment_history on public.architect_assessments;
create trigger guard_architect_assessment_history before update on public.architect_assessments
for each row execute function public.guard_architect_assessment_history();

-- A member can discard an unfinished draft; completed history is retained.
drop policy if exists "Members delete own architect_assessments" on public.architect_assessments;
create policy "Members delete own architect_assessments" on public.architect_assessments
for delete to authenticated using ((select auth.uid()) = user_id and status = 'in_progress');

create or replace function public.guard_architect_blueprint_history()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.id <> old.id or new.user_id <> old.user_id or new.assessment_id is distinct from old.assessment_id then
    raise exception 'Blueprint identity cannot be changed.' using errcode = '22023';
  end if;
  if exists (select 1 from public.architect_assessments where id = old.assessment_id and status = 'completed')
    and (new.priorities is distinct from old.priorities or new.strengths is distinct from old.strengths
      or new.friction_points is distinct from old.friction_points or new.first_actions is distinct from old.first_actions) then
    raise exception 'A completed Blueprint is saved history. Complete a new assessment to create another.' using errcode = '55000';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_architect_blueprint_history on public.architect_blueprints;
create trigger guard_architect_blueprint_history before update on public.architect_blueprints
for each row execute function public.guard_architect_blueprint_history();
drop policy if exists "Members delete own architect_blueprints" on public.architect_blueprints;
create policy "Members delete own architect_blueprints" on public.architect_blueprints
for delete to authenticated using ((select auth.uid()) = user_id and not exists
  (select 1 from public.architect_assessments a where a.id = assessment_id and a.status = 'completed'));

create or replace function public.begin_architect_assessment(p_reassess boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_assessment public.architect_assessments%rowtype;
  v_version integer;
begin
  if v_user is null then raise exception 'Please sign in again.' using errcode = '28000'; end if;
  if p_reassess is null then raise exception 'Choose whether to start a new assessment.' using errcode = '22023'; end if;
  -- A per-member lock also covers the first assessment, when no assessment row exists.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('bynv-assessment:' || v_user::text, 0));
  select * into v_assessment from public.architect_assessments
    where user_id = v_user and status = 'in_progress' order by version desc limit 1 for update;
  if found then return pg_catalog.to_jsonb(v_assessment); end if;
  select * into v_assessment from public.architect_assessments
    where user_id = v_user and status = 'completed' order by version desc limit 1;
  if found and not p_reassess then return pg_catalog.to_jsonb(v_assessment); end if;
  select coalesce(max(version), 0) + 1 into v_version from public.architect_assessments where user_id = v_user;
  insert into public.architect_assessments(user_id, version) values(v_user, v_version) returning * into v_assessment;
  return pg_catalog.to_jsonb(v_assessment);
end;
$$;

create or replace function public.save_architect_assessment(
  p_id uuid, p_revision bigint, p_answers jsonb, p_section integer, p_complete boolean default false
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_assessment public.architect_assessments%rowtype;
  v_config jsonb := '[
    {"key":"clarity","label":"Clarity & Direction","questions":["priorities","direction","decisions","values","first-focus"],"action":"Name one 90-day outcome and the decision it makes easier this week."},
    {"key":"energy","label":"Energy & Wellbeing","questions":["rest","routines","awareness","boundaries","recovery"],"action":"Protect one repeatable recovery block in your calendar this week."},
    {"key":"action","label":"Action & Consistency","questions":["weekly","start","finish","systems","review"],"action":"Reduce one priority to a ten-minute action and repeat it three times."},
    {"key":"resilience","label":"Resilience & Adaptability","questions":["reset","flexibility","learning","pressure","self-trust"],"action":"Write a simple reset plan for the next time the week changes direction."},
    {"key":"relationships","label":"Relationships & Support","questions":["support","presence","communication","community","contribution"],"action":"Ask one trusted person for the specific support or conversation you need."},
    {"key":"environment","label":"Environment & Systems","questions":["space","tools","distraction","calendar","support"],"action":"Remove one recurring source of friction from your primary space or system."},
    {"key":"growth","label":"Reflection & Growth","questions":["review","feedback","progress","learning","next-version"],"action":"Schedule a 15-minute weekly review to keep, change, or remove one thing."}
  ]'::jsonb;
  v_section jsonb;
  v_question text;
  v_key text;
  v_value jsonb;
  v_known text[] := '{}';
  v_sum integer := 0;
  v_count integer := 0;
  v_section_sum integer;
  v_section_count integer;
  v_section_score integer;
  v_score integer;
  v_sections jsonb := '[]';
  v_priorities jsonb;
  v_strengths jsonb;
  v_friction jsonb;
  v_actions jsonb;
begin
  if v_user is null then raise exception 'Please sign in again.' using errcode = '28000'; end if;
  if p_id is null or p_revision is null or p_revision < 0 or p_section is null or p_section not between 0 and 6
    or p_complete is null or p_answers is null or pg_catalog.jsonb_typeof(p_answers) <> 'object' then
    raise exception 'The assessment save was incomplete. Please reload and try again.' using errcode = '22023';
  end if;
  select * into v_assessment from public.architect_assessments where id = p_id and user_id = v_user for update;
  if not found then raise exception 'Your assessment could not be found.' using errcode = 'P0002'; end if;
  if v_assessment.status = 'completed' then
    -- Retrying an acknowledged-or-lost completion is safe and does not write again.
    if p_complete and v_assessment.answers = p_answers and v_assessment.current_section = p_section
      and exists(select 1 from public.architect_blueprints where assessment_id = p_id and user_id = v_user) then
      return pg_catalog.to_jsonb(v_assessment);
    end if;
    raise exception 'This assessment was completed in another tab. Reload to view your saved Blueprint.' using errcode = '40001';
  end if;
  if v_assessment.revision <> p_revision then
    raise exception 'Your assessment changed in another tab. Reload the latest saved version before continuing.' using errcode = '40001';
  end if;

  -- Validate the existing 35 scored + 7 optional question contract. No client-supplied scores.
  for v_section in select value from pg_catalog.jsonb_array_elements(v_config) loop
    v_section_sum := 0; v_section_count := 0;
    for v_question in select value from pg_catalog.jsonb_array_elements_text(v_section->'questions') loop
      v_key := (v_section->>'key') || '-' || v_question;
      v_known := pg_catalog.array_append(v_known, v_key);
      if p_answers ? v_key then
        v_value := p_answers->v_key;
        if pg_catalog.jsonb_typeof(v_value) <> 'number' or v_value::text not in ('1','2','3','4','5') then
          raise exception 'Scored answers must be whole numbers from 1 to 5.' using errcode = '22023';
        end if;
        v_section_sum := v_section_sum + (v_value::text)::integer;
        v_section_count := v_section_count + 1;
      end if;
    end loop;
    v_key := (v_section->>'key') || '-reflection';
    v_known := pg_catalog.array_append(v_known, v_key);
    if p_answers ? v_key and (pg_catalog.jsonb_typeof(p_answers->v_key) <> 'string' or pg_catalog.char_length(p_answers->>v_key) > 2000) then
      raise exception 'Optional reflections must be text of 2,000 characters or fewer.' using errcode = '22023';
    end if;
    v_section_score := case when v_section_count = 0 then 0 else pg_catalog.round(v_section_sum * 100.0 / (v_section_count * 5))::integer end;
    v_sections := v_sections || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('key',v_section->>'key','label',v_section->>'label','score',v_section_score,'answered',v_section_count));
    v_sum := v_sum + v_section_sum; v_count := v_count + v_section_count;
  end loop;
  if exists(select 1 from pg_catalog.jsonb_object_keys(p_answers) k where not (k = any(v_known))) then
    raise exception 'This save contains an unrecognized assessment answer.' using errcode = '22023';
  end if;
  if p_complete and v_count <> 35 then raise exception 'Answer all 35 scored questions before completing your assessment.' using errcode = '22023'; end if;
  if p_complete then
    v_score := pg_catalog.round(v_sum * 100.0 / 175)::integer;
    select pg_catalog.jsonb_agg(item - 'answered' order by (item->>'score')::integer, ordinal)
      into v_priorities from (select item, ordinal from pg_catalog.jsonb_array_elements(v_sections) with ordinality a(item,ordinal) order by (item->>'score')::integer, ordinal limit 2) selected;
    select pg_catalog.jsonb_agg(item - 'answered' order by ordinal) into v_strengths
      from pg_catalog.jsonb_array_elements(v_sections) with ordinality a(item,ordinal)
      where (item->>'score')::integer = (select max((value->>'score')::integer) from pg_catalog.jsonb_array_elements(v_sections));
    select pg_catalog.jsonb_agg((item->>'label') || ' currently has the most room for focused support.' order by ordinal)
      into v_friction from pg_catalog.jsonb_array_elements(v_priorities) with ordinality a(item,ordinal);
    select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('key',p.item->>'key','action',c.item->>'action') order by p.ordinal)
      into v_actions from pg_catalog.jsonb_array_elements(v_priorities) with ordinality p(item,ordinal)
      join pg_catalog.jsonb_array_elements(v_config) c(item) on c.item->>'key' = p.item->>'key';
    -- Insert before marking complete. A failed Blueprint write rolls back the entire save.
    insert into public.architect_blueprints(user_id,assessment_id,priorities,strengths,friction_points,first_actions)
      values(v_user,p_id,v_priorities,v_strengths,v_friction,v_actions);
  end if;
  update public.architect_assessments set answers = p_answers, current_section = p_section, section_results = v_sections,
    status = case when p_complete then 'completed' else 'in_progress' end,
    version_score = case when p_complete then v_score else version_score end,
    completed_at = case when p_complete then pg_catalog.now() else completed_at end
    where id = p_id and user_id = v_user and status = 'in_progress' and revision = p_revision returning * into v_assessment;
  if not found then raise exception 'Your assessment changed. Reload before continuing.' using errcode = '40001'; end if;
  return pg_catalog.to_jsonb(v_assessment);
end;
$$;

revoke all on function public.begin_architect_assessment(boolean) from public, anon;
revoke all on function public.save_architect_assessment(uuid,bigint,jsonb,integer,boolean) from public, anon;
revoke all on function public.guard_architect_assessment_history() from public, anon;
revoke all on function public.guard_architect_blueprint_history() from public, anon;
grant execute on function public.begin_architect_assessment(boolean) to authenticated;
grant execute on function public.save_architect_assessment(uuid,bigint,jsonb,integer,boolean) to authenticated;
