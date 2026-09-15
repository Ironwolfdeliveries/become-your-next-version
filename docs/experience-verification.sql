-- Run after the experience migration as the database administrator.
-- Every row below belongs to two synthetic users and is rolled back.
begin;

insert into auth.users(id,email,raw_user_meta_data) values
 ('b1000000-0000-4000-8000-000000000001','bynv-experience-qa-1@example.invalid','{"display_name":"Experience QA One"}'),
 ('b1000000-0000-4000-8000-000000000002','bynv-experience-qa-2@example.invalid','{"display_name":"Experience QA Two"}');
insert into public.architect_assessments(user_id,version,status,version_score,answers,section_results,completed_at) values
 ('b1000000-0000-4000-8000-000000000001',1,'completed',59,'{"baseline":"preserve"}','[]',now()),
 ('b1000000-0000-4000-8000-000000000002',1,'completed',42,'{"baseline":"second member"}','[]',now());
insert into public.goals(id,user_id,title) values
 ('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','A useful goal'),
 ('b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','Other member goal');
insert into public.architect_cycles(id,user_id,starts_on,ends_on,focus,goal_id) values
 ('b3000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002',current_date,current_date+13,'Other member cycle','b2000000-0000-4000-8000-000000000002');
insert into public.daily_focus_entries(id,user_id,focus_date,priority,action,reflection) values
 ('b4000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001',(now() at time zone 'America/New_York')::date,'Saved priority','Saved legacy action','Saved legacy reflection'),
 ('b4000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001',(now() at time zone 'America/New_York')::date-1,'Earlier priority','Unfinished legacy action','Earlier reflection'),
 ('b4000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000001',(now() at time zone 'America/New_York')::date-2,'Another priority','Another unfinished action','Another reflection'),
 ('b4000000-0000-4000-8000-000000000004','b1000000-0000-4000-8000-000000000002',(now() at time zone 'America/New_York')::date-1,'Other priority','Private action','Private reflection');

set local role authenticated;
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

do $$
declare
  v_user uuid := 'b1000000-0000-4000-8000-000000000001';
  v_today date := (now() at time zone 'America/New_York')::date;
  v_cycle public.architect_cycles%rowtype;
  v_day public.daily_focus_entries%rowtype;
  v_source public.daily_focus_entries%rowtype;
  v_count integer;
  v_caught boolean;
  v_payload jsonb;
