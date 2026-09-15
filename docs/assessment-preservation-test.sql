-- Run after assessment-preservation.sql, using execute_sql as the database owner.
-- All records are synthetic and rolled back. No real member is read or changed.
begin;
select set_config('bynv.test_user', gen_random_uuid()::text, true);
select set_config('bynv.other_user', gen_random_uuid()::text, true);
insert into auth.users(id,email,raw_user_meta_data) values
  (current_setting('bynv.test_user')::uuid,'assessment-check-' || current_setting('bynv.test_user') || '@example.invalid','{"display_name":"Assessment preservation check"}'),
  (current_setting('bynv.other_user')::uuid,'assessment-check-' || current_setting('bynv.other_user') || '@example.invalid','{"display_name":"Other assessment check"}');
select set_config('request.jwt.claim.sub', current_setting('bynv.test_user'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub',current_setting('bynv.test_user'),'role','authenticated')::text, true);
-- Deliberately retain a historic score that differs from today's formula output.
-- Re-reading/reassessing must preserve the original 59 exactly.
insert into public.architect_assessments(user_id,version,status,version_score,answers,section_results,completed_at)
values(current_setting('bynv.test_user')::uuid,1,'completed',59,'{"clarity-priorities":3}', '[{"key":"clarity","label":"Clarity & Direction","score":60,"answered":5}]', now());
insert into public.architect_blueprints(user_id,assessment_id,priorities,strengths,first_actions)
select user_id,id,'[{"key":"environment","label":"Environment & Systems","score":40}]','[{"key":"clarity","label":"Clarity & Direction","score":80}]','[{"key":"environment","action":"Keep this historic action."}]'
from public.architect_assessments where user_id = current_setting('bynv.test_user')::uuid;
set local role authenticated;
do $$
declare
  v_user uuid := current_setting('bynv.test_user')::uuid;
  baseline jsonb;
  baseline_blueprint jsonb;
  draft jsonb;
  resumed jsonb;
  saved jsonb;
  completed jsonb;
  retry jsonb;
  answers jsonb;
  section text;
  suffix text;
  keys jsonb := '{"clarity":["priorities","direction","decisions","values","first-focus"],"energy":["rest","routines","awareness","boundaries","recovery"],"action":["weekly","start","finish","systems","review"],"resilience":["reset","flexibility","learning","pressure","self-trust"],"relationships":["support","presence","communication","community","contribution"],"environment":["space","tools","distraction","calendar","support"],"growth":["review","feedback","progress","learning","next-version"]}';
  row_count integer;
begin
  baseline := public.begin_architect_assessment(false);
  if baseline->>'status' <> 'completed' or (baseline->>'version_score')::integer <> 59 then raise exception 'ASSERT: completed baseline must be returned intact'; end if;
  select to_jsonb(b) into baseline_blueprint from public.architect_blueprints b where assessment_id = (baseline->>'id')::uuid;
  draft := public.begin_architect_assessment(true);
  if (draft->>'version')::integer <> 2 or draft->>'status' <> 'in_progress' or draft->'answers' <> '{}'::jsonb then raise exception 'ASSERT: reassessment must create an empty new version'; end if;
  resumed := public.begin_architect_assessment(true);
  if resumed->>'id' <> draft->>'id' then raise exception 'ASSERT: a second begin must resume the same draft'; end if;
  resumed := public.begin_architect_assessment(false);
  if resumed->>'id' <> draft->>'id' then raise exception 'ASSERT: ordinary return must resume the latest draft'; end if;

  saved := public.save_architect_assessment((draft->>'id')::uuid,0,'{"clarity-priorities":2}',0,false);
  if (saved->>'revision')::bigint <> 1 then raise exception 'ASSERT: save must advance revision'; end if;
  begin
    perform public.save_architect_assessment((draft->>'id')::uuid,0,'{"clarity-priorities":5}',0,false);
    raise exception 'ASSERT: stale save must fail';
  exception when serialization_failure then null; end;
  begin
    perform public.save_architect_assessment((draft->>'id')::uuid,1,'{"clarity-priorities":2}',6,true);
    raise exception 'ASSERT: incomplete completion must fail';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.save_architect_assessment((draft->>'id')::uuid,1,'{"clarity-priorities":2.5}',0,false);
    raise exception 'ASSERT: fractional score must fail';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.save_architect_assessment((draft->>'id')::uuid,1,'{"unrecognized":3}',0,false);
    raise exception 'ASSERT: unexpected answer key must fail';
  exception when invalid_parameter_value then null; end;

  answers := '{}';
  for section in select jsonb_object_keys(keys) loop
    for suffix in select jsonb_array_elements_text(keys->section) loop
      answers := answers || jsonb_build_object(section || '-' || suffix, 3);
    end loop;
  end loop;
  answers := answers || jsonb_build_object('clarity-reflection','This note must not change the score.');
  -- Force a Blueprint uniqueness error to prove the assessment stays unfinished.
  insert into public.architect_blueprints(user_id,assessment_id) values(v_user,(draft->>'id')::uuid);
  begin
    perform public.save_architect_assessment((draft->>'id')::uuid,1,answers,6,true);
    raise exception 'ASSERT: duplicate Blueprint must fail atomically';
  exception when unique_violation then null; end;
  if exists(select 1 from public.architect_assessments where id = (draft->>'id')::uuid and (status <> 'in_progress' or revision <> 1)) then raise exception 'ASSERT: failed Blueprint write changed the assessment'; end if;
  delete from public.architect_blueprints where assessment_id = (draft->>'id')::uuid;
  completed := public.save_architect_assessment((draft->>'id')::uuid,1,answers,6,true);
  if completed->>'status' <> 'completed' or (completed->>'version_score')::integer <> 60 or jsonb_array_length(completed->'section_results') <> 7 then raise exception 'ASSERT: full completion and scoring failed'; end if;
  select count(*) into row_count from public.architect_blueprints where assessment_id = (draft->>'id')::uuid;
  if row_count <> 1 then raise exception 'ASSERT: completion requires exactly one Blueprint'; end if;
  retry := public.save_architect_assessment((draft->>'id')::uuid,1,answers,6,true);
  if retry <> completed then raise exception 'ASSERT: identical completion retry must not write'; end if;
  begin
    update public.architect_assessments set answers='{}',version_score=99 where id=(baseline->>'id')::uuid;
    raise exception 'ASSERT: completed baseline update must fail';
  exception when object_not_in_prerequisite_state then null; end;
  begin
    update public.architect_blueprints set first_actions='[]' where assessment_id=(baseline->>'id')::uuid;
    raise exception 'ASSERT: historic Blueprint update must fail';
  exception when object_not_in_prerequisite_state then null; end;
  delete from public.architect_assessments where id=(baseline->>'id')::uuid;
  get diagnostics row_count = row_count;
  if row_count <> 0 then raise exception 'ASSERT: completed history must not be deleted by member'; end if;
  if not exists(select 1 from public.architect_assessments a where a.id=(baseline->>'id')::uuid and to_jsonb(a)=baseline) then raise exception 'ASSERT: historic assessment was changed'; end if;
  if not exists(select 1 from public.architect_blueprints b where b.assessment_id=(baseline->>'id')::uuid and to_jsonb(b)=baseline_blueprint) then raise exception 'ASSERT: historic Blueprint was changed'; end if;

  perform set_config('request.jwt.claim.sub',current_setting('bynv.other_user'),true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('bynv.other_user'),'role','authenticated')::text,true);
  begin
    perform public.save_architect_assessment((draft->>'id')::uuid,2,answers,6,true);
    raise exception 'ASSERT: another member must not read or save this assessment';
  exception when no_data_found then null; end;
  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  begin
    perform public.begin_architect_assessment(false);
    raise exception 'ASSERT: missing identity must fail';
  exception when invalid_authorization_specification then null; end;
end;
$$;
reset role;
-- The history guard must still allow the platform's existing account-erasure cascade.
delete from auth.users where id = current_setting('bynv.test_user')::uuid;
do $$ begin
  if exists(select 1 from public.architect_assessments where user_id = current_setting('bynv.test_user')::uuid)
    or exists(select 1 from public.architect_blueprints where user_id = current_setting('bynv.test_user')::uuid) then
    raise exception 'ASSERT: account deletion must still remove its assessment and Blueprint records';
  end if;
end $$;
select 'PASS: baseline 59 and Blueprint unchanged; new versions, draft resume, stale saves, validation, atomic completion, retry, ownership, immutable history and account-erasure cascade verified; all data rolled back' as result;
rollback;
