-- Synthetic members only. Run after the Momentum migration; every change rolls back.
begin;
insert into auth.users(id,email,raw_user_meta_data)
select ('c1000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,
       'momentum-qa-'||i||'@example.invalid','{"display_name":"Momentum QA"}'::jsonb
from generate_series(1,5) i;
insert into public.architect_assessments(user_id,version,status,version_score,answers,section_results,completed_at)
select id,1,'completed',59,'{"baseline":"unchanged"}'::jsonb,'[]'::jsonb,now()
from auth.users where email like 'momentum-qa-%@example.invalid';
set local role authenticated;
do $$
declare
 i integer; u uuid; g public.goals%rowtype; c public.architect_cycles%rowtype;
 d public.daily_focus_entries%rowtype; t date; caught boolean;
 focus text; reason text; strategy text; payload jsonb;
 review jsonb := '{"changed":"No clear change yet.","evidence":"I completed one starting action; the result still needs time.","helped":"A smaller step","remaining":"Keep practicing","carry":"Keep the short check-in"}';
begin
 for i in 1..5 loop
   u:=('c1000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
   perform set_config('request.jwt.claim.sub',u::text,true);
   focus:=(array['Finish my unfinished project','Build a health habit I choose','Grow in my work','Organize my everyday responsibilities','Explore what my next version means'])[i];
   reason:=(array['Too much to do','Forgot','Low energy','Avoided it','Something changed'])[i];
   strategy:=(array['keep','shrink','reschedule','replace','keep'])[i];
   t:=(now() at time zone 'America/New_York')::date;
   insert into public.goals(user_id,title,success_vision,motivation,personal_reward,custom_rule)
   values(u,focus,'Notice a change I can describe','It matters to me','Time for something I enjoy','Ask for help and choose one smaller step') returning * into g;
   perform public.bynv_change_momentum(jsonb_build_object('action','start-cycle','focus',focus,'success_vision',g.success_vision,'plan_steps',jsonb_build_array('Take my chosen starting action'),'goal_id',g.id,'personal_reward',g.personal_reward,'custom_rule',g.custom_rule));
   select * into strict c from public.architect_cycles where user_id=u and status='active';
   select * into strict d from public.daily_focus_entries where user_id=u and focus_date=t;
   if c.focus<>focus or c.ends_on<>t+13 or c.personal_reward<>g.personal_reward or d.cycle_id<>c.id then raise exception 'Personal direction or reward lost'; end if;
   perform public.bynv_change_momentum(jsonb_build_object('action','save-day','date',t,'priority',focus,'steps',d.steps,'check_in','missed','reflection','','cycle_id',c.id,'expected_updated_at',d.updated_at));
   select * into d from public.daily_focus_entries where id=d.id;
   payload:=jsonb_build_object('action','recover','entry_id',d.id,'reason',reason,'strategy',strategy,'next_date',t+1,'next_action','Try my smaller chosen action','expected_updated_at',d.updated_at);
   caught:=false;
   begin perform public.bynv_change_momentum(payload-'reason'); exception when sqlstate '22023' then caught:=true; end;
   if not caught or exists(select 1 from public.daily_focus_entries where id=d.id and recovery is not null) then raise exception 'Missing reason consumed source'; end if;
   perform public.bynv_change_momentum(payload);
   if not exists(select 1 from public.daily_focus_entries where id=d.id and check_in='missed' and recovery->>'reason'=reason and recovery->>'strategy'=strategy and action=d.action) then raise exception 'Recovery history not preserved'; end if;
   if not exists(select 1 from public.daily_focus_entries where user_id=u and focus_date=t+1 and steps->0->>'text'='Try my smaller chosen action') then raise exception 'Recovery not scheduled'; end if;
   caught:=false;
   begin perform public.bynv_change_momentum(payload); exception when sqlstate '40001' then caught:=true; end;
   if not caught then raise exception 'Duplicate recovery accepted'; end if;
   -- Neither direct table writes nor the legacy endpoint can bypass evidence.
   caught:=false;
   begin update public.goals set status='completed' where id=g.id; exception when sqlstate '22023' then caught:=true; end;
   if not caught then raise exception 'Direct goal completion bypassed evidence'; end if;
   caught:=false;
   begin perform public.bynv_change_experience(jsonb_build_object('action','review-cycle','cycle_id',c.id,'outcome','Completed','expected_updated_at',c.updated_at)); exception when sqlstate '22023' then caught:=true; end;
   if not caught then raise exception 'Legacy Cycle completion bypassed evidence'; end if;
   caught:=false;
   begin perform public.bynv_change_momentum(jsonb_build_object('action','review-cycle','cycle_id',c.id,'change_review',review,'expected_updated_at',c.updated_at-interval '1 second')); exception when sqlstate '40001' then caught:=true; end;
   if not caught then raise exception 'Stale review overwrote Cycle'; end if;
   perform public.bynv_change_momentum(jsonb_build_object('action','review-cycle','cycle_id',c.id,'change_review',review,'expected_updated_at',c.updated_at));
   if not exists(select 1 from public.architect_cycles where id=c.id and status='completed' and change_review=review and jsonb_array_length(review_history)=1) then raise exception 'Cycle review not stored'; end if;
   select * into g from public.goals where id=g.id;
   if g.status<>'active' or g.advanced_at is null then raise exception 'Cycle did not advance goal or falsely completed it'; end if;
   perform public.bynv_change_momentum(jsonb_build_object('action','complete-goal','goal_id',g.id,'change_review',review,'expected_updated_at',g.updated_at));
   update public.goals set status='active',review_history='[]'::jsonb where id=g.id;
   select * into g from public.goals where id=g.id;
   if g.change_review is not null or jsonb_array_length(g.review_history)<>1 then raise exception 'Reopening lost earlier evidence'; end if;
   caught:=false;
   begin update public.goals set status='completed' where id=g.id; exception when sqlstate '22023' then caught:=true; end;
   if not caught then raise exception 'Reopened goal reused completion without review'; end if;
   perform public.bynv_change_momentum(jsonb_build_object('action','complete-goal','goal_id',g.id,'change_review',review,'expected_updated_at',g.updated_at));
   if not exists(select 1 from public.goals where id=g.id and jsonb_array_length(review_history)=2) then raise exception 'Second review not retained'; end if;
   caught:=false;
   begin update public.goals set custom_rule='skip meals to punish myself' where id=g.id; exception when sqlstate '22023' then caught:=true; end;
   if not caught then raise exception 'Harmful custom response accepted'; end if;
   if not exists(select 1 from public.architect_assessments where user_id=u and version_score=59 and answers='{"baseline":"unchanged"}'::jsonb) then raise exception 'Assessment changed'; end if;
   if exists(select 1 from public.goals where user_id<>u) or exists(select 1 from public.architect_cycles where user_id<>u) then raise exception 'Other members visible'; end if;
 end loop;
 -- RPC ownership remains enforced even with another member's identifier.
 perform set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
 caught:=false;
 begin perform public.bynv_change_momentum(jsonb_build_object('action','complete-goal','goal_id',g.id,'change_review',review,'expected_updated_at',g.updated_at)); exception when sqlstate '42501' then caught:=true; end;
 if not caught then raise exception 'Cross-member completion accepted'; end if;
 if public.bynv_valid_change_review('{}') or public.bynv_valid_change_review(review||'{"evidence":""}'::jsonb) then raise exception 'Empty evidence accepted'; end if;
end $$;
reset role;
select 'PASS: five personal journeys, persisted recovery, evidence guards, history, stale writes, RLS, and baseline preservation' as result;
rollback;
