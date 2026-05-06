-- Photographer Platform V1 schema (Supabase Postgres)

create extension if not exists "pgcrypto";

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'profile_role') then
    create type profile_role as enum ('visitor', 'photographer', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'moderation_status') then
    create type moderation_status as enum ('pending', 'approved', 'suspended');
  end if;
  if not exists (select 1 from pg_type where typname = 'photo_visibility') then
    create type photo_visibility as enum ('public', 'private');
  end if;
  if not exists (select 1 from pg_type where typname = 'quote_status') then
    create type quote_status as enum ('new', 'in_progress', 'closed');
  end if;
end $$;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  about text,
  avatar_url text,
  role profile_role not null default 'photographer',
  moderation_status moderation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_role_status_idx on public.profiles (role, moderation_status);

-- Tags
create table if not exists public.tags (
  slug text primary key,
  label text not null,
  created_at timestamptz not null default now()
);

-- Profile tags
create table if not exists public.profile_tags (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tag_slug text not null references public.tags(slug) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, tag_slug)
);
create index if not exists profile_tags_tag_slug_idx on public.profile_tags (tag_slug);

-- Photos
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  description text,
  event_type text,
  image_path text not null,
  visibility photo_visibility not null default 'public',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists photos_profile_created_idx on public.photos (profile_id, created_at desc);
create index if not exists photos_event_idx on public.photos (event_type);
create index if not exists photos_featured_created_idx on public.photos (is_featured desc, created_at desc);

-- Photo tags
create table if not exists public.photo_tags (
  photo_id uuid not null references public.photos(id) on delete cascade,
  tag_slug text not null references public.tags(slug) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, tag_slug)
);
create index if not exists photo_tags_tag_slug_idx on public.photo_tags (tag_slug);

-- Quotes
create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  photographer_profile_id uuid not null references public.profiles(id) on delete cascade,
  client_user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  budget text,
  timeline text,
  details text,
  status quote_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quote_requests_photographer_idx on public.quote_requests (photographer_profile_id, created_at desc);
create index if not exists quote_requests_client_idx on public.quote_requests (client_user_id, created_at desc);
create index if not exists quote_requests_status_idx on public.quote_requests (status, created_at desc);

create table if not exists public.quote_threads (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid unique not null references public.quote_requests(id) on delete cascade,
  photographer_profile_id uuid not null references public.profiles(id) on delete cascade,
  client_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists quote_threads_photographer_idx on public.quote_threads (photographer_profile_id, created_at desc);
create index if not exists quote_threads_client_idx on public.quote_threads (client_user_id, created_at desc);

create table if not exists public.quote_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.quote_threads(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists quote_messages_thread_idx on public.quote_messages (thread_id, created_at asc);

-- Timestamp trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'profiles_set_updated_at') then
    create trigger profiles_set_updated_at before update on public.profiles
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'photos_set_updated_at') then
    create trigger photos_set_updated_at before update on public.photos
    for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'quote_requests_set_updated_at') then
    create trigger quote_requests_set_updated_at before update on public.quote_requests
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- RLS
alter table public.profiles enable row level security;
alter table public.tags enable row level security;
alter table public.profile_tags enable row level security;
alter table public.photos enable row level security;
alter table public.photo_tags enable row level security;
alter table public.quote_requests enable row level security;
alter table public.quote_threads enable row level security;
alter table public.quote_messages enable row level security;

-- Profiles policies
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles
for select
to anon, authenticated
using (role = 'photographer' and moderation_status = 'approved');

drop policy if exists "profiles_owner_read" on public.profiles;
create policy "profiles_owner_read" on public.profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update" on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "profiles_owner_insert" on public.profiles;
create policy "profiles_owner_insert" on public.profiles
for insert
to authenticated
with check (user_id = auth.uid());

-- Tags are public-readable; only admins manage tags (managed server-side with service key in v1)
drop policy if exists "tags_public_read" on public.tags;
create policy "tags_public_read" on public.tags
for select
to anon, authenticated
using (true);

