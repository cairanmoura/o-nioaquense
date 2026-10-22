-- =============================================================================
--  O Nioaquense - Etapa 3 | Mídia enviada pelo leitor (Boca no Trombone)
-- -----------------------------------------------------------------------------
--  Bucket para as fotos anexadas nas pistas do leitor. Os caminhos usam UUID,
--  o que torna as URLs praticamente impossiveis de adivinhar.
--
--  Este arquivo e' idempotente: pode ser reaplicado sem erro.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pistas',
  'pistas',
  true,
  5242880,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura publica (as fotos aparecem no painel de pistas)
drop policy if exists "pistas_leitura_publica" on storage.objects;
create policy "pistas_leitura_publica"
  on storage.objects for select
  using (bucket_id = 'pistas');

-- Escrita: apenas quem esta autenticado (o upload acontece no servidor, com a
-- service role, a partir do endpoint /api/leitores).
drop policy if exists "pistas_equipe_envia" on storage.objects;
create policy "pistas_equipe_envia"
  on storage.objects for insert
  with check (
    bucket_id = 'pistas'
    and auth.role() in ('authenticated', 'service_role')
  );

drop policy if exists "pistas_equipe_remove" on storage.objects;
create policy "pistas_equipe_remove"
  on storage.objects for delete
  using (
    bucket_id = 'pistas'
    and auth.role() in ('authenticated', 'service_role')
  );

-- ---------------------------------------------------------------------------
--  View de apoio: pistas com os dados do leitor ja normalizados
-- ---------------------------------------------------------------------------
create or replace view public.reader_inbox as
select
  s.id,
  s.sender_name,
  s.sender_whatsapp,
  s.neighborhood,
  s.message,
  s.media_urls,
  s.status,
  s.created_at
from public.reader_submissions s
order by s.created_at desc;

grant select on public.reader_inbox to authenticated;
