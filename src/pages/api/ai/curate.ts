import type { APIRoute } from 'astro';

import { readPayload, requireSession, toErrorResponse } from '../../../lib/api';
import { isAdmin } from '../../../lib/auth';
import { runAI } from '../../../lib/ai';

/**
 * POST /api/ai/curate
 * -----------------------------------------------------------------------------
 * Recebe uma URL de noticia de site privado, extrai o texto e gera uma versao
 * inedita com IA para Nioaque-MS, citando a fonte original.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    if (!isAdmin(session)) throw new Error('Acesso negado');

    const payload = await readPayload(request);
    const url = String(payload.url ?? '').trim();
    if (!url) throw new Error('URL vazia');

    // Extrai o HTML da URL original
    const pageRes = await fetch(url, { headers: { 'User-Agent': 'O-Nioaquense-Bot/1.0' } });
    if (!pageRes.ok) throw new Error(`Falha ao buscar URL: ${pageRes.status}`);
    const html = await pageRes.text();

    // Extrai texto (remove tags)
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000);

    // Extrai imagem de sugestao
    const imgMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    const suggestedImage = imgMatch?.[1] ?? null;

    const env = (locals as any)?.runtime?.env ?? {};
    const result = await runAI(
      `Voce e um editor jornalistico. Reescreva o texto fornecido como uma noticia inedita e imparcial para a cidade de Nioaque-MS. Crie: 1) um titulo, 2) um resumo de 3 topicos, 3) o corpo da noticia. Cite a fonte original no final. Retorne em formato estruturado.\n\nURL: ${url}\n\nTexto original:\n${text}`,
      env,
    );

    return new Response(
      JSON.stringify({ draft: result.text, suggestedImage, sourceUrl: url, provider: result.provider }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
};
