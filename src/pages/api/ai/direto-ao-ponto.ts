import type { APIRoute } from 'astro';

import { readPayload, requireSession, toErrorResponse } from '../../../lib/api';
import { isAdmin } from '../../../lib/auth';

/**
 * POST /api/ai/direto-ao-ponto
 * -----------------------------------------------------------------------------
 * Gera os 3 topicos do "Direto ao Ponto" a partir do texto da materia,
 * usando Cloudflare Workers AI (Gemini 1.5 Flash).
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    if (!isAdmin(session)) throw new Error('Acesso negado');

    const payload = await readPayload(request);
    const text = String(payload.text ?? '').trim();
    if (!text) throw new Error('Texto vazio');

    const apiKey =
      (locals as any)?.runtime?.env?.GEMINI_API_KEY ??
      (locals as any)?.runtime?.env?.GOOGLE_API_KEY;
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
                  text: `Voce e um editor jornalistico. Leia o texto abaixo e crie EXATAMENTE 3 topicos curtos (maximo 15 palavras cada) para o "Direto ao Ponto" de uma noticia de Nioaque-MS. Retorne APENAS os 3 topicos, um por linha, sem numeracao, sem bullets, sem marcadores, sem texto adicional.\n\nTexto:\n${text}`,
                },
              ],
            },
          ],
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const data = await res.json();
    const raw: string = String(data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '');

    const bullets = raw
      .split('\n')
      .map((line) => line.replace(/^[-•\*\d.\s]+/, '').trim())
      .filter((line) => line.length > 0)
      .slice(0, 3);

    return new Response(JSON.stringify({ bullets }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
};
