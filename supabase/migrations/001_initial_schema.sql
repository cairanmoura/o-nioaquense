-- =============================================================================
--  O Nioaquense - Etapa 1 | Schema inicial (PostgreSQL / Supabase)
-- -----------------------------------------------------------------------------
--  Arquivo   : supabase/migrations/001_initial_schema.sql
--  Como usar : supabase db push   (ou cole no SQL Editor do painel Supabase)
--
--  Contem:
--    1. Enums de dominio
--    2. Funcoes auxiliares (RBAC + timestamps + integridade editorial)
--    3. Tabelas: profiles, articles, public_utilities, local_ads, reader_submissions
--    4. Row Level Security + policies (RBAC: admin x columnist x publico)
--    5. Triggers (novo usuario, updated_at, guardas de publicacao)
--    6. Indices, RPCs de interacao e grants
--
--  Regra central (AGENTS.md #3):
--    Colunistas sem `can_publish_directly = true` NUNCA podem publicar
--    diretamente. Eles so podem gravar `draft` ou enviar para `pending_review`.
--
--  Este arquivo e' idempotente: pode ser reaplicado sem erro.
-- =============================================================================

-- =============================================================================
--  0) Extensoes
-- =============================================================================
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- =============================================================================
--  1) Enums
-- =============================================================================
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
    'header_billboard',
    'home_middle',
    'article_inline',
    'sidebar',
    'daily_deal'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.submission_status as enum (
    'pending',
    'reviewed',
    'converted_to_article',
    'archived'
  );
exception
  when duplicate_object then null;
end
$$;

-- =============================================================================
--  2) Funcoes auxiliares de RBAC
-- -----------------------------------------------------------------------------
--  `security definer` + `set search_path = ''` => leem `profiles` sem entrar em
--  recursao de RLS e sem risco de hijack de search_path.
-- =============================================================================

-- Papel do usuario logado (admin | columnist | null)
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

-- O usuario logado e' administrador?
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

-- O usuario logado faz parte da equipe editorial (admin ou colunista)?
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

-- Flag pura de `can_publish_directly` (usada para garantir que o usuario nao
-- altere os proprios privilegios no mesmo UPDATE).
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

-- O usuario logado tem permissao para publicar direto?
-- (admin sempre pode; colunista somente com a flag ligada)
create or replace function public.current_user_may_publish()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select (p.role = 'admin') or p.can_publish_directly
      from public.profiles p
      where p.id = auth.uid()
      limit 1
    ),
    false
  );
$$;

-- Slug seguro para perfis
create or replace function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(
    btrim(
      regexp_replace(
        regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g'),
        '^-+|-+$',
        '',
        'g'
      )
    )
  );
$$;

-- =============================================================================
--  3) Tabelas
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 3.1) profiles - redacao e colunistas
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  full_name            text        not null default '',
  slug                 text        not null unique,
  role                 public.user_role not null default 'columnist',
  column_name          text,
  bio                  text,
  avatar_url           text,
  social_links         jsonb       not null default '{}'::jsonb,
  can_publish_directly boolean     not null default false,
  active               boolean     not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint profiles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint profiles_social_links_is_object check (jsonb_typeof(social_links) = 'object')
);

comment on table public.profiles is 'Redacao e colunistas do portal O Nioaquense.';

-- ---------------------------------------------------------------------------
-- 3.2) articles - materias
-- ---------------------------------------------------------------------------
create table if not exists public.articles (
  id                  uuid primary key default gen_random_uuid(),
  title               text        not null,
  subtitle            text,
  slug                text        not null unique,
  summary_bullets     jsonb       not null default '[]'::jsonb,
  content             text        not null default '',
  cover_image_url     text,
  cover_image_caption text,
  scope               public.article_scope not null default 'nioaque',
  category_label      text,
  is_breaking         boolean     not null default false,
  is_featured         boolean     not null default false,
  author_id           uuid references public.profiles (id) on delete set null,
  status              public.article_status not null default 'draft',
  views_count         integer     not null default 0,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint articles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint articles_summary_bullets_is_array check (jsonb_typeof(summary_bullets) = 'array'),
  constraint articles_published_needs_date check (status <> 'published' or published_at is not null)
);

comment on table public.articles is 'Materias do portal (nioaque, ms, brasil, coluna, radar oficial).';

-- Coluna de busca full-text (portugues)
alter table public.articles
  add column if not exists search_document tsvector
  generated always as (
    to_tsvector(
      'portuguese',
      coalesce(title, '') || ' ' || coalesce(subtitle, '') || ' ' || coalesce(content, '')
    )
  ) stored;

