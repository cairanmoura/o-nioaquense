import type { APIRoute } from 'astro';

import { readPayload, requireSession, toErrorResponse } from '../../../lib/api';
import { isAdmin } from '../../../lib/auth';
import { runAI } from '../../../lib/ai';
import {
  fetchHtmlCoverImage,
  extractInternalImages,
} from '../../../lib/rss';

/**
 * POST /api/ai/curate
 * -----------------------------------------------------------------------------
 * Recebe uma URL de notícia de site privado, extrai o texto e gera uma versão
 * inédita com IA para Nioaque-MS, citando a fonte original. Também extrai a
 * foto de capa (og:image) e todas as fotos internas da matéria original.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    if (!isAdmin(session)) throw new Error('Acesso negado');

    const payload = await readPayload(request);
    const url = String(payload.url ?? '').trim();
    if (!url) throw new Error('URL vazia');

    // Extrai o HTML da URL original
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    } as RequestInit);
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

    // Extrai imagem de sugestão (og:image / twitter:image / primeira img)
    const cover = await fetchHtmlCoverImage(url, url);

    // Extrai fotos internas da matéria original
    const internalImages = extractInternalImages(html, url, 'Fonte');

    const env = (locals as any)?.runtime?.env ?? {};
    const result = await runAI(
      `Você é um editor jornalístico. Reescreva o texto fornecido como uma notícia inédita e imparcial para a cidade de Nioaque-MS. Crie: 1) um título, 2) um resumo de 3 tópicos, 3) o corpo da notícia. Cite a fonte original no final. Retorne em formato estruturado.\n\nURL: ${url}\n\nTexto original:\n${text}`,
      env,
    );

    return new Response(
      JSON.stringify({
        draft: result.text,
        suggestedImage: cover.url ?? null,
        coverImage: cover.url ?? null,
        coverCaption: cover.caption ?? null,
        internalImages,
        sourceUrl: url,
        provider: result.provider,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
};
