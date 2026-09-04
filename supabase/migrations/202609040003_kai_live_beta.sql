-- Controlled Live Kai Beta: owner-managed access, immediate kill switch,
-- atomic budget reservations, and content-free operational usage logging.

alter table public.account_access
  add column if not exists kai_live_beta_enabled boolean not null default false;

create table if not exists public.kai_operational_settings (
  singleton boolean primary key default true check (singleton),
  live_beta_enabled boolean not null default false,
  emergency_shutoff boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.kai_operational_settings (singleton, live_beta_enabled, emergency_shutoff)
values (true, false, true)
on conflict (singleton) do nothing;

alter table public.kai_usage_events drop constraint if exists kai_usage_events_mode_check;
alter table public.kai_usage_events
  alter column mode set default 'guided',
  add column if not exists model text check (model is null or char_length(model) between 1 and 120),
  add column if not exists request_status text not null default 'completed' check (request_status in ('reserved', 'completed', 'failed', 'blocked')),
  add column if not exists fallback_reason text check (fallback_reason is null or char_length(fallback_reason) <= 120),
  add column if not exists total_tokens integer generated always as (input_tokens + output_tokens) stored;
update public.kai_usage_events set mode = 'live_beta' where mode = 'live';
alter table public.kai_usage_events
  add constraint kai_usage_events_mode_check check (mode in ('guided', 'live_beta'));

create index if not exists kai_beta_usage_user_window_idx on public.kai_usage_events(user_id, mode, created_at desc);
create index if not exists kai_beta_usage_budget_idx on public.kai_usage_events(mode, request_status, created_at desc);

alter table public.kai_operational_settings enable row level security;
revoke all on public.kai_operational_settings from public, anon, authenticated;
grant select, insert, update, delete on public.kai_operational_settings to service_role;

drop policy if exists "Members create own Kai usage" on public.kai_usage_events;
revoke insert on public.kai_usage_events from authenticated;

create or replace function public.reserve_kai_live_beta(
  p_user_id uuid,
  p_model text,
  p_per_minute_allowance integer,
  p_daily_allowance integer,
  p_monthly_allowance integer,
  p_monthly_budget_micro_usd bigint,
  p_request_reserve_micro_usd bigint
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  reservation_id uuid := gen_random_uuid();
  beta_allowed boolean := false;
  live_enabled boolean := false;
  shutoff boolean := true;
  minute_count integer := 0;
  daily_count integer := 0;
  monthly_count integer := 0;
  monthly_reserved bigint := 0;
begin
  perform pg_advisory_xact_lock(hashtext('bynv_kai_live_beta_budget'));

  select entitlement_status = 'active' and (platform_role = 'owner' or kai_live_beta_enabled)
    into beta_allowed
    from public.account_access
    where user_id = p_user_id;

  select live_beta_enabled, emergency_shutoff
    into live_enabled, shutoff
    from public.kai_operational_settings
    where singleton = true;

  if not coalesce(beta_allowed, false) or not coalesce(live_enabled, false) or coalesce(shutoff, true) then
    return null;
  end if;

  select count(*) filter (where created_at >= date_trunc('minute', now())),
         count(*) filter (where created_at >= date_trunc('day', now())),
         count(*)
    into minute_count, daily_count, monthly_count
    from public.kai_usage_events
    where user_id = p_user_id
      and mode = 'live_beta'
      and created_at >= date_trunc('month', now());

  select coalesce(sum(estimated_cost_micro_usd), 0)
    into monthly_reserved
    from public.kai_usage_events
    where mode = 'live_beta'
      and created_at >= date_trunc('month', now());

  if minute_count >= p_per_minute_allowance
    or daily_count >= p_daily_allowance
    or monthly_count >= p_monthly_allowance
    or monthly_reserved + p_request_reserve_micro_usd > p_monthly_budget_micro_usd then
    return null;
  end if;

  insert into public.kai_usage_events (id, user_id, mode, model, request_status, estimated_cost_micro_usd)
  values (reservation_id, p_user_id, 'live_beta', p_model, 'reserved', p_request_reserve_micro_usd);
  return reservation_id;
end;
$$;

revoke all on function public.reserve_kai_live_beta(uuid, text, integer, integer, integer, bigint, bigint) from public, anon, authenticated;
grant execute on function public.reserve_kai_live_beta(uuid, text, integer, integer, integer, bigint, bigint) to service_role;

drop trigger if exists set_updated_at on public.kai_operational_settings;
create trigger set_updated_at before update on public.kai_operational_settings for each row execute procedure public.set_updated_at();

comment on table public.kai_operational_settings is 'Singleton owner-controlled Live Kai Beta switch and emergency shutoff.';
comment on table public.kai_usage_events is 'Content-free Kai operational ledger for Guided usage and controlled Live Beta tokens, status, and estimated cost.';
