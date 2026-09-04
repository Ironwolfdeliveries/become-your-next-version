-- Cover administrative foreign keys identified by the production database advisor.
-- These indexes keep permission checks and audit-history joins responsive as BYNV grows.
create index if not exists account_access_granted_by_idx
  on public.account_access (granted_by);

create index if not exists admin_audit_events_actor_user_idx
  on public.admin_audit_events (actor_user_id);

create index if not exists admin_audit_events_target_user_idx
  on public.admin_audit_events (target_user_id);

create index if not exists kai_operational_settings_updated_by_idx
  on public.kai_operational_settings (updated_by);
