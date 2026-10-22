-- =============================================================================
--  O Nioaquense - Migration 001 (schema completo e idempotente)
-- -----------------------------------------------------------------------------
--  Ordem corrigida: enums -> tabelas -> funcoes -> triggers -> RLS -> policies.
--  Pode ser executada mais de uma vez sem erro.
--  Os dados ficam em supabase/seed.sql (ou seed_complete.sql para 1 passo).
-- =============================================================================

-- =============================================================================
--  O Nioaquense - Supabase Schema + Seed (Unico arquivo)
--  Cole tudo no SQL Editor e execute de uma vez
-- =============================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Enums
do $$
begin
  create type public.user_role as enum ('admin', 'columnist');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.article_status as enum ('draft', 'pending_review', 'published');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.article_scope as enum ('nioaque', 'ms', 'brasil', 'coluna', 'radar_oficial');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.alert_level as enum ('info', 'warning', 'urgent');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.ad_slot_position as enum (
    'header_billboard', 'home_middle', 'article_inline', 'sidebar', 'daily_deal'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.submission_status as enum (
    'pending', 'reviewed', 'converted_to_article', 'archived'
  );
exception
  when duplicate_object then null;
end
$$;

-- Tabelas
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  slug text unique not null,
  role public.user_role default 'columnist',
  column_name text,
  bio text,
  avatar_url text,
  social_links jsonb default '{}'::jsonb,
  can_publish_directly boolean default false,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  slug text unique not null,
  summary_bullets text[] default '{}',
  content text default '',
  cover_image_url text,
  cover_image_caption text,
  scope public.article_scope default 'nioaque',
  category_label text,
  is_breaking boolean default false,
  is_featured boolean default false,
  author_id uuid references public.profiles(id),
  status public.article_status default 'draft',
  views_count integer default 0,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.public_utilities (
  id uuid primary key default gen_random_uuid(),
  duty_date date unique not null,
  pharmacy_name text not null,
  pharmacy_phone text,
  pharmacy_address text,
  alert_active boolean default false,
  alert_message text,
  alert_level public.alert_level,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.local_ads (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  title text not null,
  image_url text,
  target_url text,
  whatsapp_number text,
  slot_position public.ad_slot_position default 'sidebar',
  offer_type text default 'banner',
  price_label text,
  notes text,
  starts_at date,
  ends_at date,
  active boolean default true,
  clicks_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.reader_submissions (
  id uuid primary key default gen_random_uuid(),
  sender_name text,
  sender_whatsapp text not null,
  neighborhood text,
  message text not null,
  media_urls text[] default '{}',
  status public.submission_status default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.market_quotes (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  label text not null,
  value numeric not null,
  change_percent numeric default 0,
  unit text,
  updated_at timestamptz default now()
);

create table if not exists public.lottery_results (
  id uuid primary key default gen_random_uuid(),
  game text not null,
  draw_date date not null,
  numbers text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists public.bus_schedules (
  id uuid primary key default gen_random_uuid(),
  route_name text not null,
  destination text not null,
  departure_times text[] default '{}',
  frequency text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Funcoes auxiliares
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.role = 'admin'
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    false
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.role in ('admin', 'columnist')
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    false
  );
$$;

create or replace function public.current_user_publish_flag()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.can_publish_directly
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    false
  );
$$;

create or replace function public.current_user_may_publish()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.can_publish_directly or p.role = 'admin'
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    false
  );
$$;

create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(value, '[^a-z0-9]+', '-', 'g'))
$$;

-- Triggers de updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists handle_updated_at_profiles on public.profiles;
create trigger handle_updated_at_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists handle_updated_at_articles on public.articles;
create trigger handle_updated_at_articles
  before update on public.articles
  for each row execute function public.set_updated_at();

drop trigger if exists handle_updated_at_public_utilities on public.public_utilities;
create trigger handle_updated_at_public_utilities
  before update on public.public_utilities
  for each row execute function public.set_updated_at();

drop trigger if exists handle_updated_at_local_ads on public.local_ads;
create trigger handle_updated_at_local_ads
  before update on public.local_ads
  for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.public_utilities enable row level security;
alter table public.local_ads enable row level security;
alter table public.reader_submissions enable row level security;

-- Policies de profiles (usar DO para nao falhar se ja existir)
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_select_authenticated') then
    create policy "profiles_select_authenticated" on public.profiles for select to authenticated using (true);
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_insert_authenticated') then
    create policy "profiles_insert_authenticated" on public.profiles for insert to authenticated with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_update_own') then
    create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_select_public') then
    create policy "profiles_select_public" on public.profiles for select to anon, authenticated using (active = true);
  end if;
end
$$;

-- Policies de articles
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'articles' and policyname = 'articles_select_published') then
    create policy "articles_select_published" on public.articles for select using (status = 'published');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'articles' and policyname = 'articles_select_authenticated') then
    create policy "articles_select_authenticated" on public.articles for select to authenticated using (true);
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'articles' and policyname = 'articles_insert_authenticated') then
    create policy "articles_insert_authenticated" on public.articles for insert to authenticated with check (auth.uid() = author_id);
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'articles' and policyname = 'articles_update_own') then
    create policy "articles_update_own" on public.articles for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
  end if;
