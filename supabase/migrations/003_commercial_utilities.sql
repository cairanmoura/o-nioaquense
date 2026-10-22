-- =============================================================================
--  O Nioaquense - Etapa 5 | Gestao comercial e utilidade publica
-- -----------------------------------------------------------------------------
--  Este arquivo e' idempotente: pode ser reaplicado sem erro.
--
--  Novidades:
--    - `local_ads.offer_type` : distingue banner de "Oferta do Dia"
--    - `local_ads.price_label`, `local_ads.notes`
--    - `bus_schedules`        : tabela de horarios de onibus intermunicipais
--      (estruturada, no lugar do HTML solto) + RLS
--    - view de apoio para o relatorio de cliques
-- =============================================================================

-- ---------------------------------------------------------------------------
--  1) Anuncios locais: tipo de oferta
-- ---------------------------------------------------------------------------
do $$
begin
  create type public.ad_offer_type as enum ('banner', 'daily_deal');
exception
  when duplicate_object then null;
end
$$;

alter table public.local_ads
  add column if not exists offer_type public.ad_offer_type not null default 'banner';

alter table public.local_ads
  add column if not exists price_label text;

alter table public.local_ads
  add column if not exists notes text;

comment on column public.local_ads.offer_type is 'banner = faixa publicitaria; daily_deal = Oferta do Dia em Nioaque.';
comment on column public.local_ads.price_label is 'Preco/condicao exibida no card de oferta (ex.: "R$ 39,90").';
comment on column public.local_ads.clicks_count is 'Cliques contabilizados pela rota /api/ads/click/[id].';

-- ---------------------------------------------------------------------------
--  2) Horarios de onibus intermunicipais (tabela estruturada)
-- ---------------------------------------------------------------------------
create table if not exists public.bus_schedules (
  id              uuid primary key default gen_random_uuid(),
  route_name      text        not null,
  destination     text        not null,
  departure_times jsonb       not null default '[]'::jsonb,
  frequency       text,
  notes           text,
  position        integer     not null default 0,
  active          boolean     not null default true,
  updated_at      timestamptz not null default now(),

  constraint bus_schedules_times_is_array check (jsonb_typeof(departure_times) = 'array')
);

comment on table public.bus_schedules is 'Horarios de onibus intermunicipais que sao do municipio de Nioaque.';
comment on column public.bus_schedules.departure_times is 'Lista de horarios no formato ["06:30", "18:00"].';

-- ---------------------------------------------------------------------------
--  3) RLS dos horarios de onibus
-- ---------------------------------------------------------------------------
alter table public.bus_schedules enable row level security;

drop policy if exists "bus_schedules_select_public" on public.bus_schedules;
create policy "bus_schedules_select_public"
  on public.bus_schedules for select
  using (active = true or public.is_admin());

drop policy if exists "bus_schedules_admin_all" on public.bus_schedules;
create policy "bus_schedules_admin_all"
  on public.bus_schedules for all
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.bus_schedules to anon, authenticated;
grant insert, update, delete on public.bus_schedules to authenticated;

-- ---------------------------------------------------------------------------
--  4) Indice
-- ---------------------------------------------------------------------------
create index if not exists bus_schedules_position_idx
  on public.bus_schedules (position) where active = true;

-- ---------------------------------------------------------------------------
--  5) Relatorio de cliques por anunciante
-- ---------------------------------------------------------------------------
create or replace view public.ad_click_report as
select
  a.id,
  a.client_name,
  a.title,
  a.slot_position,
  a.offer_type,
  a.active,
  a.starts_at,
  a.ends_at,
  a.clicks_count,
  case
    when a.starts_at is not null and a.starts_at > now() then 'agendado'
    when a.ends_at   is not null and a.ends_at   < now() then 'encerrado'
    else 'no ar'
  end as situation
from public.local_ads a
order by a.clicks_count desc, a.created_at desc;

grant select on public.ad_click_report to authenticated;

-- ---------------------------------------------------------------------------
--  6) Escala semanal da farmacia de plantao
--    (a coluna `duty_date` ja existe; a view agrupa por dia da semana)
-- ---------------------------------------------------------------------------
create or replace view public.pharmacy_week as
select
  u.duty_date,
  extract(isodow from u.duty_date)::int as weekday_number,
  to_char(u.duty_date, 'DD/MM')       as duty_label,
  u.pharmacy_name,
  u.pharmacy_phone,
  u.pharmacy_address,
  u.alert_active,
  u.alert_message,
  u.alert_level,
  u.updated_at
from public.public_utilities u
order by u.duty_date asc;

grant select on public.pharmacy_week to authenticated;
