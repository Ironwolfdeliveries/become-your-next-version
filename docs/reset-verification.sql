-- Isolated QA only. No production user data is used. Roll back all fixtures.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('c1000000-0000-4000-8000-000000000001','reset-qa-1@example.invalid','{}'),
 ('c1000000-0000-4000-8000-000000000002','reset-qa-2@example.invalid','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
insert into public.journal_entries(id,user_id,title,content) values
 ('c2000000-0000-4000-8000-000000000001',auth.uid(),'Next Version Reset','Synthetic member reflection');
insert into public.goals(id,user_id,title,success_vision) values
 ('c3000000-0000-4000-8000-000000000001',auth.uid(),'My chosen direction','My chosen evidence');
do $$ begin
 if (select count(*) from public.journal_entries) <> 1 then raise exception 'Own Journal save unavailable'; end if;
 if (select count(*) from public.goals) <> 1 then raise exception 'Own goal save unavailable'; end if;
 begin
  insert into public.journal_entries(user_id,content) values ('c1000000-0000-4000-8000-000000000002','Forbidden');
  raise exception 'Cross-account Journal insert was allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.goals(user_id,title) values ('c1000000-0000-4000-8000-000000000002','Forbidden');
  raise exception 'Cross-account goal insert was allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from public.journal_entries where id='c2000000-0000-4000-8000-000000000001') then raise exception 'Other member can read private Reset'; end if;
 if exists(select 1 from public.goals where id='c3000000-0000-4000-8000-000000000001') then raise exception 'Other member can read goal'; end if;
end $$;
select 'PASS: Reset uses existing owned Journal/goal storage; cross-account inserts and reads blocked' as result;
rollback;
