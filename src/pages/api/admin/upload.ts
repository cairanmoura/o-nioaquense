import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../lib/api';
import { demoStore } from '../../../lib/demo-store';
import { isSupabaseConfigured } from '../../../lib/auth';

/**
 * POST /api/admin/upload
 * -----------------------------------------------------------------------------
 * Upload da imagem de capa.
 *
 * A compressao para WebP acontece **no cliente** (canvas), antes de qualquer
 * bytes irem para a rede. Aqui o servidor apenas recebe o arquivo ja
 * otimizado e guarda:
 *
 *  - com Supabase: no bucket `covers` (Storage), devolvendo a URL publica;
 *  - sem Supabase: no armazenamento em memoria do modo demonstracao.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    requireSession(locals);

    const payload = await readPayload(request);
    const dataUrl = String(payload.dataUrl ?? '');

    if (!dataUrl.startsWith('data:')) {
      return jsonOk({ error: 'Arquivo invalido.' }, 400);
    }

    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
      return jsonOk({ error: 'Arquivo invalido.' }, 400);
    }

    const mime = match[1]!;
    const base64 = match[2]!;

    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const sizeKb = Math.round(bytes.byteLength / 1024);

    if (isSupabaseConfigured(locals)) {
      const supabase = locals.supabase!;
      const extension = mime.includes('webp') ? 'webp' : mime.includes('png') ? 'png' : 'jpg';
      const path = `covers/${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage.from('covers').upload(path, bytes, {
        contentType: mime,
        upsert: false,
      });

      if (error) {
        return jsonOk({ error: `Falha no upload: ${error.message}` }, 500);
      }

      const { data: publicUrl } = supabase.storage.from('covers').getPublicUrl(path);

      return jsonOk({ url: publicUrl.publicUrl, sizeKb });
    }

    /* ---- Modo demonstracao ---- */
    const id = crypto.randomUUID();
    demoStore.saveAsset(id, mime, dataUrl);

    return jsonOk({ url: `/api/demo/asset/${id}`, sizeKb, demo: true });
  } catch (error) {
    return toErrorResponse(error);
  }
};