-- ---------------------------------------------------------------------------
-- 3.3) public_utilities - servicos uteis (farmacia de plantao, onibus, alertas)
-- ---------------------------------------------------------------------------
create table if not exists public.public_utilities (
  id                uuid primary key default gen_random_uuid(),
  duty_date         date        not null default current_date,
  pharmacy_name     text        not null,
  pharmacy_phone    text,
  pharmacy_address  text,
  alert_active      boolean     not null default false,
  alert_message     text,
  alert_level       public.alert_level not null default 'info',
  bus_schedule_html text,
  updated_at        timestamptz not null default now()
);

comment on table public.public_utilities is 'Bloco de servicos: farmacia de plantao, alertas e horarios de onibus.';

-- ---------------------------------------------------------------------------
-- 3.4) local_ads - publicidade local
-- ---------------------------------------------------------------------------
create table if not exists public.local_ads (
  id              uuid primary key default gen_random_uuid(),
  client_name     text        not null,
  title           text        not null,
  image_url       text,
  target_url      text,
  whatsapp_number text,
  slot_position   public.ad_slot_position not null default 'sidebar',
  active          boolean     not null default true,
  starts_at       timestamptz,
  ends_at         timestamptz,
  clicks_count    integer     not null default 0,
  created_at      timestamptz not null default now(),

  constraint local_ads_clicks_non_negative check (clicks_count >= 0),
  constraint local_ads_window_valid check (
    starts_at is null or ends_at is null or ends_at >= starts_at
  )
);

comment on table public.local_ads is 'Anuncios locais (negocios de Nioaque e regiao).';

-- ---------------------------------------------------------------------------
-- 3.5) reader_submissions - pistas enviadas pelo leitor a redacao
-- ---------------------------------------------------------------------------
create table if not exists public.reader_submissions (
  id              uuid primary key default gen_random_uuid(),
  sender_name     text        not null,
  sender_whatsapp text        not null,
  neighborhood    text,
  message         text        not null,
  media_urls      jsonb       not null default '[]'::jsonb,
  status          public.submission_status not null default 'pending',
  created_at      timestamptz not null default now(),

  constraint reader_submissions_media_is_array check (jsonb_typeof(media_urls) = 'array')
);

comment on table public.reader_submissions is 'Pistas enviadas pelo leitor via formulario/WhatsApp.';

-- =============================================================================
--  4) Row Level Security
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.public_utilities enable row level security;
alter table public.local_ads enable row level security;
alter table public.reader_submissions enable row level security;

-- ---------------------------------------------------------------------------
-- 4.1) profiles
-- ---------------------------------------------------------------------------
-- Leitura: colunistas ativos sao publicos; a propria linha e a linha de admin
-- tambem sao legiveis.
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select
  using (
    active = true
    or auth.uid() = id
    or public.is_admin()
  );

-- Fallback: se o trigger de novo usuario falhar, o proprio usuario cria o perfil
-- com papel minimo (colunista, sem publicacao direta).
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and role = 'columnist'
    and can_publish_directly = false
  );

-- Edicao do proprio perfil, sem alterar role/can_publish_directly.
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = public.current_user_role()
    and can_publish_directly = public.current_user_publish_flag()
  );

-- Gestao total pela redacao.
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4.2) articles
-- ---------------------------------------------------------------------------
-- Leitura: o publico ve apenas materias publicadas; o autor ve as proprias;
-- a redacao ve todas.
drop policy if exists "articles_select_public" on public.articles;
create policy "articles_select_public"
  on public.articles for select
  using (
    (status = 'published' and published_at is not null and published_at <= now())
    or auth.uid() = author_id
    or public.is_admin()
  );

