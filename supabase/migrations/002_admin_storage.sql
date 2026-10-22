-- =============================================================================
--  O Nioaquense - Etapa 4 | Storage (capas e avatares) e ajustes de admin
-- -----------------------------------------------------------------------------
--  Este arquivo e' idempotente: pode ser reaplicado sem erro.
-- =============================================================================

-- ---------------------------------------------------------------------------
--  Buckets publicos de imagens
--  - covers : imagem de capa das materias (WebP, ate 5 MB)
--  - avatars: fotos dos colunistas (WebP, ate 2 MB)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'covers',
    'covers',
    true,
    5242880,
    array['image/webp', 'image/jpeg', 'image/png']
  ),
  (
    'avatars',
    'avatars',
    true,
    2097152,
    array['image/webp', 'image/jpeg', 'image/png']
  )
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
--  Politicas do Storage
--  Leitura publica (as imagens do portal sao publicas por design).
--  Escrita restrita a quem esta autenticado (equipe editorial).
-- ---------------------------------------------------------------------------
drop policy if exists "storage_leitura_publica" on storage.objects;
create policy "storage_leitura_publica"
  on storage.objects for select
  using (bucket_id in ('covers', 'avatars'));

drop policy if exists "storage_equipe_envia" on storage.objects;
create policy "storage_equipe_envia"
  on storage.objects for insert
  with check (
    bucket_id in ('covers', 'avatars')
    and auth.role() in ('authenticated', 'service_role')
  );

drop policy if exists "storage_equipe_atualiza" on storage.objects;
create policy "storage_equipe_atualiza"
  on storage.objects for update
  using (
    bucket_id in ('covers', 'avatars')
    and auth.role() in ('authenticated', 'service_role')
  )
  with check (
    bucket_id in ('covers', 'avatars')
    and auth.role() in ('authenticated', 'service_role')
  );

drop policy if exists "storage_equipe_remove" on storage.objects;
create policy "storage_equipe_remove"
  on storage.objects for delete
  using (
    bucket_id in ('covers', 'avatars')
    and auth.role() in ('authenticated', 'service_role')
  );

-- ---------------------------------------------------------------------------
--  Views de apoio ao painel /admin
-- ---------------------------------------------------------------------------

-- Fila de revisao: textos enviados pelos colunistas aguardando o Editor-Chefe
create or replace view public.review_queue as
select
  a.id,
  a.title,
  a.subtitle,
  a.slug,
  a.summary_bullets,
  a.content,
  a.scope,
  a.category_label,
  a.created_at,
  p.id         as author_id,
  p.full_name  as author_name,
  p.column_name,
  p.avatar_url
from public.articles a
left join public.profiles p on p.id = a.author_id
where a.status = 'pending_review'
order by a.created_at asc;

grant select on public.review_queue to authenticated;

-- Visao consolidada do painel
create or replace view public.admin_overview as
select
  (select count(*) from public.articles where status = 'published')      as published,
  (select count(*) from public.articles where status = 'pending_review') as pending_review,
  (select count(*) from public.articles where status = 'draft')          as drafts,
  (select count(*) from public.reader_submissions where status = 'pending') as pending_submissions,
  (select count(*) from public.local_ads where active)                   as active_ads,
  (select count(*) from public.profiles where role = 'columnist')        as columnists;

grant select on public.admin_overview to authenticated;
