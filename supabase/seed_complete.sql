-- =============================================================================
--  O Nioaquense - Schema completo + dados (arquivo unico)
-- -----------------------------------------------------------------------------
--  Cole TUDO no SQL Editor do Supabase e execute uma vez.
--  https://supabase.com/dashboard/project/_/sql
--
--  Ordem: enums -> tabelas -> funcoes -> triggers -> RLS/policies -> dados.
--  O script e idempotente: pode ser executado novamente sem erro.
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
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles for select to authenticated using (true);

drop policy if exists "profiles_insert_authenticated" on public.profiles;
create policy "profiles_insert_authenticated" on public.profiles for insert to authenticated with check (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public" on public.profiles for select to anon, authenticated using (active = true);

-- Policies de articles
drop policy if exists "articles_select_published" on public.articles;
create policy "articles_select_published" on public.articles for select using (status = 'published');

drop policy if exists "articles_select_authenticated" on public.articles;
create policy "articles_select_authenticated" on public.articles for select to authenticated using (true);

drop policy if exists "articles_insert_authenticated" on public.articles;
create policy "articles_insert_authenticated" on public.articles for insert to authenticated with check (auth.uid() = author_id);

drop policy if exists "articles_update_own" on public.articles;
create policy "articles_update_own" on public.articles for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- Policies de public_utilities
drop policy if exists "public_utilities_select_all" on public.public_utilities;
create policy "public_utilities_select_all" on public.public_utilities for select using (true);

-- Servico publico: horarios de onibus, cotacoes e loterias
alter table public.bus_schedules enable row level security;
alter table public.market_quotes enable row level security;
alter table public.lottery_results enable row level security;

drop policy if exists "bus_schedules_select_public" on public.bus_schedules;
create policy "bus_schedules_select_public" on public.bus_schedules for select to anon, authenticated using (true);

drop policy if exists "bus_schedules_admin_all" on public.bus_schedules;
create policy "bus_schedules_admin_all" on public.bus_schedules for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "market_quotes_select_public" on public.market_quotes;
create policy "market_quotes_select_public" on public.market_quotes for select to anon, authenticated using (true);

drop policy if exists "market_quotes_admin_all" on public.market_quotes;
create policy "market_quotes_admin_all" on public.market_quotes for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lottery_results_select_public" on public.lottery_results;
create policy "lottery_results_select_public" on public.lottery_results for select to anon, authenticated using (true);

drop policy if exists "lottery_results_admin_all" on public.lottery_results;
create policy "lottery_results_admin_all" on public.lottery_results for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Policies de local_ads
drop policy if exists "local_ads_select_all" on public.local_ads;
create policy "local_ads_select_all" on public.local_ads for select using (active = true);

-- Policies de reader_submissions
drop policy if exists "reader_submissions_insert_public" on public.reader_submissions;
create policy "reader_submissions_insert_public" on public.reader_submissions for insert to public with check (true);

drop policy if exists "reader_submissions_select_authenticated" on public.reader_submissions;
create policy "reader_submissions_select_authenticated" on public.reader_submissions for select to authenticated using (true);

drop policy if exists "reader_submissions_update_admin" on public.reader_submissions;
create policy "reader_submissions_update_admin" on public.reader_submissions for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Policies de administracao (RBAC) - usam as funcoes security definer
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "articles_admin_select" on public.articles;
create policy "articles_admin_select" on public.articles for select to authenticated using (public.is_staff());

drop policy if exists "articles_update_admin" on public.articles;
create policy "articles_update_admin" on public.articles for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "articles_delete_admin" on public.articles;
create policy "articles_delete_admin" on public.articles for delete to authenticated using (public.is_admin());

drop policy if exists "local_ads_admin_all" on public.local_ads;
create policy "local_ads_admin_all" on public.local_ads for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public_utilities_admin_all" on public.public_utilities;
create policy "public_utilities_admin_all" on public.public_utilities for all to authenticated using (public.is_admin()) with check (public.is_admin());

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
-- ===========================================================================
--  DADOS (seed) - 5 perfis, 19 materias, farmacias, onibus e anuncios
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  1. PERFIS (profiles)
-- ---------------------------------------------------------------------------
insert into public.profiles (id, full_name, slug, role, column_name, bio, avatar_url, social_links, can_publish_directly, active) values
  ('10000000-0000-4000-8000-000000000001', 'Redação O Nioaquense', 'redacao-o-nioaquense', 'admin', 'Redação', 'Equipe editorial do portal. Publica o dia a dia de Nioaque, do Sul de Mato Grosso do Sul e do Brasil.', '/covers/avatar-redacao.svg', '{"instagram": "https://instagram.com/onioaquense", "whatsapp": "5567999990000"}', true, true),
  ('10000000-0000-4000-8000-000000000002', 'Marcos Aurelio Duarte', 'marcos-aurelio-duarte', 'columnist', 'Visão de Nioaque', 'Jornalista local há 18 anos. Escreve sobre política municipal, economia regional e o futuro das cidades pequenas do MS.', '/covers/avatar-marcos.svg', '{"instagram": "https://instagram.com/visaodenioaque"}', false, true),
  ('10000000-0000-4000-8000-000000000003', 'Cleide Ramos', 'cleide-ramos', 'columnist', 'Giro de Bairro', 'Moradora do bairro Vila Nova. Leva para a coluna o que acontece nas esquinas, nas escolas e nas feiras da cidade.', '/covers/avatar-cleide.svg', '{"whatsapp": "5567988881111"}', false, true),
  ('10000000-0000-4000-8000-000000000004', 'Rafael Prado', 'rafael-prado', 'columnist', 'Radar MS', 'Correspondente regional. Acompanha as decisões do governo estadual e os números que impactam o interior de MS.', '/covers/avatar-rafael.svg', '{"linkedin": "https://linkedin.com/in/radarms"}', true, true),
  ('10000000-0000-4000-8000-000000000005', 'Vinícius Prado', 'vinicius-prado', 'columnist', 'Bastidores', 'Fica nos bastidores da Câmara, da Prefeitura e das entidades do município. O que o anúncio não conta.', '/covers/avatar-vinicius.svg', '{}', false, true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  2. MATÉRIAS (articles) - Nioaque
-- ---------------------------------------------------------------------------
insert into public.articles (id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption, scope, category_label, is_breaking, is_featured, author_id, status, views_count, published_at, created_at, updated_at) values
  (
    '20000000-0000-4000-8000-000000000001',
    'Frigocampo paralisa e afeta 150 empregos',
    'Unidade havia retomado as atividades em agosto após um período parado.',
    'frigorifico-nioaque-frigocampo-paralisa-falta-materia-prima',
    ARRAY[
      'O frigorífico havia retomado as atividades em agosto, após um período parado.',
      'A empresa anunciou nova paralisação diante das dificuldades no abastecimento de matéria-prima.',
      'A situação afeta o emprego e o abastecimento de carne na região.'
    ],
    '<p>O Frigorífico de Nioaque, o Frigocampo, voltou a paralisar suas atividades por falta de matéria-prima. A unidade, que havia retomado as atividades em agosto, após um período parado, anunciou nesta semana uma nova paralisação diante das dificuldades no abastecimento.</p><p>Segundo a administração, cerca de 150 funcionários estão diretamente afetados pela parada. O abastecimento de carne na região também sente os reflexos da decisão.</p><p>O Sindicato dos Trabalhadores nas Indústrias da Alimentação de MS aguarda uma reunião com os responsáveis pela empresa para esta semana.</p>',
    '/covers/cap-01.svg',
    'Trecho da BR-060 onde aconteceu a colisão',
    'nioaque',
    'Frigorífico Nioaque',
    false,
    true,
    '10000000-0000-4000-8000-000000000001',
    'published',
    1240,
    '2026-10-20T10:30:00Z',
    '2026-10-20T10:30:00Z',
    '2026-10-20T10:30:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Feira do Produtor confirma 60 expositores para a próxima edição',
    'Evento acontece neste sábado na praça central com produtos da agricultura familiar.',
    'feira-do-produtor-confirma-60-expositores-proxima-edicao',
    ARRAY[
      'Mais de 60 expositores confirmados para edição deste sábado.',
      'Produtos da agricultura familiar de Nioaque e região.',
      'Evento acontece das 7h às 13h na praça central.'
    ],
    '<p>A Feira do Produtor de Nioaque confirma 60 expositores para sua próxima edição, que acontece neste sábado na praça central da cidade. O evento reúne produtores da agricultura familiar de Nioaque e municípios da região.</p><p>Entre os produtos disponíveis estão hortaliças, frutas, mel, queijos caseiros, bolos e artesanato local. A feira funciona das 7h às 13h e tem entrada gratuita.</p><p>A iniciativa é organizada pela Prefeitura Municipal em parceria com a Emater-MS, com o objetivo de fortalecer a economia local e incentivar o consumo de produtos da região.</p>',
    '/covers/cap-05.svg',
    'Produtos da agricultura familiar',
    'nioaque',
    'Agricultura Familiar',
    false,
    false,
    '10000000-0000-4000-8000-000000000003',
    'published',
    890,
    '2026-10-19T14:00:00Z',
    '2026-10-19T14:00:00Z',
    '2026-10-19T14:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'Prefeitura de Nioaque anuncia pavimentação de três ruas no bairro Vila Nova',
    'Obras começam na próxima semana com recursos próprios do município.',
    'prefeitura-nioaque-anuncia-pavimentacao-vila-nova',
    ARRAY[
      'Três ruas do bairro Vila Nova serão pavimentadas.',
      'Obras começam na próxima semana.',
      'Recursos são próprios do município.'
    ],
    '<p>A Prefeitura de Nioaque anunciou nesta terça-feira a pavimentação de três ruas no bairro Vila Nova. As obras devem começar na próxima semana e são executadas com recursos próprios do município.</p><p>As ruas contempladas são a Rua das Acácias, Rua do Ipê e Rua do Jabuticabeiro, que atendem cerca de 200 famílias da região. O investimento estimado é de R$ 320 mil.</p><p>O prefeito destacou que a pavimentação melhora a mobilidade, reduz a poeira nos períodos secos e evita alagamentos em épocas de chuva.</p>',
    '/covers/cap-02.svg',
    'Obras de pavimentação em Nioaque',
    'nioaque',
    'Obras Públicas',
    false,
    false,
    '10000000-0000-4000-8000-000000000004',
    'published',
    650,
    '2026-10-18T09:15:00Z',
    '2026-10-18T09:15:00Z',
    '2026-10-18T09:15:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'Câmara de Nioaque aprova projeto que cria Conselho Municipal da Juventude',
    'Projeto de lei foi aprovado por unanimidade em sessão ordinária.',
    'camara-nioaque-aprova-conselho-municipal-juventude',
    ARRAY[
      'Projeto de lei aprovado por unanimidade.',
      'Conselho terá 15 membros entre jovens e representantes.',
      'Objetivo é discutir políticas públicas para jovens de Nioaque.'
    ],
    '<p>A Câmara Municipal de Nioaque aprovou por unanimidade, em sessão ordinária desta segunda-feira, o projeto de lei que cria o Conselho Municipal da Juventude. A proposta segue agora para sanção do prefeito.</p><p>O conselho será composto por 15 membros, sendo metade jovens com idade entre 15 e 29 anos e metade representantes de entidades e órgãos públicos. O mandato será de dois anos, permitindo uma recondução.</p><p>Segundo o autor do projeto, vereador João Silva, o objetivo é criar um canal permanente de discussão sobre políticas públicas voltadas para a juventude de Nioaque, incluindo educação, emprego, cultura e esporte.</p>',
    '/covers/cap-03.svg',
    'Sessão ordinária da Câmara Municipal',
    'nioaque',
    'Câmara Municipal',
    false,
    false,
    '10000000-0000-4000-8000-000000000002',
    'published',
    420,
    '2026-10-17T16:45:00Z',
    '2026-10-17T16:45:00Z',
    '2026-10-17T16:45:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    'Unidade Básica de Saúde do Centro amplia horário de atendimento',
    'Nova escala começa segunda-feira com atendimento até as 20h.',
    'ubs-centro-amplia-horario-atendimento',
    ARRAY[
      'UBS do Centro passa a atender até as 20h.',
      'Nova escala começa na próxima segunda-feira.',
      'Mudança busca atender população que trabalha durante o dia.'
    ],
    '<p>A Unidade Básica de Saúde (UBS) do Centro de Nioaque amplia seu horário de atendimento a partir da próxima segunda-feira. A unidade passa a funcionar até as 20h, de segunda a sexta-feira.</p><p>A mudança busca atender a população que trabalha durante o dia e não consegue buscar atendimento médico no horário comercial. Antes, a UBS fechava às 17h.</p><p>Segundo a Secretaria Municipal de Saúde, a ampliação contempla consultas médicas, de enfermagem, vacinação e coleta de exames. O agendamento pode ser feito presencialmente ou pelo aplicativo da prefeitura.</p>',
    '/covers/cap-04.svg',
    'Fachada da UBS Centro de Nioaque',
    'nioaque',
    'Saúde',
    false,
    false,
    '10000000-0000-4000-8000-000000000003',
    'published',
    530,
    '2026-10-16T11:20:00Z',
    '2026-10-16T11:20:00Z',
    '2026-10-16T11:20:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    'Escola Municipal José Pereira sedia campeonato de futsal escolar',
    'Cerca de 120 estudantes de 10 escolas participam do torneio.',
    'escola-jose-pereira-sedia-campeonato-futsal-escolar',
    ARRAY[
      'Cerca de 120 estudantes de 10 escolas participam.',
      'Torneio acontece na quadra coberta da escola.',
      'Premiação com medalhas e troféus para as três primeiras colocações.'
    ],
    '<p>A Escola Municipal José Pereira sedia, nesta quinta e sexta-feira, o Campeonato de Futsal Escolar de Nioaque. Cerca de 120 estudantes de 10 escolas da rede municipal participam do torneio.</p><p>Os jogos acontecem na quadra coberta da escola, com partidas nas categorias mirim (9 a 11 anos) e infantil (12 a 14 anos), tanto no masculino quanto no feminino.</p><p>A premiação ocorre no final da tarde de sexta-feira, com medalhas e troféus para as três primeiras colocações de cada categoria. O evento é organizado pela Secretaria Municipal de Educação em parceria com o Departamento de Esportes.</p>',
    '/covers/cap-06.svg',
    'Quadra de futsal da Escola Municipal José Pereira',
    'nioaque',
    'Esporte',
    false,
    false,
    '10000000-0000-4000-8000-000000000005',
    'published',
    310,
    '2026-10-15T15:00:00Z',
    '2026-10-15T15:00:00Z',
    '2026-10-15T15:00:00Z'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  3. MATÉRIAS - Mato Grosso do Sul
-- ---------------------------------------------------------------------------
insert into public.articles (id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption, scope, category_label, is_breaking, is_featured, author_id, status, views_count, published_at, created_at, updated_at) values
  (
    '20000000-0000-4000-8000-000000000011',
    'Governo de MS anuncia R$ 150 milhões para pavimentação em municípios do interior',
    'Recursos são destinados a 22 cidades, incluindo Nioaque e região.',
    'governo-ms-anuncia-r150-milhoes-pavimentacao-interior',
    ARRAY[
      'R$ 150 milhões destinados a 22 municípios.',
      'Nioaque está entre as cidades contempladas.',
      'Recursos são para pavimentação asfáltica.'
    ],
    '<p>O Governo de Mato Grosso do Sul anunciou nesta semana um investimento de R$ 150 milhões para pavimentação asfáltica em 22 municípios do interior do estado. Nioaque está entre as cidades contempladas com o programa.</p><p>Os recursos são provenientes de financiamento junto a instituições financeiras e serão liberados gradualmente conforme a apresentação dos projetos pelos municípios.</p><p>O governador destacou que a pavimentação melhora a trafegabilidade, reduz acidentes e valoriza imóveis nas regiões atendidas. As obras devem começar nos próximos 90 dias.</p>',
    '/covers/cap-07.svg',
    'Obras de pavimentação em MS',
    'ms',
    'Infraestrutura',
    false,
    false,
    '10000000-0000-4000-8000-000000000004',
    'published',
    780,
    '2026-10-19T08:00:00Z',
    '2026-10-19T08:00:00Z',
    '2026-10-19T08:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000012',
    'Campo Grande sedia Feira Nacional da Agricultura Familiar',
    'Evento reúne produtores de todo o estado até domingo.',
    'campo-grande-sedia-feira-agricultura-familiar',
    ARRAY[
      'Feira reúne produtores de todo o estado.',
      'Evento acontece até domingo no Parque de Exposições.',
      'Produtos coloniais, artesanato e alimentos da roça.'
    ],
    '<p>Campo Grande sedia, até domingo, a Feira Nacional da Agricultura Familiar. O evento reúne produtores rurais de todo o estado de Mato Grosso do Sul no Parque de Exposições Laucídio Coelho.</p><p>São mais de 200 estandes com produtos coloniais, alimentos da roça, artesanato, queijos, mel, doces e cachaças artesanais. A entrada é gratuita e o evento funciona das 9h às 21h.</p><p>Segundo os organizadores, a feira movimenta cerca de R$ 2 milhões em negócios e é uma importante vitrine para os pequenos produtores do estado.</p>',
    '/covers/cap-08.svg',
    'Produtos da agricultura familiar na feira',
    'ms',
    'Agricultura Familiar',
    false,
    false,
    '10000000-0000-4000-8000-000000000004',
    'published',
    560,
    '2026-10-18T12:30:00Z',
    '2026-10-18T12:30:00Z',
    '2026-10-18T12:30:00Z'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  4. MATÉRIAS - Brasil
-- ---------------------------------------------------------------------------
insert into public.articles (id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption, scope, category_label, is_breaking, is_featured, author_id, status, views_count, published_at, created_at, updated_at) values
  (
    '20000000-0000-4000-8000-000000000021',
    'Governo federal libera R$ 2 bilhões para o programa Minha Casa, Minha Vida',
    'Recursos são destinados a famílias com renda de até dois salários mínimos.',
    'governo-federal-libera-r2-bilhoes-minha-casa-minha-vida',
    ARRAY[
      'R$ 2 bilhões para o programa Minha Casa, Minha Vida.',
      'Famílias com renda de até dois salários mínimos são contempladas.',
      'Previsão é de construção de 50 mil moradias.'
    ],
    '<p>O governo federal anunciou a liberação de R$ 2 bilhões para o programa Minha Casa, Minha Vida. Os recursos são destinados a famílias com renda de até dois salários mínimos.</p><p>De acordo com o Ministério das Cidades, a previsão é de construção de 50 mil moradias em todo o país nos próximos 18 meses. As primeiras cidades a receber os recursos serão anunciadas na próxima semana.</p><p>O programa é uma das principais bandeiras do governo federal na área de habitação e visa reduzir o déficit habitacional no país.</p>',
    '/covers/cap-09.svg',
    'Conjunto habitacional',
    'brasil',
    'Habitação',
    false,
    false,
    '10000000-0000-4000-8000-000000000001',
    'published',
    940,
    '2026-10-18T14:30:00Z',
    '2026-10-18T14:30:00Z',
    '2026-10-18T14:30:00Z'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  5. UTILIDADE PÚBLICA (public_utilities)
-- ---------------------------------------------------------------------------
insert into public.public_utilities (id, duty_date, pharmacy_name, pharmacy_phone, pharmacy_address, alert_active, alert_message, alert_level, created_at, updated_at) values
  (
    '30000000-0000-4000-8000-000000000001',
    '2026-10-22',
    'Farmácia Popular Nioaque',
    '(67) 9 9999-1234',
    'Rua das Flores, 120 - Centro, Nioaque-MS',
    false,
    null,
    null,
    '2026-10-22T08:00:00Z',
    '2026-10-22T08:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '2026-10-23',
    'Farmácia São João',
    '(67) 9 9888-5678',
    'Avenida Principal, 450 - Centro, Nioaque-MS',
    false,
    null,
    null,
    '2026-10-22T08:00:00Z',
    '2026-10-22T08:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '2026-10-24',
    'Farmácia Central',
    '(67) 9 9777-9012',
    'Rua Comércio, 200 - Centro, Nioaque-MS',
    false,
    null,
    null,
    '2026-10-22T08:00:00Z',
    '2026-10-22T08:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '2026-10-25',
    'Farmácia do Trabalhador',
    '(67) 9 9666-3344',
    'Rua da Paz, 80 - Vila Nova, Nioaque-MS',
    false,
    null,
    null,
    '2026-10-22T08:00:00Z',
    '2026-10-22T08:00:00Z'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  6. HORÁRIOS DE ÔNIBUS (bus_schedules)
-- ---------------------------------------------------------------------------
insert into public.bus_schedules (id, route_name, destination, departure_times, frequency, active, created_at, updated_at) values
  (
    '40000000-0000-4000-8000-000000000001',
    'Linha 01',
    'Centro',
    ARRAY['06:00', '07:30', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00'],
    'Diária',
    true,
    '2026-10-20T08:00:00Z',
    '2026-10-20T08:00:00Z'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    'Linha 02',
    'Vila Nova',
    ARRAY['06:30', '08:00', '09:30', '11:30', '13:30', '15:30', '17:30', '19:30'],
    'Diária',
    true,
    '2026-10-20T08:00:00Z',
    '2026-10-20T08:00:00Z'
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    'Linha 03',
    'Assentamento',
    ARRAY['07:00', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00'],
    'Seg a Sex',
    true,
    '2026-10-20T08:00:00Z',
    '2026-10-20T08:00:00Z'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  7. ANÚNCIOS (local_ads)
-- ---------------------------------------------------------------------------
insert into public.local_ads (id, client_name, title, image_url, target_url, whatsapp_number, slot_position, offer_type, price_label, notes, starts_at, ends_at, active, clicks_count, created_at, updated_at) values
  (
    '50000000-0000-4000-8000-000000000001',
    'Mercado Nilo',
    '20% de desconto em cesta básica nesta semana',
    '/covers/ad-01.svg',
    null,
    '5567999990000',
    'sidebar',
    'banner',
    'R$ 39,90',
    'Válido até domingo.',
    '2026-10-15',
    '2026-10-31',
    true,
    45,
    '2026-10-15T08:00:00Z',
    '2026-10-15T08:00:00Z'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    'Auto Peças Silva',
    'Pneus com 15% de desconto para pagamento à vista',
    '/covers/ad-02.svg',
    null,
    '5567998887766',
    'home_middle',
    'banner',
    'Consulte preços',
    'Frete grátis em Nioaque.',
    '2026-10-10',
    '2026-10-30',
    true,
    32,
    '2026-10-10T08:00:00Z',
    '2026-10-10T08:00:00Z'
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    'Padaria Pão Quente',
    'Oferta do Dia: pão francês a R$ 0,40',
    '/covers/ad-03.svg',
    null,
    '5567997776655',
    'daily_deal',
    'daily_deal',
    'R$ 0,40',
    'Válido apenas hoje.',
    '2026-10-22',
    '2026-10-22',
    true,
    89,
    '2026-10-22T06:00:00Z',
    '2026-10-22T06:00:00Z'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  COLUNAS E RADAR OFICIAL (capas em branco: usam as artes geometricas)
-- ---------------------------------------------------------------------------
insert into public.articles (id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption, scope, category_label, is_breaking, is_featured, author_id, status, views_count, published_at, created_at, updated_at) values
  (
    '20000000-0000-4000-8000-000000000043',
    'Quem apaga o vazio do quadro de avisos',
    'Coluna Bastidores',
    'coluna-bastidores-quem-apaga-o-vazio-do-quadro-de-avisos',
    ARRAY['No municipio, muita informacao existe apenas em papel colado na porta.', 'Diario Oficial, editais e contratos ficam acessiveis a quem sabe onde olhar.', 'Transparencia so vale se o cidadao encontra.'],
    '<p>Existe uma informacao que quase nunca chega a quem precisa: a que esta afixada na porta da secretaria, em papel, defasada de duas semanas.</p>
<p>Licitacao, contrato, parecer tecnico, ata de comissao. Tudo isso existe, e tudo isso esta no Diario Oficial do municipio. O problema e'' a distancia entre o documento e a pessoa que precisa dele.</p>
<p>Num municipio pequeno, transparencia nao e'' um departing. E'' a unica forma de o morador conferir se o que o municipio diz combina com o que ele fez.</p>',
    null,
    null,
    'coluna',
    'Bastidores',
    false,
    false,
    '10000000-0000-4000-8000-000000000005',
    'published',
    1340,
    '2026-10-20T09:00:00Z',
    '2026-10-20T08:30:00Z',
    '2026-10-20T09:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000042',
    'Asfalto em Aquidauana e o que diz sobre a regiao',
    'Coluna Radar MS',
    'coluna-radar-ms-asfalto-aquidauana-regiao',
    ARRAY['Contrato de R$ 12 milhoes para asfalto e drenagem em Aquidauana foi formalizado.', 'A intervencao mostra a prioridade do Estado na regiao de Aquidauana.', 'Para Nioaque, a licao e'' sobre a ordem das obras.'],
    '<p>R$ 12 milhoes em asfalto e drenagem em Aquidauana: o contrato foi formalizado e diz bastante sobre como o Estado esta olhando para o Sul.</p>
<p>Aquidauana e'' a referencia regional para Nioaque em logistica, saude e comercio. Quando a cidade vizinha recebe obra de pavimentacao, o efeito chega aqui em horas.</p>
<p>A licao pratica e'' simples: quem tem projeto pronto espera menos. Nossas obras, por menorem, precisam de um passo a mais - e esse passo comeca no papel, nao nainauguracao.</p>',
    null,
    null,
    'coluna',
    'Radar MS',
    false,
    false,
    '10000000-0000-4000-8000-000000000004',
    'published',
    1930,
    '2026-10-21T06:45:00Z',
    '2026-10-21T06:20:00Z',
    '2026-10-21T06:45:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000041',
    'Feira do Produtor: o que parece pequeno e sustenta a cidade',
    'Coluna Giro de Bairro',
    'coluna-giro-de-bairro-feira-do-produtor-sustenta-cidade',
    ARRAY['Duas manhas por semana a feira aproxima produtor e consumidor.', 'A agricultura familiar movimenta o comercio do municipio inteiro.', 'Quem produz em Nioaque precisa de quem compra perto de casa.'],
    '<p>Toda cidade que quer ser grande precisa de uma base que a sustente. Em Nioaque, essa base tem nome e horario: a Feira do Produtor, duas vezes por semana na Rodoviaria.</p>
<p>Quem passa la na manha ve o que o campo produz e, no mesmo minuto, ve quem compra. E'' essa proximidade que sustenta a agricultura familiar e, com ela, boa parte do comercio local.</p>
<p>Feira e'' onde a cidade ve a si mesma. Bom sinal.</p>',
    null,
    null,
    'coluna',
    'Giro de Bairro',
    false,
    false,
    '10000000-0000-4000-8000-000000000003',
    'published',
    2680,
    '2026-10-21T07:30:00Z',
    '2026-10-21T07:00:00Z',
    '2026-10-21T07:30:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000040',
    'O municipio que aprendeu a fazer do medo um projeto',
    'Coluna Visao de Nioaque',
    'coluna-visao-nioaque-municipio-que-aprendeu-do-medo',
    ARRAY['A resposta a alertas de tempestade em Nioaque virou rotina de protecao da populacao.', 'Defesa Civil,_INMET e comunicacao local trabalhando na mesma direcao.', 'O que era reacao de urgencia virou plano.'],
    '<p>Toda cidade do interior aprende a ler o ceu. O que Nioaque aprendeu a fazer melhor foi transformar o alerta em rotina.</p>
<p>Em poucas semanas, a comunicacao do municipio passou a repassar os avisos do INMET com a mesma frequencia com que avisa sobre o transporte ou a farmacia de plantao. Isso parece pequeno, nao e: e'' a diferenca entre a pessoa se assustar e a pessoa se preparar.</p>
<p>Tem preco, tem protocolo, tem quem cuide. E'' assim que se construtor de Confianca entre quem produz e quem decide.</p>',
    null,
    null,
    'coluna',
    'Visao de Nioaque',
    false,
    true,
    '10000000-0000-4000-8000-000000000002',
    'published',
    4210,
    '2026-10-22T07:00:00Z',
    '2026-10-22T06:20:00Z',
    '2026-10-22T07:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000055',
    'Feira do Produtor amplia movecao e estabelece novo dia de funcionamento',
    'Radar Oficial',
    'radar-oficial-feira-produtor-novo-dia-funcionamento',
    ARRAY['A feira passa a ter mais um dia de funcionamento por semana.', 'Produtores da agricultura familiar tem cadastro aberto.', 'A lista dos participantes pode ser consultada na secretaria.'],
    '<p>A Feira do Produtor amplia a movimentacao e estabelece novo dia de funcionamento. Produtores da agricultura familiar tem cadastro aberto.</p>
<p>A lista dos participantes pode ser consultada na secretaria, das 8h as 17h.</p>',
    null,
    null,
    'radar_oficial',
    'Prefeitura',
    false,
    false,
    '10000000-0000-4000-8000-000000000001',
    'published',
    430,
    '2026-10-19T11:20:00Z',
    '2026-10-19T11:00:00Z',
    '2026-10-19T11:20:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000054',
    'Diario Oficial do municipio: confira as publicacoes desta semana',
    'Radar Oficial',
    'radar-oficial-diario-oficial-publicacoes-da-semana',
    ARRAY['A edicao da semana reune portarias, editais e atos de licitacao.', 'O gazeto pode ser lido online ou retirado em grafica no centro.', 'Prazos para impugnacao vencem nesta sexta-feira.'],
    '<p>A edicao desta semana do Diario Oficial do municipio reune portarias, editais e atos de licitacao. O gazeto pode ser lido online ou retirado em grafica no centro.</p>
<p>Destaques: o regulamento do transporte escolar, a licitacao da obra de recapeamento e a tabela de onibus para o proximo trimestre. Os prazos para impugnacao vencem nesta sexta-feira.</p>',
    null,
    null,
    'radar_oficial',
    'Diário Oficial',
    false,
    false,
    '10000000-0000-4000-8000-000000000001',
    'published',
    520,
    '2026-10-20T16:40:00Z',
    '2026-10-20T16:20:00Z',
    '2026-10-20T16:40:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000053',
    'De saladeiro a vigia, Campo Grande oferta mais de 600 vagas nesta quinta-feira',
    'Radar Oficial',
    'radar-oficial-campo-grande-600-vagas-emprego',
    ARRAY['Mais de 600 vagas sao ofertadas nesta quinta-feira em Campo Grande.', '418 delas sao para pessoas sem experiencia.', 'A selecao e'' feita em um unico dia, por ordem de chegada.'],
    '<p>De saladeiro a vigia: Campo Grande oferta mais de 600 vagas nesta quinta-feira. Do total, 418 sao para pessoas sem experiencia.</p>
<p>A selecao acontece em um unico dia, por ordem de chegada. Quem busca a vaga precisa levar documento de identidade e comprovante de endereco.</p>',
    null,
    null,
    'radar_oficial',
    'Concursos',
    false,
    false,
    '10000000-0000-4000-8000-000000000001',
    'published',
    980,
    '2026-10-21T12:30:00Z',
    '2026-10-21T12:10:00Z',
    '2026-10-21T12:30:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000052',
    'Camara de Paraiso das Aguas abre concurso com salarios de ate R$ 8,1 mil',
    'Radar Oficial',
    'radar-oficial-camara-paraiso-aguas-concurso-8-1-mil',
    ARRAY['O edital oferece vagas para candidatos com ensino medio e superior.', 'Os salarios chegam a R$ 8,1 mil.', 'As inscricoes seguem conforme o cronograma do edital.'],
    '<p>A Camara de Paraiso das Aguas abriu concurso com salarios de ate R$ 8,1 mil. O edital oferece vagas para candidatos com ensino medio e superior.</p>
<p>As inscricoes seguem conforme o cronograma publicado no edital, consultado pela redacao.</p>',
    null,
    null,
    'radar_oficial',
    'Concursos',
    false,
    false,
    '10000000-0000-4000-8000-000000000001',
    'published',
    1420,
    '2026-10-21T13:10:00Z',
    '2026-10-21T13:00:00Z',
    '2026-10-21T13:10:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000051',
    'Camara de Campo Grande vota criacao do Conselho de Migrantes nesta quinta-feira',
    'Radar Oficial',
    'radar-oficial-camara-campo-grande-conselho-migrantes-votacao',
    ARRAY['A Camara de Campo Grande vota nesta quinta-feira a criacao do Conselho de Migrantes.', 'Um projeto que revoga a doacao de imovel publico tambem sera analisado.', 'As sessoes sao transmitidas e podem ser acompanhadas pelo cidade.'],
    '<p>A Camara de Campo Grande vota nesta quinta-feira a criacao do Conselho de Migrantes. Um projeto que revoga a doacao de imovel publico tambem sera analisado na mesma sessao.</p>
<p>Sessoes da Camara sao transmitidas e podem ser acompanhadas pelo cidade, no site oficial.</p>',
    null,
    null,
    'radar_oficial',
    'Câmara',
    false,
    false,
    '10000000-0000-4000-8000-000000000001',
    'published',
    610,
    '2026-10-21T14:20:00Z',
    '2026-10-21T14:00:00Z',
    '2026-10-21T14:20:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000050',
    'Nioaque homologa empresa por R$ 3,57 milhoes para nova creche no bairro Monte Alto',
    'Radar Oficial',
    'radar-oficial-nioaque-homologa-empresa-creche-monte-alto-3-57-milhoes',
    ARRAY['A Dias Construtora e Empreendimentos LTDA foi declarada vencedora da licitacao.', 'O valor e'' de R$ 3.574.000,00 para uma Creche Pre-Escola Tipo 2 do FNDE.', 'A obra sera construida no bairro Monte Alto.'],
    '<p>Foi homologada a empresa que vai construir a nova creche do bairro Monte Alto. A Dias Construtora e Empreendimentos LTDA foi declarada vencedora da concurrencia para construcao de uma Creche Pre-Escola Tipo 2 do FNDE.</p>
<p>O valor contrato e'' de R$ 3.574.000,00. O prazo de execucao consta no processo, consultado pela redacao junto a secretaria de Obras.</p>',
    null,
    null,
    'radar_oficial',
    'Prefeitura',
    false,
    false,
    '10000000-0000-4000-8000-000000000001',
    'published',
    890,
    '2026-10-21T15:40:00Z',
    '2026-10-21T15:00:00Z',
    '2026-10-21T15:40:00Z'
  )
on conflict (id) do nothing;

-- =============================================================================
--  Fim do seed
-- =============================================================================
