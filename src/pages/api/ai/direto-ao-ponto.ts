import type { APIRoute } from 'astro';

import { readPayload, requireSession, toErrorResponse } from '../../../lib/api';
import { isAdmin } from '../../../lib/auth';
import { runAI } from '../../../lib/ai';

/**
 * POST /api/ai/direto-ao-ponto
 * -----------------------------------------------------------------------------
 * Gera os 3 topicos do "Direto ao Ponto" a partir do texto da materia,
 * usando Cloudflare Workers AI (prioridade) ou Gemini 2.5-flash (fallback).
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
      `Voce e um editor jornalistico. Leia o texto abaixo e crie EXATAMENTE 3 topicos curtos (maximo 15 palavras cada) para o "Direto ao Ponto" de uma noticia de Nioaque-MS. Retorne APENAS os 3 topicos, um por linha, sem numeracao, sem bullets, sem marcadores, sem texto adicional.\n\nTexto:\n${text}`,
      env,
    );

    const bullets = result.text
      .split('\n')
      .map((line) => line.replace(/^[-•\*\d.\s]+/, '').trim())
      .filter((line) => line.length > 0)
      .slice(0, 3);

    return new Response(JSON.stringify({ bullets, provider: result.provider }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
};
