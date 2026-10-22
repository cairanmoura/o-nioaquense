import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../../lib/api';
import { createColumnist, type ColumnistInput } from '../../../../lib/admin';

/**
 * POST /api/admin/profiles
 * -----------------------------------------------------------------------------
 * Cadastro de um novo colunista (somente Editor-Chefe).
 * O usuario e' criado no Supabase Auth; o perfil recebe o papel `columnist`.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    const payload = await readPayload(request);

    const input: ColumnistInput = {
      full_name: String(payload.full_name ?? ''),
      email: String(payload.email ?? ''),
      column_name: payload.column_name ? String(payload.column_name) : null,
      bio: payload.bio ? String(payload.bio) : null,
      can_publish_directly: Boolean(payload.can_publish_directly),
    };

    const profile = await createColumnist(locals, session, input);
    return jsonOk({ profile }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
};
