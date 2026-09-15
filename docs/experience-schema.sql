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
