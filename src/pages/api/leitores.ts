import type { APIRoute } from 'astro';

import { demoStore } from '../../lib/demo-store';
import { createServiceClient, getSupabaseCredentials } from '../../lib/supabase/server';
import { jsonError, jsonOk } from '../../lib/api';

/**
 * POST /api/leitores
 * -----------------------------------------------------------------------------
 * Recebe a pista do morador (Boca no Trombone) e grava em
 * `public.reader_submissions`, com status `pending`.
 *
 * O corpo chega em JSON:
 *   { sender_name?, sender_whatsapp, neighborhood?, message, photos?: [dataUrl] }
 *
 * As fotos ja chegam comprimidas em WebP (o cliente faz a compressao antes de
 * enviar). O servidor grava no bucket `pistas` e devolve as URLs publicas.
 */

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

interface ReaderPayload {
  sender_name?: string;
  sender_whatsapp?: string;
  neighborhood?: string;
  message?: string;
  photos?: string[];
}

export const POST: APIRoute = async ({ request, locals }) => {
  let payload: ReaderPayload;

  try {
    payload = (await request.json()) as ReaderPayload;
  } catch {
    return jsonError('Não foi possível ler o formulário. Tente novamente.', 400);
  }

  const whatsapp = (payload.sender_whatsapp ?? '').replace(/\D/g, '');
  const message = (payload.message ?? '').trim();
  const senderName = (payload.sender_name ?? '').trim();
  const neighborhood = (payload.neighborhood ?? '').trim();

  if (whatsapp.length < 10) {
    return jsonError('Informe um WhatsApp com DDD e número.', 400);
  }

  if (message.length < 10) {
    return jsonError('Escreva um pouco mais sobre o que aconteceu.', 400);
  }

  const photos = (payload.photos ?? [])
    .filter((photo) => typeof photo === 'string' && photo.startsWith('data:'))
    .slice(0, MAX_PHOTOS);

  /* ---------------- Supabase configurado ---------------- */
  const credentials = getSupabaseCredentials(locals);

  if (credentials) {
    const client = createServiceClient(locals) ?? locals.supabase;
    if (!client) return jsonError('Serviço indisponível. Tente pelo WhatsApp.', 503);

    const mediaUrls: string[] = [];

    for (const dataUrl of photos) {
      const match = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(dataUrl);
      if (!match) continue;

      const mime = match[1]!;
      const bytes = Uint8Array.from(atob(match[2]!), (char) => char.charCodeAt(0));

      if (bytes.byteLength > MAX_PHOTO_BYTES) continue;

      const extension = mime.includes('webp') ? 'webp' : mime.includes('png') ? 'png' : 'jpg';
      const path = `pistas/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await client.storage
        .from('pistas')
        .upload(path, bytes, { contentType: mime, upsert: false });

      if (uploadError) continue;

      const { data: publicUrl } = client.storage.from('pistas').getPublicUrl(path);
      mediaUrls.push(publicUrl.publicUrl);
    }

    const { data, error } = await client
      .from('reader_submissions')
      .insert({
        sender_name: senderName || 'Anônimo',
        sender_whatsapp: whatsapp,
        neighborhood: neighborhood || null,
        message,
        media_urls: mediaUrls,
        status: 'pending',
      })
      .select('id')
      .maybeSingle();

    if (error) {
      return jsonError('Não foi possível registrar agora. Mande pelo WhatsApp.', 500);
    }

    return jsonOk({ ok: true, id: data?.id ?? null, photos: mediaUrls.length }, 201);
  }

  /* ---------------- Modo demonstracao (sem Supabase) ---------------- */
  const id = crypto.randomUUID();
  const storedPhotos: string[] = [];

  for (const dataUrl of photos) {
    const assetId = `${id}-${photos.indexOf(dataUrl)}`;
    demoStore.saveAsset(assetId, 'image/webp', dataUrl);
    storedPhotos.push(`/api/demo/asset/${assetId}`);
  }

  demoStore.createSubmission({
    id,
    sender_name: senderName || 'Anônimo',
    sender_whatsapp: whatsapp,
    neighborhood: neighborhood || null,
    message,
    media_urls: storedPhotos,
    status: 'pending',
    created_at: new Date().toISOString(),
  });

  return jsonOk({ ok: true, id, photos: storedPhotos.length, demo: true }, 201);
};