begin
  -- Orientation changes no assessment or plan data.
  perform public.bynv_change_experience(jsonb_build_object('action','orientation','timezone','America/New_York'));
  if not exists(select 1 from public.profiles where id=v_user and onboarding_completed and timezone='America/New_York') then raise exception 'Orientation was not saved'; end if;
  if not exists(select 1 from public.architect_assessments where user_id=v_user and version_score=59 and answers='{"baseline":"preserve"}'::jsonb) then raise exception 'Assessment baseline changed'; end if;

  perform public.bynv_change_experience(jsonb_build_object('action','start-cycle','focus','Improve my space','success_vision','Find the tools I need in one minute','plan_steps',jsonb_build_array('Clear one surface','Choose a place for keys'),'commitment_rule','shrink','pillar_key','environment','goal_id','b2000000-0000-4000-8000-000000000001'));
  select * into strict v_cycle from public.architect_cycles where user_id=v_user and status='active';
  if v_cycle.starts_on<>v_today or v_cycle.ends_on<>v_today+13 or cardinality(v_cycle.plan_steps)<>2 then raise exception '14-day cycle shape incorrect'; end if;
  select * into strict v_day from public.daily_focus_entries where user_id=v_user and focus_date=v_today;
  if v_day.action<>'Saved legacy action' or v_day.reflection<>'Saved legacy reflection' or v_day.steps is not null then raise exception 'Starting a cycle replaced the saved legacy day'; end if;

  v_caught := false;
  begin
    perform public.bynv_change_experience(jsonb_build_object('action','start-cycle','focus','Duplicate cycle','success_vision','Duplicate','plan_steps',jsonb_build_array('Duplicate'),'commitment_rule',null,'pillar_key',null,'goal_id',null));
  exception when sqlstate '40001' then v_caught := true; end;
  if not v_caught then raise exception 'Duplicate active cycle accepted'; end if;
  v_caught := false;
  begin insert into public.architect_cycles(user_id,starts_on,ends_on,focus) values(v_user,v_today,v_today+13,'Direct duplicate'); exception when sqlstate '40001' then v_caught:=true; end;
  if not v_caught then raise exception 'Direct Data API duplicate cycle accepted'; end if;

  -- A stale writer must not alter an existing row.
  v_payload := jsonb_build_object('action','save-day','date',v_today,'priority','New priority','steps',jsonb_build_array(jsonb_build_object('id','qa-step','text','Clear the desk','done',false)),'check_in','missed','reflection','A difficult day','cycle_id',v_cycle.id,'expected_updated_at',v_day.updated_at-interval '1 second');
  v_caught := false;
  begin perform public.bynv_change_experience(v_payload); exception when sqlstate '40001' then v_caught := true; end;
  if not v_caught or not exists(select 1 from public.daily_focus_entries where id=v_day.id and action='Saved legacy action') then raise exception 'Stale save changed legacy data'; end if;
  perform public.bynv_change_experience(jsonb_set(v_payload,'{expected_updated_at}',to_jsonb(v_day.updated_at)));
  select * into strict v_day from public.daily_focus_entries where id=v_day.id;
  if v_day.completed or v_day.check_in<>'missed' or v_day.steps->0->>'text'<>'Clear the desk' then raise exception 'Missed check-in was not saved consistently'; end if;

  -- Full-target rejection leaves the original action unresolved and intact.
  insert into public.daily_focus_entries(user_id,focus_date,action,steps) values(v_user,v_today+1,E'Existing one\nExisting two\nExisting three',jsonb_build_array(jsonb_build_object('id','full1','text','Existing one','done',false),jsonb_build_object('id','full2','text','Existing two','done',false),jsonb_build_object('id','full3','text','Existing three','done',false)));
  select * into strict v_source from public.daily_focus_entries where id='b4000000-0000-4000-8000-000000000002';
  v_payload := jsonb_build_object('action','recover','entry_id',v_source.id,'strategy','shrink','next_date',v_today+1,'next_action','Clear one corner','blocker','Too much at once','expected_updated_at',v_source.updated_at);
  v_caught := false;
  begin perform public.bynv_change_experience(v_payload); exception when sqlstate '40001' then v_caught := true; end;
  if not v_caught or exists(select 1 from public.daily_focus_entries where id=v_source.id and recovery is not null) then raise exception 'Full target consumed original action'; end if;
  delete from public.daily_focus_entries where user_id=v_user and focus_date=v_today+1;
  insert into public.daily_focus_entries(user_id,focus_date,action,reflection) values(v_user,v_today+1,'Existing target action','Existing target note');
  perform public.bynv_change_experience(v_payload);
  if not exists(select 1 from public.daily_focus_entries where id=v_source.id and action='Unfinished legacy action' and reflection='Earlier reflection' and steps is null and completed=false and recovery->>'strategy'='shrink') then raise exception 'Recovery altered original history'; end if;
  if not exists(select 1 from public.daily_focus_entries where user_id=v_user and focus_date=v_today+1 and jsonb_array_length(steps)=2 and reflection='Existing target note' and completed=false and steps->0->>'text'='Existing target action') then raise exception 'Recovery overwrote target work'; end if;

  -- Reusing an already pending target action does not duplicate it.
  select * into strict v_source from public.daily_focus_entries where id='b4000000-0000-4000-8000-000000000003';
  perform public.bynv_change_experience(jsonb_build_object('action','recover','entry_id',v_source.id,'strategy','keep','next_date',v_today+1,'next_action','Clear one corner','expected_updated_at',v_source.updated_at));
  if not exists(select 1 from public.daily_focus_entries where user_id=v_user and focus_date=v_today+1 and jsonb_array_length(steps)=2) then raise exception 'Recovery duplicated an existing pending step'; end if;

  -- Completion is reflected in both modern steps and the legacy boolean.
  select * into strict v_day from public.daily_focus_entries where user_id=v_user and focus_date=v_today;
  perform public.bynv_change_experience(jsonb_build_object('action','save-day','date',v_today,'priority',v_day.priority,'steps',v_day.steps,'check_in','done','reflection',v_day.reflection,'cycle_id',v_cycle.id,'expected_updated_at',v_day.updated_at));
  if not exists(select 1 from public.daily_focus_entries where id=v_day.id and completed and check_in='done' and (steps->0->>'done')::boolean) then raise exception 'Completion state disagrees'; end if;
  if not exists(select 1 from public.goals where id=v_cycle.goal_id and advanced_at is not null and status='active') then raise exception 'Linked goal advancement is incorrect'; end if;

  insert into public.daily_focus_entries(user_id,focus_date,action) values(v_user,v_today-3,'Still needs a next move') returning * into v_source;
  v_caught := false;
  begin perform public.bynv_change_experience(jsonb_build_object('action','recover','entry_id',v_source.id,'strategy','keep','next_date',v_today,'next_action','A new action','expected_updated_at',v_source.updated_at)); exception when sqlstate '40001' then v_caught:=true; end;
  if not v_caught or exists(select 1 from public.daily_focus_entries where id=v_source.id and recovery is not null) then raise exception 'Recovery reopened a completed day or consumed the source'; end if;

  -- Direct writes cannot create inconsistent plans or cross-owner references.
  v_caught := false;
  begin update public.daily_focus_entries set completed=false where id=v_day.id; exception when sqlstate '22023' then v_caught:=true; end;
  if not v_caught then raise exception 'Direct inconsistent completion accepted'; end if;
  v_caught := false;
  begin update public.daily_focus_entries set action='Stale client overwrite' where id=v_day.id; exception when sqlstate '22023' then v_caught:=true; end;
  if not v_caught then raise exception 'Stale direct client changed modern plan text'; end if;
  v_caught := false;
  begin update public.daily_focus_entries set cycle_id='b3000000-0000-4000-8000-000000000002' where id=v_day.id; exception when sqlstate '42501' then v_caught:=true; end;
  if not v_caught then raise exception 'Cross-owner cycle link accepted'; end if;
  v_caught := false;
  begin update public.architect_cycles set goal_id='b2000000-0000-4000-8000-000000000002' where id=v_cycle.id; exception when sqlstate '42501' then v_caught:=true; end;
  if not v_caught then raise exception 'Cross-owner goal link accepted'; end if;
  if exists(select 1 from public.daily_focus_entries where user_id='b1000000-0000-4000-8000-000000000002') then raise exception 'RLS disclosed another member history'; end if;
  update public.daily_focus_entries set reflection='Unauthorized' where id='b4000000-0000-4000-8000-000000000004';
  get diagnostics v_count=row_count;
  if v_count<>0 then raise exception 'RLS allowed another member update'; end if;
  v_caught := false;
  begin perform public.bynv_change_experience(jsonb_build_object('action','recover','entry_id','b4000000-0000-4000-8000-000000000004','strategy','keep','next_date',v_today+2,'next_action','Private action','expected_updated_at',now())); exception when sqlstate '42501' then v_caught:=true; end;
  if not v_caught then raise exception 'RPC allowed another member action'; end if;

  -- Expired cycles remain reviewable; reviewing never rewrites their dates.
  update public.architect_cycles set starts_on=v_today-14,ends_on=v_today-1 where id=v_cycle.id;
  select * into strict v_cycle from public.architect_cycles where id=v_cycle.id;
  perform public.bynv_change_experience(jsonb_build_object('action','review-cycle','cycle_id',v_cycle.id,'outcome','Found a repeatable approach','expected_updated_at',v_cycle.updated_at));
  if not exists(select 1 from public.architect_cycles where id=v_cycle.id and status='completed' and completed_at is not null and ends_on=v_today-1 and outcome='Found a repeatable approach') then raise exception 'Expired cycle review failed'; end if;
  perform public.bynv_change_experience(jsonb_build_object('action','start-cycle','focus','Build on the first cycle','success_vision','Repeat what worked','plan_steps',jsonb_build_array('Use the new system'),'commitment_rule',null,'pillar_key','environment','goal_id',null));
  select count(*) into v_count from public.architect_cycles where user_id=v_user and status='active';
  if v_count<>1 then raise exception 'Next-cycle continuation failed'; end if;
  if not exists(select 1 from public.daily_focus_entries where id=v_day.id and completed and check_in='done') then raise exception 'Next cycle overwrote completed day'; end if;
  if not exists(select 1 from public.architect_assessments where user_id=v_user and version_score=59 and answers='{"baseline":"preserve"}'::jsonb) then raise exception 'Assessment baseline changed during member operations'; end if;
  select * into strict v_cycle from public.architect_cycles where user_id=v_user and status='active';
  perform public.bynv_change_experience(jsonb_build_object('action','review-cycle','cycle_id',v_cycle.id,'outcome','Explicit early review','expected_updated_at',v_cycle.updated_at));
  if not exists(select 1 from public.architect_cycles where id=v_cycle.id and status='completed' and ends_on=v_today+13) then raise exception 'Explicit early completion failed'; end if;
