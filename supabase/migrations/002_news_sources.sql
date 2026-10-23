-- =============================================================================
-- 002_news_sources.sql
-- Gestao de fontes RSS para automacao de noticias (Fase 2)
-- =============================================================================

create table if not exists public.news_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rss_url text not null unique,
  is_active boolean not null default true,
  default_category text,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news_sources enable row level security;

drop policy if exists "news_sources_select_admin" on public.news_sources;
create policy "news_sources_select_admin"
  on public.news_sources for select to authenticated
  using (public.is_admin());

drop policy if exists "news_sources_insert_admin" on public.news_sources;
create policy "news_sources_insert_admin"
  on public.news_sources for insert to authenticated
  with check (public.is_admin());

drop policy if exists "news_sources_update_admin" on public.news_sources;
create policy "news_sources_update_admin"
  on public.news_sources for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "news_sources_delete_admin" on public.news_sources;
create policy "news_sources_delete_admin"
  on public.news_sources for delete to authenticated
  using (public.is_admin());

-- Fontes ativas iniciais
insert into public.news_sources (name, rss_url, is_active, default_category)
values
  ('Agência de Notícias MS', 'https://agenciadenoticias.ms.gov.br/?feed=rss2', true, 'ms'),
  ('Agência Brasil / EBC', 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', true, 'brasil')
on conflict (rss_url) do nothing;
