-- Additive: no updates to existing member rows and no replacement of assessment logic.
alter table public.goals add column if not exists motivation text;
alter table public.goals add column if not exists personal_reward text;
alter table public.goals add column if not exists custom_rule text;
alter table public.goals add column if not exists change_review jsonb;
alter table public.architect_cycles add column if not exists personal_reward text;
alter table public.architect_cycles add column if not exists custom_rule text;
alter table public.architect_cycles add column if not exists change_review jsonb;
alter table public.goals add column if not exists review_history jsonb;
alter table public.architect_cycles add column if not exists review_history jsonb;

create or replace function public.bynv_valid_change_review(v jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare k text;
begin
  if v is null or jsonb_typeof(v)<>'object' then return false; end if;
  foreach k in array array['changed','evidence','helped','remaining','carry'] loop
    if jsonb_typeof(v->k) is distinct from 'string' or char_length(v->>k)>600 then return false; end if;
  end loop;
  return char_length(btrim(v->>'changed'))>0 and char_length(btrim(v->>'evidence'))>0;
end $$;

create or replace function public.bynv_safe_personal_choice(v text) returns boolean
language sql immutable set search_path='' as $$
 select v is null or (char_length(v)<=240 and v !~* 'punish|humiliat|starv|self.harm|hurt myself|cut myself|skip.{0,12}(meal|food|sleep)|no.{0,8}(food|sleep)|withhold.{0,12}(food|sleep)|excessive exercise|exercise.{0,12}(pain|collapse)|financial penalt|pay.{0,12}(fine|penalt)|depriv')
$$;

create or replace function public.bynv_guard_momentum() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  -- Review history is written by this trigger, never replaced by a client payload.
  if tg_op='UPDATE' then new.review_history:=old.review_history; else new.review_history:=null; end if;
  if not public.bynv_safe_personal_choice(new.custom_rule) or not public.bynv_safe_personal_choice(new.personal_reward) then
    raise exception using errcode='22023', message='Choose a constructive response or reward without harm, deprivation, humiliation or penalties.';
  end if;
  if tg_table_name='goals' then
    if char_length(new.motivation)>600 then raise exception using errcode='22023', message='Keep why this matters to a short sentence.'; end if;
  end if;
  if new.change_review is not null and not public.bynv_valid_change_review(new.change_review) then
    raise exception using errcode='22023', message='Briefly describe what changed and what you can point to. No clear change yet is a valid answer.';
  end if;
  if new.status='completed' and (tg_op='INSERT' or old.status is distinct from 'completed') and not public.bynv_valid_change_review(new.change_review) then
    raise exception using errcode='22023', message='Show what changed before completing this plan. Open the short review in BYNV.';
  end if;
  if new.status='completed' and (tg_op='INSERT' or old.status is distinct from 'completed') then
    new.review_history:=coalesce(new.review_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('review',new.change_review,'recorded_at',clock_timestamp()));
  end if;
  -- Keep earlier evidence in history; ask for a fresh review after reopening.
  if tg_op='UPDATE' and old.status='completed' and new.status='active' then new.change_review := null; end if;
  return new;
end $$;
create trigger bynv_momentum_goal before insert or update on public.goals for each row execute function public.bynv_guard_momentum();
create trigger bynv_momentum_cycle before insert or update on public.architect_cycles for each row execute function public.bynv_guard_momentum();

create or replace function public.bynv_change_momentum(p_payload jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 u uuid:=auth.uid(); a text:=p_payload->>'action'; v_id uuid; v_expected timestamptz;
 v_cycle public.architect_cycles%rowtype; v_goal public.goals%rowtype;
 v_review jsonb; v_result jsonb; v_reason text; v_summary text;
begin
 if u is null then raise exception using errcode='42501',message='Sign in to continue.'; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>24000 then raise exception using errcode='22023',message='Keep this check-in short.'; end if;
 perform 1 from public.profiles where id=u for update;
 if not found then raise exception using errcode='42501',message='Your profile is not available.'; end if;
 if a in ('review-cycle','complete-goal') then
   v_review:=p_payload->'change_review';
   if not public.bynv_valid_change_review(v_review) then raise exception using errcode='22023',message='Describe the change and the evidence before completing. No clear change yet is a valid answer.'; end if;
   if jsonb_typeof(p_payload->'expected_updated_at') is distinct from 'string' then raise exception using errcode='22023',message='Reload before completing this plan.'; end if;
   v_expected:=(p_payload->>'expected_updated_at')::timestamptz;
   if a='review-cycle' then
     v_id:=(p_payload->>'cycle_id')::uuid;
     select * into v_cycle from public.architect_cycles where id=v_id and user_id=u for update;
     if not found then raise exception using errcode='42501',message='That Cycle is not available.'; end if;
     if v_cycle.status<>'active' or v_cycle.updated_at is distinct from v_expected then raise exception using errcode='40001',message='This Cycle changed. Reload before saving.'; end if;
     v_summary:=concat('Change: ',v_review->>'changed', E'\nEvidence: ',v_review->>'evidence');
     update public.architect_cycles set change_review=v_review,outcome=v_summary,status='completed',completed_at=current_timestamp where id=v_id and user_id=u;
     update public.goals set advanced_at=current_timestamp where id=v_cycle.goal_id and user_id=u and status='active';
   else
     v_id:=(p_payload->>'goal_id')::uuid;
     select * into v_goal from public.goals where id=v_id and user_id=u for update;
     if not found then raise exception using errcode='42501',message='That goal is not available.'; end if;
     if v_goal.status<>'active' or v_goal.updated_at is distinct from v_expected then raise exception using errcode='40001',message='This goal changed. Reload before saving.'; end if;
     update public.goals set change_review=v_review,status='completed',advanced_at=current_timestamp where id=v_id and user_id=u;
   end if;
   return jsonb_build_object('ok',true);
 end if;
 if a='recover' then
   v_reason:=p_payload->>'reason';
   if v_reason is null or v_reason not in ('Too much to do','Forgot','Low energy','Avoided it','Something changed','Other') then raise exception using errcode='22023',message='Choose what got in the way.'; end if;
   v_result:=public.bynv_change_experience(p_payload);
   update public.daily_focus_entries set recovery=recovery || jsonb_build_object('reason',v_reason) where id=(p_payload->>'entry_id')::uuid and user_id=u;
   return v_result;
 end if;
 if a='start-cycle' then
   if (p_payload ? 'personal_reward' and jsonb_typeof(p_payload->'personal_reward') not in ('string','null')) or (p_payload ? 'custom_rule' and jsonb_typeof(p_payload->'custom_rule') not in ('string','null')) then raise exception using errcode='22023',message='Check your response and reward.'; end if;
   if not public.bynv_safe_personal_choice(p_payload->>'personal_reward') or not public.bynv_safe_personal_choice(p_payload->>'custom_rule') then raise exception using errcode='22023',message='Choose a constructive response and reward.'; end if;
   v_result:=public.bynv_change_experience(p_payload);
   update public.architect_cycles set personal_reward=nullif(btrim(p_payload->>'personal_reward'),''),custom_rule=nullif(btrim(p_payload->>'custom_rule'),'') where user_id=u and status='active';
   return v_result;
 end if;
 return public.bynv_change_experience(p_payload);
end $$;
revoke all on function public.bynv_change_momentum(jsonb),public.bynv_guard_momentum(),public.bynv_valid_change_review(jsonb),public.bynv_safe_personal_choice(text) from public,anon;
grant execute on function public.bynv_change_momentum(jsonb),public.bynv_guard_momentum(),public.bynv_valid_change_review(jsonb),public.bynv_safe_personal_choice(text) to authenticated;
