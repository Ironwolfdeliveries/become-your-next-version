-- Corrected BYNV launch tiers and future lifecycle/referral foundations.
-- This migration does not activate billing or initiate a charge.

alter table public.memberships drop constraint if exists memberships_tier_check;
alter table public.memberships add constraint memberships_tier_check
  check (tier in ('foundation', 'builder', 'architect', 'architect_coaching', 'graduate'));

alter table public.memberships
  add column if not exists launch_access_started_at timestamptz,
  add column if not exists launch_free_ends_at timestamptz,
  add column if not exists launch_discount_ends_at timestamptz,
  add column if not exists graduate_eligible_at timestamptz,
  add column if not exists referral_credit_cents integer not null default 0,
  add column if not exists graduate_fee_waived boolean not null default false;

alter table public.memberships drop constraint if exists memberships_referral_credit_cents_check;
alter table public.memberships add constraint memberships_referral_credit_cents_check
  check (referral_credit_cents >= 0);

comment on column public.memberships.launch_access_started_at is 'Set only when the member deliberately begins the future Stripe-backed launch sequence.';
comment on column public.memberships.launch_free_ends_at is 'End of the first 30-day launch-access period once billing is activated.';
comment on column public.memberships.launch_discount_ends_at is 'End of the following 60-day introductory-price period once billing is activated.';
comment on column public.memberships.referral_credit_cents is 'Future non-cash credit ledger balance; no referral program is active yet.';
comment on column public.memberships.graduate_fee_waived is 'Server/admin-controlled future Graduate fee waiver; members cannot update memberships through RLS.';

revoke insert, update, delete on public.memberships from anon, authenticated;
grant select on public.memberships to authenticated;
