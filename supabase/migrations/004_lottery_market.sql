-- =============================================================================
--  O Nioaquense - Etapa 5b | Loterias, cotações e serviços do portal
-- -----------------------------------------------------------------------------
--  Tabelas que alimentam os blocos de serviço do portal (que os moradores de
--  Nioaque consultam todo dia): resultados das loterias, cotações da economia
--  e as séries do tempo (a temperatura vem da Open-Meteo, sem persistencia).
--
--  Este arquivo e' idempotente: pode ser reaplicado sem erro.
-- =============================================================================

-- ---------------------------------------------------------------------------
--  1) Resultados das loterias
-- ---------------------------------------------------------------------------
create table if not exists public.lottery_results (
  id              uuid primary key default gen_random_uuid(),
  modality        text        not null,
  contest_number  text        not null,
  contest_date    date        not null,
  numbers         jsonb       not null default '[]'::jsonb,
  prize_value     text,
  created_at      timestamptz not null default now(),

  constraint lottery_results_numbers_is_array check (jsonb_typeof(numbers) = 'array'),
  unique (modality, contest_number, contest_date)
);

-- Garantia de unicidade tambem em bases onde a tabela ja existia
create unique index if not exists lottery_results_unique_idx
  on public.lottery_results (modality, contest_number, contest_date);

comment on table public.lottery_results is
  'Resultados da Mega-Sena, Quina, Lotofacil, Lotomania e Duplasena publicados pelarediacao.';

-- ---------------------------------------------------------------------------
--  2) Cotacoes da economia
-- ---------------------------------------------------------------------------
create table if not exists public.market_quotes (
  id             uuid primary key default gen_random_uuid(),
  symbol         text        not null unique,
  label          text        not null,
  value          numeric(14, 4) not null,
  change_percent numeric(8, 4) not null default 0,
  unit           text,
  updated_at     timestamptz not null default now()
);

comment on table public.market_quotes is
  'Cotacoes exibidas na faixa economica do portal (dolar, euro, bitcoin, ibovespa).';

-- ---------------------------------------------------------------------------
--  3) RLS
-- ---------------------------------------------------------------------------
alter table public.lottery_results enable row level security;
alter table public.market_quotes enable row level security;

drop policy if exists "lottery_results_select_public" on public.lottery_results;
create policy "lottery_results_select_public"
  on public.lottery_results for select
  using (true);

drop policy if exists "lottery_results_admin_all" on public.lottery_results;
create policy "lottery_results_admin_all"
  on public.lottery_results for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "market_quotes_select_public" on public.market_quotes;
create policy "market_quotes_select_public"
  on public.market_quotes for select
  using (true);

drop policy if exists "market_quotes_admin_all" on public.market_quotes;
create policy "market_quotes_admin_all"
  on public.market_quotes for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.lottery_results to anon, authenticated;
grant insert, update, delete on public.lottery_results to authenticated;
grant select on public.market_quotes to anon, authenticated;
grant insert, update, delete on public.market_quotes to authenticated;

-- ---------------------------------------------------------------------------
--  4) Indices
-- ---------------------------------------------------------------------------
create index if not exists lottery_results_modality_date_idx
  on public.lottery_results (modality, contest_date desc);

-- ---------------------------------------------------------------------------
--  5) View: ultimo resultado de cada modalidade
-- ---------------------------------------------------------------------------
create or replace view public.latest_lottery_results as
select distinct on (modality)
  id,
  modality,
  contest_number,
  contest_date,
  numbers,
  prize_value,
  created_at
from public.lottery_results
order by modality, contest_date desc, created_at desc;

grant select on public.latest_lottery_results to anon, authenticated;
