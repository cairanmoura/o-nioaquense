import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../../lib/api';
import { publishArticle, returnArticleToDraft } from '../../../../lib/admin';

/**
 * POST /api/admin/articles/[id]
 * -----------------------------------------------------------------------------
 * Acoes sobre uma materia existente:
 *   - `publish` : aprova/publica em 1 clique (fila de revisao)
 *   - `draft`   : devolve o texto para rascunho
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const session = requireSession(locals);
    const id = params.id ?? '';

    const payload = await readPayload(request);
    const action = String(payload.action ?? 'publish');

    if (action === 'publish') {
      const article = await publishArticle(locals, session, id);
      return jsonOk({ article });
    }

    if (action === 'draft') {
      const article = await returnArticleToDraft(locals, session, id);
      return jsonOk({ article });
    }

    return jsonOk({ error: 'Acao desconhecida.' }, 400);
  } catch (error) {
    return toErrorResponse(error);
  }
};
