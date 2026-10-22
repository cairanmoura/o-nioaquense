import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../../lib/api';
import { updateColumnist } from '../../../../lib/admin';

/**
 * POST /api/admin/profiles/[id]
 * -----------------------------------------------------------------------------
 * Atualiza um colunista (somente Editor-Chefe):
 *   - `can_publish_directly` : chave "Pode publicar direto sem revisao"
 *   - `active`               : ativa/desativa o acesso
 *   - `column_name`          : nome da coluna
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const session = requireSession(locals);
    const id = params.id ?? '';

    const payload = await readPayload(request);

    const patch: {
      can_publish_directly?: boolean;
      active?: boolean;
      column_name?: string | null;
    } = {};

    if (payload.can_publish_directly !== undefined) {
      patch.can_publish_directly = Boolean(payload.can_publish_directly);
    }
    if (payload.active !== undefined) {
      patch.active = Boolean(payload.active);
    }
    if (payload.column_name !== undefined) {
      patch.column_name = payload.column_name ? String(payload.column_name) : null;
    }

    const profile = await updateColumnist(locals, session, id, patch);
    return jsonOk({ profile });
  } catch (error) {
    return toErrorResponse(error);
  }
};
