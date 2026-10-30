-- =============================================================================
-- 008_source_type_scraper.sql
-- Suporte a web scraping (raspagem de HTML) para portais sem RSS funcional
-- =============================================================================

-- Nova coluna que define o metodo de extracao da fonte
alter table public.news_sources
  add column if not exists source_type text not null default 'rss';

-- Colunas de rastreio da fonte no artigo (usadas pelo extrator para dedupe
-- em lote e exibicao de creditos) — pode nao existir em bancos antigos
alter table public.articles
  add column if not exists source_name text;

alter table public.articles
  add column if not exists source_url text;

-- Constraint dos valores permitidos (idempotente)
alter table public.news_sources
  drop constraint if exists news_sources_source_type_check;
alter table public.news_sources
  add constraint news_sources_source_type_check
  check (source_type in ('rss', 'html_scraper'));

comment on column public.news_sources.source_type is
  'rss = feed XML; html_scraper = raspa a pagina inicial do portal (para portais sem RSS).';

-- Desativa feeds RSS antigos que morreram (G1, Midiamax, Campo Grande News)
update public.news_sources
   set is_active = false, updated_at = now()
 where rss_url in (
   'https://g1.globo.com/rss/g1/mato-grosso-do-sul/',
   'https://www.campograndenews.com.br/rss',
   'https://midiamax.uol.com.br/feed/'
 );

-- Fontes migradas para scraper HTML (auto-publicacao com filtro regional)
insert into public.news_sources (
  name, rss_url, source_type, is_active, auto_publish, ai_rewrite, use_original_image,
  keywords_filter, default_category
) values
  (
    'G1 Mato Grosso do Sul',
    'https://g1.globo.com/ms/mato-grosso-do-sul/',
    'html_scraper',
    true, true, true, true,
    'Nioaque, Jardim, Bonito, Anastácio, Aquidauana, Maracaju, BR-060, BR-419',
    'ms'
  ),
  (
    'Campo Grande News',
    'https://www.campograndenews.com.br/',
    'html_scraper',
    true, true, true, true,
    'Nioaque, Jardim, Bonito, Anastácio, Aquidauana, Maracaju, BR-060, BR-419',
    'ms'
  ),
  -- NOTA: Midiamax removido do seed. O antigo dominio midiamax.uol.com.br
  -- nao existe mais e midiams.com.br NAO e o Midiamax (e' outro grupo).
  -- Reavaliar o dominio atual do Midiamax antes de reativar a fonte.
  (
    'TopMidiaNews',
    'https://www.topmidianews.com.br/',
    'html_scraper',
    true, true, true, true,
    'Nioaque, Jardim, Bonito, Anastácio, Aquidauana, Maracaju, BR-060, BR-419',
    'ms'
  ),
  (
    'Primeira Pagina MS',
    'https://primeirapagina.com.br/ms/',
    'html_scraper',
    true, true, true, true,
    'Nioaque, Jardim, Bonito, Anastácio, Aquidauana, Maracaju, BR-060, BR-419',
    'ms'
  )
on conflict (rss_url) do update set
  source_type = excluded.source_type,
  is_active = excluded.is_active,
  auto_publish = excluded.auto_publish,
  ai_rewrite = excluded.ai_rewrite,
  use_original_image = excluded.use_original_image,
  keywords_filter = excluded.keywords_filter,
  default_category = excluded.default_category,
  updated_at = now();
