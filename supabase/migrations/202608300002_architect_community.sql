-- BYNV Architect Community foundation. Private member data remains outside this schema.

create table if not exists public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  bio text check (char_length(bio) <= 500),
  visibility text not null default 'members' check (visibility in ('members', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  access_level text not null default 'community' check (access_level in ('community', 'priority', 'mastermind')),
  first_circle boolean not null default false,
  community_role text not null default 'member' check (community_role in ('member', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 80),
  description text not null check (char_length(description) between 1 and 500),
  access_level text not null default 'community' check (access_level in ('community', 'priority', 'mastermind', 'first_circle')),
  pillar_key text,
  challenge_key text,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 140),
  body text not null check (char_length(body) between 1 and 5000),
  status text not null default 'published' check (status in ('published', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.community_comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'published' check (status in ('published', 'hidden', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_post_reactions (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('encourage', 'celebrate', 'support')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction)
);

create table if not exists public.community_comment_reactions (
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('encourage', 'celebrate', 'support')),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id, reaction)
);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'profile')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.community_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_user_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.community_reports(id) on delete set null,
  target_type text not null check (target_type in ('post', 'comment', 'profile', 'member')),
  target_id uuid not null,
  action text not null check (action in ('hide', 'restore', 'warn', 'restrict', 'dismiss')),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists community_posts_room_date_idx on public.community_posts(room_id, created_at desc);
create index if not exists community_comments_post_date_idx on public.community_comments(post_id, created_at);
create index if not exists community_reports_status_idx on public.community_reports(status, created_at);

insert into public.community_rooms (slug, name, description, access_level, pillar_key, challenge_key, sort_order)
values
  ('general', 'General Architect Community', 'Connect around intentional growth, questions, lessons, and the work of becoming.', 'community', null, null, 10),
  ('wins-milestones', 'Wins & Milestones', 'Name meaningful progress and help other Architects recognize theirs.', 'community', null, null, 20),
  ('accountability', 'Accountability', 'Share a commitment, check in honestly, and invite useful encouragement.', 'community', null, null, 30),
  ('challenges', 'Challenges', 'Discuss active BYNV Challenges, record check-ins, and encourage steady participation.', 'community', null, 'all', 40),
  ('clarity-direction', 'Clarity & Direction', 'Explore priorities, decisions, and the direction of your next version.', 'community', 'clarity-direction', null, 50),
  ('energy-wellbeing', 'Energy & Wellbeing', 'Build sustainable energy, wellbeing, and capacity for deliberate change.', 'community', 'energy-wellbeing', null, 60),
  ('action-consistency', 'Action & Consistency', 'Turn intent into repeatable action without empty hustle.', 'community', 'action-consistency', null, 70),
  ('resilience-adaptability', 'Resilience & Adaptability', 'Learn from friction, recover, and adapt with intention.', 'community', 'resilience-adaptability', null, 80),
  ('relationships-support', 'Relationships & Support', 'Strengthen the relationships and support systems around your growth.', 'community', 'relationships-support', null, 90),
  ('environment-systems', 'Environment & Systems', 'Shape the spaces, boundaries, and systems that make progress easier.', 'community', 'environment-systems', null, 100),
  ('reflection-growth', 'Reflection & Growth', 'Reflect on evidence, lessons, identity, and progress over time.', 'community', 'reflection-growth', null, 110),
  ('first-circle', 'The First Circle', 'A dedicated home for founding Architects helping shape BYNV through meaningful participation.', 'first_circle', null, null, 120),
  ('priority-community', 'Priority Community', 'A focused room reserved for future Priority Community access.', 'priority', null, null, 130),
  ('architect-mastermind', 'Architect Mastermind', 'A private foundation for future small-group Architect-level work.', 'mastermind', null, null, 140)
on conflict (slug) do update set name = excluded.name, description = excluded.description, access_level = excluded.access_level,
  pillar_key = excluded.pillar_key, challenge_key = excluded.challenge_key, sort_order = excluded.sort_order;

create or replace function public.community_access_rank(level text)
returns integer language sql immutable as $$
  select case level when 'mastermind' then 3 when 'priority' then 2 else 1 end
$$;

create or replace function public.can_access_community_room(target_room_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.community_rooms room
    left join public.community_entitlements entitlement on entitlement.user_id = (select auth.uid())
    where room.id = target_room_id and room.active
      and (
        room.access_level = 'community'
        or (room.access_level = 'first_circle' and coalesce(entitlement.first_circle, false))
        or (room.access_level in ('priority', 'mastermind') and public.community_access_rank(coalesce(entitlement.access_level, 'community')) >= public.community_access_rank(room.access_level))
      )
  )
$$;

create or replace function public.is_community_moderator()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (select 1 from public.community_entitlements where user_id = (select auth.uid()) and community_role in ('moderator', 'admin'))
$$;

alter table public.community_profiles enable row level security;
alter table public.community_entitlements enable row level security;
alter table public.community_rooms enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_post_reactions enable row level security;
alter table public.community_comment_reactions enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_moderation_actions enable row level security;

drop policy if exists "Members read visible community profiles" on public.community_profiles;
create policy "Members read visible community profiles" on public.community_profiles for select to authenticated
  using (visibility = 'members' or user_id = (select auth.uid()) or public.is_community_moderator());
drop policy if exists "Members create own community profile" on public.community_profiles;
create policy "Members create own community profile" on public.community_profiles for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Members update own community profile" on public.community_profiles;
create policy "Members update own community profile" on public.community_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Members read own entitlement" on public.community_entitlements;
create policy "Members read own entitlement" on public.community_entitlements for select to authenticated using (user_id = (select auth.uid()) or public.is_community_moderator());

drop policy if exists "Members read accessible rooms" on public.community_rooms;
create policy "Members read accessible rooms" on public.community_rooms for select to authenticated using (public.can_access_community_room(id));

drop policy if exists "Members read accessible published posts" on public.community_posts;
create policy "Members read accessible published posts" on public.community_posts for select to authenticated using (public.can_access_community_room(room_id) and (status = 'published' or user_id = (select auth.uid()) or public.is_community_moderator()));
drop policy if exists "Members create posts in accessible rooms" on public.community_posts;
create policy "Members create posts in accessible rooms" on public.community_posts for insert to authenticated with check (user_id = (select auth.uid()) and public.can_access_community_room(room_id));
drop policy if exists "Members update own posts" on public.community_posts;
create policy "Members update own posts" on public.community_posts for update to authenticated using (user_id = (select auth.uid()) or public.is_community_moderator()) with check (user_id = (select auth.uid()) or public.is_community_moderator());
drop policy if exists "Members delete own posts" on public.community_posts;
create policy "Members delete own posts" on public.community_posts for delete to authenticated using (user_id = (select auth.uid()) or public.is_community_moderator());

drop policy if exists "Members read accessible comments" on public.community_comments;
create policy "Members read accessible comments" on public.community_comments for select to authenticated using (exists (select 1 from public.community_posts post where post.id = post_id and public.can_access_community_room(post.room_id)) and (status = 'published' or user_id = (select auth.uid()) or public.is_community_moderator()));
drop policy if exists "Members create comments" on public.community_comments;
create policy "Members create comments" on public.community_comments for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.community_posts post where post.id = post_id and post.status = 'published' and public.can_access_community_room(post.room_id)));
drop policy if exists "Members update own comments" on public.community_comments;
create policy "Members update own comments" on public.community_comments for update to authenticated using (user_id = (select auth.uid()) or public.is_community_moderator()) with check (user_id = (select auth.uid()) or public.is_community_moderator());
drop policy if exists "Members delete own comments" on public.community_comments;
create policy "Members delete own comments" on public.community_comments for delete to authenticated using (user_id = (select auth.uid()) or public.is_community_moderator());