-- Insercao: apenas equipe editorial. Colunista so cria draft/pending_review
-- (a promocao para 'published' e' barrada pelo trigger).
drop policy if exists "articles_insert_staff" on public.articles;
create policy "articles_insert_staff"
  on public.articles for insert
  with check (
    public.is_admin()
    or (
      public.is_staff()
      and author_id = auth.uid()
      and (status <> 'published' or public.current_user_may_publish())
    )
  );

-- Edicao: admin em tudo; colunista apenas nas proprias materias e sem poder
-- trocar o autor. A regra de publicacao fica a cargo do trigger.
drop policy if exists "articles_update_owner" on public.articles;
create policy "articles_update_owner"
  on public.articles for update
  using (public.is_admin() or (author_id = auth.uid() and public.is_staff()))
  with check (
    public.is_admin()
    or (author_id = auth.uid() and public.is_staff())
  );

-- Exclusao: admin, ou o autor ainda no rascunho/revisao.
drop policy if exists "articles_delete_owner" on public.articles;
create policy "articles_delete_owner"
  on public.articles for delete
  using (
    public.is_admin()
    or (author_id = auth.uid() and status in ('draft', 'pending_review'))
  );

-- ---------------------------------------------------------------------------
-- 4.3) public_utilities - informacao publica, gestao restrita a admin
-- ---------------------------------------------------------------------------
drop policy if exists "public_utilities_select_public" on public.public_utilities;
create policy "public_utilities_select_public"
  on public.public_utilities for select
  using (true);

drop policy if exists "public_utilities_admin_all" on public.public_utilities;
create policy "public_utilities_admin_all"
  on public.public_utilities for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4.4) local_ads
-- ---------------------------------------------------------------------------
drop policy if exists "local_ads_select_public" on public.local_ads;
create policy "local_ads_select_public"
  on public.local_ads for select
  using (
    public.is_admin()
    or (
      active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at >= now())
    )
  );

drop policy if exists "local_ads_admin_all" on public.local_ads;
create policy "local_ads_admin_all"
  on public.local_ads for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4.5) reader_submissions
-- ---------------------------------------------------------------------------
-- O leitor anonimo pode enviar uma pista; apenas a redacao le, edita e apaga.
drop policy if exists "reader_submissions_insert_public" on public.reader_submissions;
create policy "reader_submissions_insert_public"
  on public.reader_submissions for insert
  with check (status = 'pending');

drop policy if exists "reader_submissions_select_admin" on public.reader_submissions;
create policy "reader_submissions_select_admin"
  on public.reader_submissions for select
  using (public.is_admin());

drop policy if exists "reader_submissions_update_admin" on public.reader_submissions;
create policy "reader_submissions_update_admin"
  on public.reader_submissions for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "reader_submissions_delete_admin" on public.reader_submissions;
create policy "reader_submissions_delete_admin"
  on public.reader_submissions for delete
  using (public.is_admin());

-- =============================================================================
--  5) Triggers
-- =============================================================================

-- 5.1) updated_at automatico
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

drop trigger if exists "profiles_set_updated_at" on public.profiles;
create trigger "profiles_set_updated_at"
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists "articles_set_updated_at" on public.articles;
create trigger "articles_set_updated_at"
  before update on public.articles
  for each row execute function public.set_updated_at();

drop trigger if exists "public_utilities_set_updated_at" on public.public_utilities;
create trigger "public_utilities_set_updated_at"
  before update on public.public_utilities
  for each row execute function public.set_updated_at();

-- 5.2) Cria perfil automaticamente quando um novo usuario entra no Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base  text;
  v_slug  text;
begin
  v_base := public.slugify(
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1), '')
  );

  if v_base is null or v_base = '' then
    v_base := 'colaborador';
  end if;

  -- Sufixo do id garante unicidade mesmo com nomes repetidos
  v_slug := v_base || '-' || substr(replace(new.id::text, '-', ''), 1, 6);

  insert into public.profiles (id, full_name, slug, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), v_base),
    v_slug,
    'columnist'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists "on_auth_user_created" on auth.users;
create trigger "on_auth_user_created"
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5.3) Guarda editorial: publicacao direta exige permissao explicita
create or replace function public.enforce_article_publish_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Service role / operacoes de backend: a validacao de permissao fica na
  -- aplicacao (AGENTS.md #3), mas a consistencia das datas e' garantida aqui.
  if auth.uid() is null or auth.role() = 'service_role' then
    if tg_op = 'INSERT' then
      if new.status = 'published' and new.published_at is null then
        new.published_at := now();
      elsif new.status in ('draft', 'pending_review') then
        new.published_at := null;
      end if;

      return new;
    end if;

    if new.status = 'published' and new.published_at is null then
      new.published_at := now();
    end if;

    if new.status in ('draft', 'pending_review') and old.status is distinct from new.status then
      new.published_at := null;
    end if;

    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'published' then
      if not public.current_user_may_publish() then
        raise exception
          'Colunista sem can_publish_directly nao pode publicar. Envie para pending_review.'
          using errcode = '42501';
      end if;

      if new.published_at is null then
        new.published_at := now();
      end if;
    else
      new.published_at := null;
    end if;

    return new;
  end if;

  -- UPDATE
  if new.status = 'published' and old.status is distinct from 'published' then
    if not public.current_user_may_publish() then
      raise exception
        'Colunista sem can_publish_directly nao pode publicar. Envie para pending_review.'
        using errcode = '42501';
    end if;

    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;

  -- Ao voltar para rascunho/revisao, limpa a data de publicacao
  if new.status in ('draft', 'pending_review') and old.status is distinct from new.status then
    new.published_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists "articles_enforce_publish_rules" on public.articles;
create trigger "articles_enforce_publish_rules"
  before insert or update on public.articles
  for each row execute function public.enforce_article_publish_rules();

-- 5.4) Guarda de privilegio: ninguem promove a si mesmo (admin apenas)
create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or auth.role() = 'service_role' then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.can_publish_directly is distinct from old.can_publish_directly then
    if not public.is_admin() then
      raise exception 'Somente administradores podem alterar role/can_publish_directly.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists "profiles_guard_privileges" on public.profiles;
