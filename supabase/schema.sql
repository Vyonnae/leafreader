-- LeafReader cloud foundation
-- Run this file in the Supabase SQL Editor with a project-owner account.
-- feeds and articles are shared resources. They must be written by a trusted
-- backend using the service role; never expose the service role to the Vue app.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  font_size text not null default 'medium' check (font_size in ('small', 'medium', 'large')),
  reading_width text not null default 'comfortable' check (reading_width in ('narrow', 'comfortable', 'wide')),
  reading_background text not null default 'fresh' check (reading_background in ('fresh', 'paper')),
  default_focus_mode boolean not null default false,
  default_layout text not null default 'list' check (default_layout in ('list', 'cards')),
  sidebar_collapsed boolean not null default false,
  show_excerpts boolean not null default true,
  motion text not null default 'full' check (motion in ('full', 'reduced')),
  auto_mark_as_read boolean not null default true,
  open_original_in_new_tab boolean not null default true,
  show_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feeds (
  id uuid primary key default gen_random_uuid(),
  feed_url text unique not null,
  site_url text,
  title text not null,
  description text,
  icon_url text,
  status text not null default 'pending' check (status in ('pending', 'active', 'paused', 'error')),
  last_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.feeds(id) on delete cascade,
  guid text not null,
  url text,
  title text not null,
  author text,
  excerpt text,
  content_html text,
  image_url text,
  published_at timestamptz,
  reading_time integer check (reading_time is null or reading_time >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_feed_guid_key unique (feed_id, guid)
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  color text not null default '#dce9df' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_user_name_key unique (user_id, name),
  constraint collections_id_user_key unique (id, user_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feed_id uuid not null references public.feeds(id) on delete cascade,
  custom_title text,
  collection_id uuid,
  is_user_added boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_user_feed_key unique (user_id, feed_id),
  constraint subscriptions_collection_owner_fkey
    foreign key (collection_id, user_id)
    references public.collections(id, user_id)
    on delete set null (collection_id)
);

create table if not exists public.article_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  is_read boolean not null default false,
  is_saved boolean not null default false,
  read_at timestamptz,
  saved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, article_id),
  check (is_read or read_at is null),
  check (is_saved or saved_at is null)
);

create table if not exists public.collection_items (
  collection_id uuid not null,
  article_id uuid not null references public.articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (collection_id, article_id),
  constraint collection_items_collection_owner_fkey
    foreign key (collection_id, user_id)
    references public.collections(id, user_id)
    on delete cascade
);

create unique index if not exists articles_url_unique_idx
  on public.articles (url)
  where url is not null;
create index if not exists articles_feed_published_idx on public.articles (feed_id, published_at desc);
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_feed_id_idx on public.subscriptions (feed_id);
create index if not exists subscriptions_collection_id_idx on public.subscriptions (collection_id) where collection_id is not null;
create index if not exists collections_user_id_idx on public.collections (user_id);
create index if not exists article_states_article_id_idx on public.article_states (article_id);
create index if not exists article_states_saved_idx on public.article_states (user_id, updated_at desc) where is_saved;
create index if not exists collection_items_user_id_idx on public.collection_items (user_id);
create index if not exists collection_items_article_id_idx on public.collection_items (article_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings
for each row execute function public.set_updated_at();

drop trigger if exists feeds_set_updated_at on public.feeds;
create trigger feeds_set_updated_at before update on public.feeds
for each row execute function public.set_updated_at();

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at before update on public.articles
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists article_states_set_updated_at on public.article_states;
create trigger article_states_set_updated_at before update on public.article_states
for each row execute function public.set_updated_at();

drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at before update on public.collections
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), '')
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
exception
  when others then
    -- A profile convenience insert must never prevent account creation.
    raise warning 'LeafReader profile bootstrap failed for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.feeds enable row level security;
alter table public.subscriptions enable row level security;
alter table public.articles enable row level security;
alter table public.article_states enable row level security;
alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
for delete to authenticated using ((select auth.uid()) = id);

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_delete_own" on public.user_settings
for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own" on public.subscriptions
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own" on public.subscriptions
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "subscriptions_delete_own" on public.subscriptions;
create policy "subscriptions_delete_own" on public.subscriptions
for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "article_states_select_own" on public.article_states;
create policy "article_states_select_own" on public.article_states
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "article_states_insert_own" on public.article_states;
create policy "article_states_insert_own" on public.article_states
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "article_states_update_own" on public.article_states;
create policy "article_states_update_own" on public.article_states
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "article_states_delete_own" on public.article_states;
create policy "article_states_delete_own" on public.article_states
for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "collections_select_own" on public.collections;
create policy "collections_select_own" on public.collections
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "collections_insert_own" on public.collections;
create policy "collections_insert_own" on public.collections
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "collections_update_own" on public.collections;
create policy "collections_update_own" on public.collections
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "collections_delete_own" on public.collections;
create policy "collections_delete_own" on public.collections
for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "collection_items_select_own" on public.collection_items;
create policy "collection_items_select_own" on public.collection_items
for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "collection_items_insert_own" on public.collection_items;
create policy "collection_items_insert_own" on public.collection_items
for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "collection_items_update_own" on public.collection_items;
create policy "collection_items_update_own" on public.collection_items
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "collection_items_delete_own" on public.collection_items;
create policy "collection_items_delete_own" on public.collection_items
for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "feeds_read_authenticated" on public.feeds;
create policy "feeds_read_authenticated" on public.feeds
for select to authenticated using (true);

drop policy if exists "articles_read_authenticated" on public.articles;
create policy "articles_read_authenticated" on public.articles
for select to authenticated using (true);

revoke all on public.profiles, public.user_settings, public.feeds,
  public.subscriptions, public.articles, public.article_states,
  public.collections, public.collection_items from anon;

grant select, insert, update, delete on public.profiles, public.user_settings,
  public.subscriptions, public.article_states, public.collections,
  public.collection_items to authenticated;
grant select on public.feeds, public.articles to authenticated;
revoke insert, update, delete on public.feeds, public.articles from authenticated;
