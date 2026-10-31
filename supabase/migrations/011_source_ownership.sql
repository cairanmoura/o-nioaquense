-- =============================================================================
-- 011_source_ownership.sql
-- Tipo de fonte (publica x privada) + desduplicacao por source_url
-- -----------------------------------------------------------------------------
-- `source_type` ja guarda o MECANISMO ('rss' | 'html_scraper'), entao o tipo de
-- propriedade vira uma coluna propria: `ownership`.
--   public  -> agencias/orgaos oficiais: texto limpo + resumo, credito oficial
--   private -> portais privados: reescrita total com IA, sempre como rascunho
-- =============================================================================

alter table public.news_sources
  add column if not exists ownership text not null default 'private'
  check (ownership in ('public', 'private'));

update public.news_sources
   set ownership = 'public'
 where name ilike 'ag%ncia de not%cias%'
    or name ilike 'ag%ncia brasil%'
    or name ilike '%prefeitura%'
    or name ilike '%governo%';

-- Desduplicacao: o mesmo link nao entra duas vezes.
-- Duplicatas antigas ficam sem source_url (nao apaga nenhuma materia).
with ranked as (
  select id, row_number() over (partition by source_url order by created_at) as rn
  from public.articles
  where source_url is not null
)
update public.articles a
   set source_url = null
  from ranked r
 where a.id = r.id and r.rn > 1;

create unique index if not exists articles_source_url_key
  on public.articles (source_url)
  where source_url is not null;