drop policy if exists "Members read post reactions" on public.community_post_reactions;
create policy "Members read post reactions" on public.community_post_reactions for select to authenticated using (exists (select 1 from public.community_posts post where post.id = post_id and public.can_access_community_room(post.room_id)));
drop policy if exists "Members manage own post reactions" on public.community_post_reactions;
create policy "Members manage own post reactions" on public.community_post_reactions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Members read comment reactions" on public.community_comment_reactions;
create policy "Members read comment reactions" on public.community_comment_reactions for select to authenticated using (exists (select 1 from public.community_comments comment join public.community_posts post on post.id = comment.post_id where comment.id = comment_id and public.can_access_community_room(post.room_id)));
drop policy if exists "Members manage own comment reactions" on public.community_comment_reactions;
create policy "Members manage own comment reactions" on public.community_comment_reactions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Members create reports" on public.community_reports;
create policy "Members create reports" on public.community_reports for insert to authenticated with check (reporter_user_id = (select auth.uid()));
drop policy if exists "Members read own reports" on public.community_reports;
create policy "Members read own reports" on public.community_reports for select to authenticated using (reporter_user_id = (select auth.uid()) or public.is_community_moderator());
drop policy if exists "Moderators update reports" on public.community_reports;
create policy "Moderators update reports" on public.community_reports for update to authenticated using (public.is_community_moderator()) with check (public.is_community_moderator());

drop policy if exists "Moderators manage actions" on public.community_moderation_actions;
create policy "Moderators manage actions" on public.community_moderation_actions for all to authenticated using (public.is_community_moderator()) with check (public.is_community_moderator() and moderator_user_id = (select auth.uid()));

grant select, insert, update on public.community_profiles to authenticated;
grant select on public.community_entitlements to authenticated;
grant select on public.community_rooms to authenticated;
grant select, insert, update, delete on public.community_posts to authenticated;
grant select, insert, update, delete on public.community_comments to authenticated;
grant select, insert, delete on public.community_post_reactions to authenticated;
grant select, insert, delete on public.community_comment_reactions to authenticated;
grant select, insert, update on public.community_reports to authenticated;
grant select, insert, update, delete on public.community_moderation_actions to authenticated;

drop trigger if exists set_updated_at on public.community_profiles;
create trigger set_updated_at before update on public.community_profiles for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at on public.community_entitlements;
create trigger set_updated_at before update on public.community_entitlements for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at on public.community_posts;
create trigger set_updated_at before update on public.community_posts for each row execute procedure public.set_updated_at();
drop trigger if exists set_updated_at on public.community_comments;
create trigger set_updated_at before update on public.community_comments for each row execute procedure public.set_updated_at();
