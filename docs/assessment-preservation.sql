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
  if new.id <> old.id or new.user_id <> old.user_id or (new.assessment_id is distinct from old.assessment_id
    and not (new.assessment_id is null and not exists(select 1 from public.architect_assessments where id = old.assessment_id))) then
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
