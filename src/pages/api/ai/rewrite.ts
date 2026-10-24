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

    const apiKey = (locals as any)?.runtime?.env?.GEMINI_API_KEY ?? (locals as any)?.runtime?.env?.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Google Gemini API key nao configurada (GEMINI_API_KEY)');

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Voce e um editor jornalistico. Reescreva o texto fornecido em portugues, com estilo de noticia imparcial, clara e objetiva, mantendo os fatos. Retorne apenas o texto reescrito.\n\nTexto:\n${text}`,
                },
              ],
            },
          ],
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const data = await res.json();
    const rewritten = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return new Response(JSON.stringify({ rewritten }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
};
