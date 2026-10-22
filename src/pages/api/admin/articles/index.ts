import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../../lib/api';
import { saveArticle, type ArticleInput } from '../../../../lib/admin';
import type { ArticleScope, ArticleStatus } from '../../../../lib/types';

/**
 * POST /api/admin/articles
 * -----------------------------------------------------------------------------
 * Cria ou atualiza uma materia.
 *
 * O status final e' resolvido NO SERVIDOR (`resolveStatus`): um colunista sem
 * `can_publish_directly` nunca consegue publicar - o pedido e' rebaixado para
 * `pending_review`.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    const payload = await readPayload(request);

    const input: ArticleInput = {
      id: payload.id ? String(payload.id) : undefined,
      title: String(payload.title ?? ''),
      subtitle: payload.subtitle ? String(payload.subtitle) : null,
      slug: payload.slug ? String(payload.slug) : null,
      summary_bullets: Array.isArray(payload.summary_bullets)
        ? (payload.summary_bullets as string[])
        : [],
      content: String(payload.content ?? ''),
      cover_image_url: payload.cover_image_url ? String(payload.cover_image_url) : null,
      cover_image_caption: payload.cover_image_caption ? String(payload.cover_image_caption) : null,
      scope: (payload.scope ?? 'nioaque') as ArticleScope,
      category_label: payload.category_label ? String(payload.category_label) : null,
      is_breaking: Boolean(payload.is_breaking),
      is_featured: Boolean(payload.is_featured),
      status: payload.status ? (String(payload.status) as ArticleStatus) : 'draft',
    };

    const { article, coerced } = await saveArticle(locals, session, input);

    return jsonOk({
      article,
      coerced,
      message: coerced
        ? 'Sua coluna nao pode publicar direto: o texto foi enviado para a revisao do Editor-Chefe.'
        : undefined,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
};
