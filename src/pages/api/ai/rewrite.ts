import type { APIRoute } from 'astro';

import { readPayload, requireSession, toErrorResponse } from '../../../lib/api';
import { isAdmin } from '../../../lib/auth';

/**
 * POST /api/ai/rewrite
 * -----------------------------------------------------------------------------
 * Reescreve um texto com estilo jornalistico usando Cloudflare Workers AI
 * (Llama 3.1 8B). Usado pelo botao "Reescrever com IA" no editor.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    if (!isAdmin(session)) throw new Error('Acesso negado');

    const payload = await readPayload(request);
    const text = String(payload.text ?? '').trim();
    if (!text) throw new Error('Texto vazio');

    const ai = (locals as any)?.runtime?.env?.AI;
    if (!ai) throw new Error('Workers AI nao configurado');

    const result = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content:
            'Voce e um editor jornalistico. Reescreva o texto fornecido em portugues, com estilo de noticia imparcial, clara e objetiva, mantendo os fatos. Retorne apenas o texto reescrito.',
        },
        { role: 'user', content: text },
      ],
    });

    const rewritten = result?.response ?? result?.result ?? '';
    return new Response(JSON.stringify({ rewritten }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
};