create trigger "profiles_guard_privileges"
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- =============================================================================
--  6) Indices
-- =============================================================================
create index if not exists articles_status_published_at_idx
  on public.articles (status, published_at desc);
create index if not exists articles_scope_published_at_idx
  on public.articles (scope, published_at desc);
create index if not exists articles_author_id_idx
  on public.articles (author_id);
create index if not exists articles_featured_idx
  on public.articles (is_featured) where is_featured = true;
create index if not exists articles_breaking_idx
  on public.articles (is_breaking) where is_breaking = true;
create index if not exists articles_search_document_idx
  on public.articles using gin (search_document);
create index if not exists profiles_role_active_idx
  on public.profiles (role, active);
create index if not exists public_utilities_duty_date_idx
  on public.public_utilities (duty_date desc);
create index if not exists local_ads_slot_active_idx
  on public.local_ads (slot_position, active);
create index if not exists reader_submissions_status_created_at_idx
  on public.reader_submissions (status, created_at desc);

-- =============================================================================
--  7) RPCs de interacao
-- =============================================================================

-- 7.1) Contador de visualizacoes (chamado pelo leitor do portal)
create or replace function public.increment_article_views(p_article_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_views integer;
begin
  update public.articles
  set views_count = views_count + 1
  where id = p_article_id and status = 'published'
  returning views_count into v_views;

  return coalesce(v_views, 0);
end;
$$;

-- 7.2) Contador de cliques em anuncio local
create or replace function public.increment_ad_clicks(p_ad_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clicks integer;
begin
  update public.local_ads
  set clicks_count = clicks_count + 1
  where id = p_ad_id
  returning clicks_count into v_clicks;

  return coalesce(v_clicks, 0);
end;
$$;

-- =============================================================================
--  8) Grants
-- =============================================================================
grant usage on schema public to anon, authenticated, service_role;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;
grant select on public.public_utilities to anon, authenticated;
grant insert, update, delete on public.public_utilities to authenticated;
grant select on public.local_ads to anon, authenticated;
grant insert, update, delete on public.local_ads to authenticated;
grant insert on public.reader_submissions to anon, authenticated;
grant select, update, delete on public.reader_submissions to authenticated;

grant all on all tables in schema public to service_role;

grant execute on function public.current_user_role() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_staff() to anon, authenticated, service_role;
grant execute on function public.current_user_publish_flag() to anon, authenticated, service_role;
grant execute on function public.current_user_may_publish() to anon, authenticated, service_role;
grant execute on function public.slugify(text) to anon, authenticated, service_role;
grant execute on function public.increment_article_views(uuid) to anon, authenticated, service_role;
grant execute on function public.increment_ad_clicks(uuid) to anon, authenticated, service_role;

-- =============================================================================
--  9) Views de apoio
-- =============================================================================

-- Feed publico de materias publicadas
create or replace view public.published_articles as
select
  a.id,
  a.title,
  a.subtitle,
  a.slug,
  a.summary_bullets,
  a.cover_image_url,
  a.cover_image_caption,
  a.scope,
  a.category_label,
  a.is_breaking,
  a.is_featured,
  a.views_count,
  a.published_at,
  p.id         as author_id,
  p.full_name  as author_name,
  p.slug       as author_slug,
  p.column_name,
  p.avatar_url
from public.articles a
left join public.profiles p on p.id = a.author_id
where a.status = 'published' and a.published_at <= now();

grant select on public.published_articles to anon, authenticated;
