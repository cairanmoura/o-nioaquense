-- =============================================================================
-- 007_geographic_classification.sql
-- Classificacao geografica e tematica por conteudo (local_tags + scope regiao)
-- =============================================================================

-- Adiciona o novo valor 'regiao' ao enum de escopo (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'regiao'
      and enumtypid = (
        select oid from pg_type where typname = 'article_scope'
      )
  ) then
    alter type public.article_scope add value 'regiao';
  end if;
end
$$;

-- Coluna de tags de cidades/locais detectadas no conteudo
alter table public.articles
  add column if not exists local_tags text[] default '{}';

-- Indice GIN para busca eficiente por local_tags (contem cidade X)
create index if not exists idx_articles_local_tags
  on public.articles using gin (local_tags);

-- Comentario de documentacao
comment on column public.articles.local_tags is
  'Cidades e locais detectados no titulo/conteudo da materia (ex.: Niooque, Jardim, BR-060, Rota Bioceania).';

-- Indice parcial para o novo escopo. Compara como TEXTO (scope::text) porque
-- o Postgres nao permite usar um valor de enum recem-criado na mesma
-- transacao (erro 55P04) — o cast para text evita o problema.
create index if not exists idx_articles_scope_regiao
  on public.articles (scope)
  where scope::text = 'regiao';
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
-- =============================================================================
-- 009_google_news_sources.sql
-- Fontes via Google News RSS (forma estavel de acompanhar portais sem RSS)
-- -----------------------------------------------------------------------------
-- IMPORTANTE: rode as migracoes nesta ordem: 007 -> 008 -> 009
-- (esta e' a ultima da sequencia; requer as colunas criadas na 008).
--
-- Os feeds do Google News (news.google.com/rss/search?q=site:...) sao XML no
-- padrao RSS 2.0 e funcionam mesmo quando o portal nao mantem RSS proprio.
-- O extrator detecta o dominio news.google.com, resolve o redirect de cada
-- <link> e baixa a pagina real da materia (og:image + <article>).
-- =============================================================================

-- a) Zera as fontes scraper do 008: substituidas pelos feeds Google News
update public.news_sources
   set is_active = false, updated_at = now()
 where source_type = 'html_scraper';

-- b) Desativa feeds RSS legados mortos (G1, Campo Grande News, Midiamax uol)
update public.news_sources
   set is_active = false, updated_at = now()
 where rss_url in (
   'https://g1.globo.com/rss/g1/mato-grosso-do-sul/',
   'https://www.campograndenews.com.br/rss',
   'https://midiamax.uol.com.br/feed/',
   'https://midiamax.uol.com.br/'
 );

-- c) Alinha as agencias existentes pela URL exata do feed (evita linha duplicada)
update public.news_sources
   set rss_url = 'https://agenciadenoticias.ms.gov.br/?feed=rss2',
       source_type = 'rss',
       is_active = true,
       auto_publish = true,
       ai_rewrite = false,
       use_original_image = true,
       updated_at = now()
 where name ilike 'ag%ncia de not%cias de ms%'
    or name ilike 'ag%ncia de not%cias ms%';

update public.news_sources
   set rss_url = 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
       source_type = 'rss',
       is_active = true,
       auto_publish = true,
       ai_rewrite = false,
       use_original_image = true,
       updated_at = now()
 where name ilike 'ag%ncia brasil%';

-- d) As 8 fontes ativas do piloto automatico
--    (Google News = filtro proprio da query; keywords_filter fica NULL)
insert into public.news_sources (
  name, rss_url, source_type, is_active, auto_publish, ai_rewrite,
  use_original_image, keywords_filter, default_category
) values
  (
    'Radar Google News - Nioaque Direto',
    'https://news.google.com/rss/search?q=Nioaque&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    'rss', true, true, true, true, null, 'nioaque'
  ),
  (
    'Radar Google News - Regiao Sudoeste/Pantanal',
    'https://news.google.com/rss/search?q=%22Jardim+MS%22+OR+%22Bonito+MS%22+OR+Aquidauana+OR+Anastacio+OR+%22Guia+Lopes%22+OR+%22BR-060%22+OR+%22Rota+Bioceanica%22&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    'rss', true, true, true, true, null, 'regiao'
  ),
  (
    'TopMidiaNews',
    'https://news.google.com/rss/search?q=site:topmidianews.com.br+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    'rss', true, true, true, true, null, 'ms'
  ),
  (
    'Primeira Pagina MS',
    'https://news.google.com/rss/search?q=site:primeirapagina.com.br/mato-grosso-do-sul+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    'rss', true, true, true, true, null, 'ms'
  ),
  (
    'Campo Grande News',
    'https://news.google.com/rss/search?q=site:campograndenews.com.br+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    'rss', true, true, true, true, null, 'ms'
  ),
  (
    'G1 Mato Grosso do Sul',
    'https://news.google.com/rss/search?q=site:g1.globo.com/ms/mato-grosso-do-sul+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419',
    'rss', true, true, true, true, null, 'ms'
  ),
  (
    'Agencia de Noticias de MS',
    'https://agenciadenoticias.ms.gov.br/?feed=rss2',
    'rss', true, true, false, true, null, 'ms'
  ),
  (
    'Agencia Brasil / EBC',
    'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
    'rss', true, true, false, true, null, 'brasil'
  )
on conflict (rss_url) do update set
  name = excluded.name,
  source_type = excluded.source_type,
  is_active = excluded.is_active,
  auto_publish = excluded.auto_publish,
  ai_rewrite = excluded.ai_rewrite,
  use_original_image = excluded.use_original_image,
  keywords_filter = excluded.keywords_filter,
  default_category = excluded.default_category,
  updated_at = now();

-- NOTA: Midiamax ficou de fora nesta rodada. O dominio antigo
-- midiamax.uol.com.br nao existe mais e midiams.com.br NAO e o Midiamax.
-- Reavaliar o dominio real e reativar depois (pode entrar como Google News
-- quando o portal voltar a ser indexado).
