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

-- Indice simples em scope (sem predicado: o cast scope::text nao e' IMMUTABLE
-- e o Postgres recusa funcoes em predicado de indice, erro 42P17).
create index if not exists idx_articles_scope
  on public.articles (scope);
