-- Preserve the content-free Kai spend ledger after an account is deleted so
-- prior usage cannot disappear and reopen the controlled monthly budget.

alter table public.kai_usage_events
  drop constraint if exists kai_usage_events_user_id_fkey;

alter table public.kai_usage_events
  alter column user_id drop not null;

alter table public.kai_usage_events
  add constraint kai_usage_events_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

comment on column public.kai_usage_events.user_id is
  'Nullable account reference. The content-free usage record is retained after account deletion for budget integrity.';
