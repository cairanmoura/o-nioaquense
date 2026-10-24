import type { APIRoute } from 'astro';

import { readPayload, requireSession, toErrorResponse } from '../../../lib/api';
import { isAdmin } from '../../../lib/auth';
import { runAI } from '../../../lib/ai';

/**
 * POST /api/ai/rewrite
 * -----------------------------------------------------------------------------
 * Reescreve um texto com estilo jornalistico usando Cloudflare Workers AI
 * (prioridade) ou Google Gemini 2.5-flash (fallback).
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    if (!isAdmin(session)) throw new Error('Acesso negado');

    const payload = await readPayload(request);
    const text = String(payload.text ?? '').trim();
    if (!text) throw new Error('Texto vazio');

    const env = (locals as any)?.runtime?.env ?? {};
    const result = await runAI(
      `Voce e um editor jornalistico. Reescreva o texto fornecido em portugues, com estilo de noticia imparcial, clara e objetiva, mantendo os fatos. Retorne apenas o texto reescrito.\n\nTexto:\n${text}`,
      env,
    );

    return new Response(JSON.stringify({ rewritten: result.text, provider: result.provider }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
};