-- Profile tags: owner manage + public read for approved photographers
drop policy if exists "profile_tags_public_read" on public.profile_tags;
create policy "profile_tags_public_read" on public.profile_tags
for select
to anon, authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_tags.profile_id
      and p.role = 'photographer'
      and p.moderation_status = 'approved'
  )
);

drop policy if exists "profile_tags_owner_write" on public.profile_tags;
create policy "profile_tags_owner_write" on public.profile_tags
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_tags.profile_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = profile_tags.profile_id
      and p.user_id = auth.uid()
  )
);

-- Photos: public read only if approved photographer + public visibility
drop policy if exists "photos_public_read" on public.photos;
create policy "photos_public_read" on public.photos
for select
to anon, authenticated
using (
  visibility = 'public'
  and exists (
    select 1 from public.profiles p
    where p.id = photos.profile_id
      and p.role = 'photographer'
      and p.moderation_status = 'approved'
  )
);

-- Photos owner write
drop policy if exists "photos_owner_write" on public.photos;
create policy "photos_owner_write" on public.photos
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = photos.profile_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = photos.profile_id
      and p.user_id = auth.uid()
  )
);

-- Photo tags: public read for public photos + owner write
drop policy if exists "photo_tags_public_read" on public.photo_tags;
create policy "photo_tags_public_read" on public.photo_tags
for select
to anon, authenticated
using (
  exists (
    select 1 from public.photos ph
    join public.profiles p on p.id = ph.profile_id
    where ph.id = photo_tags.photo_id
      and ph.visibility = 'public'
      and p.moderation_status = 'approved'
  )
);

drop policy if exists "photo_tags_owner_write" on public.photo_tags;
create policy "photo_tags_owner_write" on public.photo_tags
for all
to authenticated
using (
  exists (
    select 1 from public.photos ph
    join public.profiles p on p.id = ph.profile_id
    where ph.id = photo_tags.photo_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.photos ph
    join public.profiles p on p.id = ph.profile_id
    where ph.id = photo_tags.photo_id
      and p.user_id = auth.uid()
  )
);

-- Quotes: client + photographer (profile owner) can access
drop policy if exists "quote_requests_member_read" on public.quote_requests;
create policy "quote_requests_member_read" on public.quote_requests
for select
to authenticated
using (
  client_user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = quote_requests.photographer_profile_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "quote_requests_client_insert" on public.quote_requests;
create policy "quote_requests_client_insert" on public.quote_requests
for insert
to authenticated
with check (client_user_id = auth.uid());

drop policy if exists "quote_requests_member_update" on public.quote_requests;
create policy "quote_requests_member_update" on public.quote_requests
for update
to authenticated
using (
  client_user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = quote_requests.photographer_profile_id
      and p.user_id = auth.uid()
  )
)
with check (
  client_user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = quote_requests.photographer_profile_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "quote_threads_member_read" on public.quote_threads;
create policy "quote_threads_member_read" on public.quote_threads
for select
to authenticated
using (
  client_user_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = quote_threads.photographer_profile_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "quote_threads_client_insert" on public.quote_threads;
create policy "quote_threads_client_insert" on public.quote_threads
for insert
to authenticated
with check (client_user_id = auth.uid());

drop policy if exists "quote_messages_member_read" on public.quote_messages;
create policy "quote_messages_member_read" on public.quote_messages
for select
to authenticated
using (
  exists (
    select 1 from public.quote_threads t
    where t.id = quote_messages.thread_id
      and (
        t.client_user_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = t.photographer_profile_id
            and p.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "quote_messages_member_insert" on public.quote_messages;
create policy "quote_messages_member_insert" on public.quote_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and exists (
    select 1 from public.quote_threads t
    where t.id = quote_messages.thread_id
      and (
        t.client_user_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.id = t.photographer_profile_id
            and p.user_id = auth.uid()
        )
      )
  )
);

