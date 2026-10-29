-- =============================================================================
-- 006_auto_publish.sql
-- Controle de piloto automático (auto-publish) na tabela news_sources
-- =============================================================================

-- Novas colunas de controle na tabela news_sources
alter table public.news_sources
  add column if not exists auto_publish boolean not null default true;

alter table public.news_sources
  add column if not exists ai_rewrite boolean not null default true;

alter table public.news_sources
  add column if not exists use_original_image boolean not null default true;

alter table public.news_sources
  add column if not exists keywords_filter text;

-- Índice para busca rápida de fontes ativas com auto-publish
create index if not exists idx_news_sources_auto_publish
  on public.news_sources (is_active, auto_publish);

-- Comentário de documentação das colunas
comment on column public.news_sources.auto_publish is
  'Se true, insere o artigo direto com status = published e published_at = now().';
comment on column public.news_sources.ai_rewrite is
  'Se true, passa texto e título pelo Cloudflare Workers AI / Gemini para reescrever e gerar os 3 bullets do summary_bullets.';
comment on column public.news_sources.use_original_image is
  'Se true, extrai e usa a foto real da matéria original como capa.';
comment on column public.news_sources.keywords_filter is
  'Lista de palavras separadas por vírgula. Se preenchido, importa apenas notícias que contenham alguma dessas palavras.';

-- Fontes pré-cadastradas no piloto automático (todas com use_original_image = true, auto_publish = true)
insert into public.news_sources (
  name, rss_url, is_active, auto_publish, ai_rewrite, use_original_image,
  keywords_filter, default_category
) values
  (
    'Agência de Notícias de MS',
    'https://agenciadenoticias.ms.gov.br/?feed=rss2',
    true, true, false, true,
    null, 'ms'
  ),
  (
    'Agência Brasil / EBC',
    'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
    true, true, false, true,
    null, 'brasil'
  ),
  (
    'G1 Mato Grosso do Sul',
    'https://g1.globo.com/rss/g1/mato-grosso-do-sul/',
    true, true, true, true,
    'Nioaque, Jardim, Bonito, Anastácio, Aquidauana, Sidrolândia, BR-060, Pantanal',
    'nioaque'
  ),
  (
    'Campo Grande News',
    'https://www.campograndenews.com.br/rss',
    true, true, true, true,
    'Nioaque, Jardim, Bonito, Anastácio, Aquidauana, BR-060',
    'nioaque'
  ),
  (
    'Midiamax',
    'https://midiamax.uol.com.br/feed/',
    true, true, true, true,
    'Nioaque, Jardim, Bonito, Anastácio, Aquidauana, BR-060',
    'nioaque'
  )
on conflict (rss_url) do update set
  is_active = excluded.is_active,
  auto_publish = excluded.auto_publish,
  ai_rewrite = excluded.ai_rewrite,
  use_original_image = excluded.use_original_image,
  keywords_filter = excluded.keywords_filter,
  default_category = excluded.default_category,
  updated_at = now();
