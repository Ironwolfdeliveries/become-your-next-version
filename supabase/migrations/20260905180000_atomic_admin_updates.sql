-- Keep privileged admin mutations and their audit records in one transaction.

create or replace function public.admin_update_account_access(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_platform_role text,
  p_entitlement_tier text,
  p_entitlement_status text,
  p_kai_live_beta_enabled boolean,
  p_reason text,
  p_community_access_level text,
  p_community_role text
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_role text;
  target_role text;
  target_kai_live_beta_enabled boolean;
  expected_community_access_level text;
  expected_community_role text;
begin
  -- Lock both existing access rows in a stable order so two owners updating
  -- each other cannot acquire the same pair in opposite order.
  perform access.user_id
    from public.account_access as access
    where access.user_id in (p_actor_user_id, p_target_user_id)
    order by access.user_id
    for update;

  select access.platform_role
    into actor_role
    from public.account_access as access
    where access.user_id = p_actor_user_id;

  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'Owner or admin access required.' using errcode = '42501';
  end if;

  select access.platform_role, access.kai_live_beta_enabled
    into target_role, target_kai_live_beta_enabled
    from public.account_access as access
    where access.user_id = p_target_user_id;

  if p_actor_user_id = p_target_user_id
    and p_platform_role is distinct from actor_role then
    raise exception 'An actor cannot change their own administrative role.'
      using errcode = '42501';
  end if;

  if actor_role <> 'owner' then
    if target_role is distinct from 'member' then
      raise exception 'Only the owner can change an elevated or uninitialized account.'
        using errcode = '42501';
    end if;
    if p_platform_role is distinct from 'member' then
      raise exception 'Only the owner can grant administrative authority.'
        using errcode = '42501';
    end if;
    if p_kai_live_beta_enabled is distinct from target_kai_live_beta_enabled then
      raise exception 'Only the owner can change Live Kai Beta access.'
        using errcode = '42501';
    end if;
  end if;

  expected_community_access_level := case
    when p_entitlement_tier in ('architect', 'architect_coaching') then 'mastermind'
    when p_entitlement_tier = 'builder' then 'priority'
    else 'community'
  end;
  expected_community_role := case
    when p_platform_role in ('owner', 'admin') then 'admin'
    else 'member'
  end;
  if p_community_access_level is distinct from expected_community_access_level
    or p_community_role is distinct from expected_community_role then
    raise exception 'Community access must match account access.'
      using errcode = '22023';
  end if;

  insert into public.account_access (
    user_id,
    platform_role,
    entitlement_tier,
    entitlement_status,
    kai_live_beta_enabled,
    reason,
    granted_by
  ) values (
    p_target_user_id,
    p_platform_role,
    p_entitlement_tier,
    p_entitlement_status,
    p_kai_live_beta_enabled,
    p_reason,
    p_actor_user_id
  )
  on conflict (user_id) do update set
    platform_role = excluded.platform_role,
    entitlement_tier = excluded.entitlement_tier,
    entitlement_status = excluded.entitlement_status,
    kai_live_beta_enabled = excluded.kai_live_beta_enabled,
    reason = excluded.reason,
    granted_by = excluded.granted_by;

  insert into public.community_entitlements (
    user_id,
    access_level,
    community_role
  ) values (
    p_target_user_id,
    p_community_access_level,
    p_community_role
  )
  on conflict (user_id) do update set
    access_level = excluded.access_level,
    community_role = excluded.community_role;

  insert into public.admin_audit_events (
    actor_user_id,
    target_user_id,
    action,
    details
  ) values (
    p_actor_user_id,
    p_target_user_id,
    'account_access_updated',
    jsonb_build_object(
      'platform_role', p_platform_role,
      'entitlement_tier', p_entitlement_tier,
      'entitlement_status', p_entitlement_status,
      'kai_live_beta_enabled', p_kai_live_beta_enabled,
      'reason', p_reason
    )
  );
end;
$$;

revoke all on function public.admin_update_account_access(uuid, uuid, text, text, text, boolean, text, text, text)
  from public, anon, authenticated;
grant execute on function public.admin_update_account_access(uuid, uuid, text, text, text, boolean, text, text, text)
  to service_role;

create or replace function public.admin_update_kai_operational_settings(
  p_actor_user_id uuid,
  p_live_beta_enabled boolean,
  p_emergency_shutoff boolean,
  p_expected_updated_at timestamptz
) returns table (
  live_beta_enabled boolean,
  emergency_shutoff boolean,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform 1
    from public.account_access as access
    where access.user_id = p_actor_user_id
      and access.platform_role = 'owner'
    for update;
  if not found then
    raise exception 'Owner access required.' using errcode = '42501';
  end if;

  return query
  with updated as (
    update public.kai_operational_settings as settings
    set live_beta_enabled = p_live_beta_enabled,
        emergency_shutoff = p_emergency_shutoff,
        updated_by = p_actor_user_id
    where settings.singleton = true
      and settings.updated_at = p_expected_updated_at
    returning settings.live_beta_enabled,
      settings.emergency_shutoff,
      settings.updated_at
  ), audited as (
    insert into public.admin_audit_events (
      actor_user_id,
      action,
      details
    )
    select
      p_actor_user_id,
      'kai_beta_controls_updated',
      jsonb_build_object(
        'live_beta_enabled', updated.live_beta_enabled,
        'emergency_shutoff', updated.emergency_shutoff,
        'expected_updated_at', p_expected_updated_at,
        'updated_at', updated.updated_at
      )
    from updated
    returning true
  )
  select
    updated.live_beta_enabled,
    updated.emergency_shutoff,
    updated.updated_at
  from updated
  cross join audited;
end;
$$;

revoke all on function public.admin_update_kai_operational_settings(uuid, boolean, boolean, timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_update_kai_operational_settings(uuid, boolean, boolean, timestamptz)
  to service_role;

comment on function public.admin_update_account_access(uuid, uuid, text, text, text, boolean, text, text, text) is
  'Atomically updates account access, community entitlement, and its admin audit event.';
comment on function public.admin_update_kai_operational_settings(uuid, boolean, boolean, timestamptz) is
  'Atomically applies an owner Kai control change when the caller has the current updated_at value and records the audit event.';
