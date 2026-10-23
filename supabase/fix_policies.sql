-- =============================================================================
--  O Nioaquense - Patch de RLS, funcoes e triggers
-- -----------------------------------------------------------------------------
--  Use quando as TABELAS e os DADOS ja existem e falta a camada de seguranca.
--  E idempotente: pode rodar quantas vezes quiser.
--
--  Arquivo canonico (schema + dados): supabase/seed_complete.sql
-- =============================================================================

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