end;
$$;

-- A member without today's entry gets the accepted plan in their own timezone.
select set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$
declare v_today date := (now() at time zone 'Pacific/Honolulu')::date;
begin
  perform public.bynv_change_experience(jsonb_build_object('action','orientation','timezone','Pacific/Honolulu'));
  update public.architect_cycles set status='archived' where id='b3000000-0000-4000-8000-000000000002';
  -- Existing test-only older data may fall on today's date after a timezone change.
  delete from public.daily_focus_entries where user_id=auth.uid() and focus_date=v_today;
  perform public.bynv_change_experience(jsonb_build_object('action','start-cycle','focus','My own direction','success_vision','A practical change','plan_steps',jsonb_build_array('First accepted step','Second accepted step'),'commitment_rule','recommit','pillar_key','clarity','goal_id','b2000000-0000-4000-8000-000000000002'));
  if not exists(select 1 from public.daily_focus_entries where user_id=auth.uid() and focus_date=v_today and jsonb_array_length(steps)=2 and steps->0->>'text'='First accepted step' and completed=false and cycle_id is not null) then raise exception 'Accepted cycle did not seed member-local today'; end if;
  if exists(select 1 from public.daily_focus_entries where user_id='b1000000-0000-4000-8000-000000000001') then raise exception 'Second member could see first member history'; end if;
end;
$$;

reset role;
do $$ begin
  if has_function_privilege('anon','public.bynv_change_experience(jsonb)','EXECUTE') then raise exception 'Anonymous role can execute member mutations'; end if;
end; $$;
select 'Experience verification passed: preservation, RLS, concurrency, recovery, completion and cycle continuation.' as result;
rollback;