end
$$;

-- Policies de public_utilities
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'public_utilities' and policyname = 'public_utilities_select_all') then
    create policy "public_utilities_select_all" on public.public_utilities for select using (true);
  end if;
end
$$;

-- Policies de local_ads
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'local_ads' and policyname = 'local_ads_select_all') then
    create policy "local_ads_select_all" on public.local_ads for select using (active = true);
  end if;
end
$$;

-- Policies de reader_submissions
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'reader_submissions' and policyname = 'reader_submissions_insert_public') then
    create policy "reader_submissions_insert_public" on public.reader_submissions for insert to public with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'reader_submissions' and policyname = 'reader_submissions_select_authenticated') then
    create policy "reader_submissions_select_authenticated" on public.reader_submissions for select to authenticated using (true);
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'reader_submissions' and policyname = 'reader_submissions_update_admin') then
    create policy "reader_submissions_update_admin" on public.reader_submissions for update to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end
$$;

-- Policies de administracao (RBAC) - usam as funcoes security definer
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'profiles_admin_all') then
    create policy "profiles_admin_all" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'articles' and policyname = 'articles_admin_select') then
    create policy "articles_admin_select" on public.articles for select to authenticated using (public.is_staff());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'articles' and policyname = 'articles_update_admin') then
    create policy "articles_update_admin" on public.articles for update to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'articles' and policyname = 'articles_delete_admin') then
    create policy "articles_delete_admin" on public.articles for delete to authenticated using (public.is_admin());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'local_ads' and policyname = 'local_ads_admin_all') then
    create policy "local_ads_admin_all" on public.local_ads for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'public_utilities' and policyname = 'public_utilities_admin_all') then
    create policy "public_utilities_admin_all" on public.public_utilities for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;
end
$$;

-- RPCs
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, slug, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Usuario'),
    lower(regexp_replace(coalesce(new.raw_user_meta_data->>'full_name', 'usuario'), '[^a-zA-Z0-9]+', '-', 'g'))
      || '-' || substr(new.id::text, 1, 8),
    'columnist',
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception
  when insufficient_privilege then
    raise notice 'Sem permissao para criar trigger em auth.users. Crie o perfil manualmente apos criar o usuario no painel.';
  when undefined_table then
    raise notice 'Tabela auth.users indisponivel. Crie o perfil manualmente apos criar o usuario no painel.';
end
$$;

create or replace function public.enforce_article_publish_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() nulo = execucao administrativa (SQL Editor, service_role, migrations).
  -- Nesse caso a regra de RBAC nao se aplica.
  if new.status = 'published' and auth.uid() is not null then
    if not public.current_user_may_publish() then
      new.status := 'pending_review';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin' and new.role <> 'admin' and not public.is_admin() then
    raise exception 'Somente o Editor-Chefe pode alterar colunistas.';
  end if;
  return new;
end;
$$;

create or replace function public.increment_article_views(p_article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.articles set views_count = views_count + 1 where id = p_article_id;
end;
$$;

create or replace function public.increment_ad_clicks(p_ad_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.local_ads set clicks_count = clicks_count + 1 where id = p_ad_id;
end;
$$;

-- Triggers de artigos
drop trigger if exists enforce_article_publish_rules_trigger on public.articles;
create trigger enforce_article_publish_rules_trigger
  before insert or update on public.articles
  for each row
  execute function public.enforce_article_publish_rules();

drop trigger if exists guard_profile_privileges_trigger on public.profiles;
create trigger guard_profile_privileges_trigger
  before update on public.profiles
  for each row
  execute function public.guard_profile_privileges();

-- Indices
create index if not exists idx_articles_slug on public.articles(slug);
create index if not exists idx_articles_scope on public.articles(scope);
create index if not exists idx_articles_status on public.articles(status);
create index if not exists idx_articles_author on public.articles(author_id);
create index if not exists idx_profiles_slug on public.profiles(slug);
create index if not exists idx_profiles_role on public.profiles(role);

-- ===========================================================================
