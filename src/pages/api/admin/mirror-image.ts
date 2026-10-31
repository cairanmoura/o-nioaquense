import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../lib/api';
import { isAdmin } from '../../../lib/auth';
import { mirrorImageToStorage } from '../../../lib/media';

/** POST /api/admin/mirror-image { url, ref } -> sobe a foto para o Supabase Storage e devolve a URL propria. */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    if (!isAdmin(session)) throw new Error('Acesso negado');
    const payload = await readPayload(request);
    const url = String(payload.url ?? '');
    const ref = payload.ref ? String(payload.ref) : undefined;
    const stored = await mirrorImageToStorage((locals as any).supabase, url, ref);
    if (!stored) return jsonOk({ error: 'Não foi possível baixar/subir a foto.' }, 502);
    return jsonOk({ url: stored });
  } catch (error) {
    return toErrorResponse(error);
  }
};
