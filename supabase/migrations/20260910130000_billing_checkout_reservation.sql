-- Only the billing server can reserve a checkout. Serialize by member so two
-- browser tabs (including different tiers) cannot create separate purchases.
create table public.billing_checkout_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  attempt_id uuid not null default gen_random_uuid(),
  tier text not null check (tier in ('foundation', 'builder', 'architect')),
  expires_at bigint not null
);
alter table public.billing_checkout_attempts enable row level security;
revoke all on public.billing_checkout_attempts from public, anon, authenticated;
grant select, insert, update on public.billing_checkout_attempts to service_role;

create function public.reserve_billing_checkout(p_user_id uuid, p_tier text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.memberships%rowtype;
  attempt public.billing_checkout_attempts%rowtype;
  current_epoch bigint := floor(extract(epoch from clock_timestamp()));
begin
  if p_tier not in ('foundation', 'builder', 'architect') then
    raise exception 'Unsupported checkout tier';
  end if;
  select * into member from public.memberships where user_id = p_user_id for update;
  if not found then raise exception 'Membership record missing'; end if;
  if member.stripe_subscription_id is not null and member.status <> 'canceled' then
    return jsonb_build_object('blocked', true);
  end if;
  select * into attempt from public.billing_checkout_attempts where user_id = p_user_id;
  -- Stripe expires the session first. A one-minute margin avoids a new attempt
  -- while the prior session is crossing its expiration boundary.
  if not found or attempt.expires_at + 60 <= current_epoch then
    insert into public.billing_checkout_attempts(user_id, tier, expires_at)
    values (p_user_id, p_tier, current_epoch + 3600)
    on conflict(user_id) do update set
      attempt_id = gen_random_uuid(), tier = excluded.tier, expires_at = excluded.expires_at
    returning * into attempt;
  end if;
  return jsonb_build_object('blocked', false, 'attempt_id', attempt.attempt_id,
    'tier', attempt.tier, 'expires_at', attempt.expires_at);
end;
$$;
revoke all on function public.reserve_billing_checkout(uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_billing_checkout(uuid,text) to service_role;
