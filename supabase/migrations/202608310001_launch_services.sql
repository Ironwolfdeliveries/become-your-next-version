-- Launch services: membership billing, private Kai conversations, moderation controls, and outbound-email audit.

create table if not exists public.memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'foundation' check (tier in ('foundation', 'builder', 'architect')),
  status text not null default 'free' check (status in ('free', 'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'paused')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  last_payment_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.architect_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 5 and 320),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create table if not exists public.kai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.kai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 12000),
  route text not null check (char_length(route) between 1 and 300),
  created_at timestamptz not null default now()
);

create table if not exists public.kai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('welcome', 'account', 'billing', 'security')),
  source_event_id text unique,
  provider_id text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'delivered', 'bounced', 'complained', 'suppressed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_member_restrictions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  restricted_until timestamptz,
  reason text check (char_length(reason) <= 1000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kai_conversations_user_date_idx on public.kai_conversations(user_id, updated_at desc);
create index if not exists kai_messages_conversation_date_idx on public.kai_messages(conversation_id, created_at);
create index if not exists kai_usage_events_user_date_idx on public.kai_usage_events(user_id, created_at desc);
create index if not exists architect_invitations_email_idx on public.architect_invitations(lower(email), status);

create or replace function public.is_community_admin()
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.community_entitlements where user_id = (select auth.uid()) and community_role = 'admin')
$$;

create or replace function public.is_community_restricted(target_user_id uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (select 1 from public.community_member_restrictions where user_id = target_user_id and (restricted_until is null or restricted_until > now()))
$$;

alter table public.memberships enable row level security;
alter table public.architect_invitations enable row level security;
alter table public.kai_conversations enable row level security;
alter table public.kai_messages enable row level security;
alter table public.kai_usage_events enable row level security;
alter table public.email_events enable row level security;
alter table public.community_member_restrictions enable row level security;

create policy "Members read own membership" on public.memberships for select to authenticated using (user_id = (select auth.uid()) or public.is_community_admin());
create policy "Admins manage invitations" on public.architect_invitations for all to authenticated using (public.is_community_admin()) with check (public.is_community_admin());
create policy "Members manage own Kai conversations" on public.kai_conversations for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members manage own Kai messages" on public.kai_messages for all to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.kai_conversations conversation where conversation.id = conversation_id and conversation.user_id = (select auth.uid()))) with check (user_id = (select auth.uid()) and exists (select 1 from public.kai_conversations conversation where conversation.id = conversation_id and conversation.user_id = (select auth.uid())));
create policy "Members read own Kai usage" on public.kai_usage_events for select to authenticated using (user_id = (select auth.uid()));
create policy "Members create own Kai usage" on public.kai_usage_events for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Members read own email events" on public.email_events for select to authenticated using (user_id = (select auth.uid()));
create policy "Moderators read restrictions" on public.community_member_restrictions for select to authenticated using (public.is_community_moderator());
create policy "Admins manage restrictions" on public.community_member_restrictions for all to authenticated using (public.is_community_admin()) with check (public.is_community_admin() and created_by = (select auth.uid()));

drop policy if exists "Members create posts in accessible rooms" on public.community_posts;
create policy "Members create posts in accessible rooms" on public.community_posts for insert to authenticated with check (user_id = (select auth.uid()) and public.can_access_community_room(room_id) and not public.is_community_restricted((select auth.uid())));
drop policy if exists "Members create comments" on public.community_comments;
create policy "Members create comments" on public.community_comments for insert to authenticated with check (user_id = (select auth.uid()) and not public.is_community_restricted((select auth.uid())) and exists (select 1 from public.community_posts post where post.id = post_id and post.status = 'published' and public.can_access_community_room(post.room_id)));

drop policy if exists "Admins manage entitlements" on public.community_entitlements;
create policy "Admins manage entitlements" on public.community_entitlements for all to authenticated using (public.is_community_admin()) with check (public.is_community_admin());

grant select on public.memberships, public.email_events to authenticated;
grant select, insert, update, delete on public.kai_conversations, public.kai_messages to authenticated;
grant select, insert on public.kai_usage_events to authenticated;
grant select, insert, update, delete on public.architect_invitations to authenticated;
grant select, insert, update, delete on public.community_member_restrictions to authenticated;
grant insert, update, delete on public.community_entitlements to authenticated;

drop trigger if exists set_updated_at on public.memberships;
create trigger set_updated_at before update on public.memberships for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at on public.kai_conversations;
create trigger set_updated_at before update on public.kai_conversations for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at on public.email_events;
create trigger set_updated_at before update on public.email_events for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at on public.community_member_restrictions;
create trigger set_updated_at before update on public.community_member_restrictions for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name) values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')) on conflict (id) do nothing;
  insert into public.memberships (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.community_entitlements (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

insert into public.memberships (user_id)
select id from auth.users on conflict (user_id) do nothing;

insert into public.community_entitlements (user_id)
select id from auth.users on conflict (user_id) do nothing;
