import type { APIRoute } from 'astro';

import { readPayload, requireSession, toErrorResponse } from '../../../lib/api';
import { isAdmin } from '../../../lib/auth';
import { extractFromUrl } from '../../../lib/extractor';
import { mirrorImageToStorage, proxied, isSafeRemoteUrl } from '../../../lib/media';
import { rewriteArticle } from '../../../lib/rewrite';
import { detectLocalTags, routeScope, detectCategory } from '../../../lib/rss';

/**
 * POST /api/ai/curate
 * -----------------------------------------------------------------------------
 * Curadoria manual: recebe a URL de uma noticia, extrai o corpo LIMPO
 * (linkedom + Readability, com fallback por seletores e Jina Reader), pega a
 * capa (og:image) e as fotos internas SO do corpo da materia, e reescreve com
 * IA (Gemini principal, Workers AI de reserva) devolvendo JSON estruturado.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    if (!isAdmin(session)) throw new Error('Acesso negado');

    const payload = await readPayload(request);
    const url = String(payload.url ?? '').trim();
    if (!url || !isSafeRemoteUrl(url)) throw new Error('URL inválida');
    // Ja importada? (mesmo source_url)
    const sb = (locals as any).supabase;
    if (sb) {
      const { data: dup } = await sb.from('articles').select('id,status').eq('source_url', url).maybeSingle();
      if (dup) throw new Error(`Já importada (${dup.status === 'draft' ? 'em rascunho' : dup.status}).`);
    }
    const hostname = new URL(url).hostname.replace(/^www\./, '');

    const article = await extractFromUrl(url, hostname);
    if (!article || article.text.length < 200) {
      throw new Error('Não foi possível extrair o texto desta página (bloqueio do portal ou página sem matéria).');
    }

    const sourceName = article.siteName ?? hostname;
    const env = (locals as any)?.runtime?.env ?? {};

    const tags = detectLocalTags(`${article.title} ${article.text.slice(0, 3000)}`);
    const nioaqueHint =
      tags.length > 1 && tags.some((t: string) => /nioaque/i.test(t))
        ? 'Esta matéria cita Nioaque e outras cidades: puxe o foco do título e do primeiro parágrafo para o impacto em Nioaque.'
        : undefined;

    const rewritten = await rewriteArticle(
      { text: article.text, sourceName, sourceUrl: url, extraInstruction: nioaqueHint },
      env,
    );

    // Capa espelhada no nosso Storage (evita hotlink/mixed content); se falhar, segue com a original via proxy
    let coverStored: string | null = null;
    if (article.coverImage && (locals as any).supabase) {
      coverStored = await mirrorImageToStorage((locals as any).supabase, article.coverImage, url);
    }

    return new Response(
      JSON.stringify({
        title: rewritten.title,
        subtitle: rewritten.subtitle,
        summary_bullets: rewritten.summary_bullets,
        content_html: rewritten.content_html,
        suggested_category: rewritten.suggested_category ?? detectCategory(rewritten.title),
        scope: routeScope(tags, ''),
        local_tags: tags,
        cover: article.coverImage
          ? {
              original: article.coverImage,
              stored: coverStored,
              preview: coverStored ?? proxied(article.coverImage, url),
              caption: article.coverCaption,
            }
          : null,
        images: article.images.map((i) => ({
          original: i.url,
          preview: proxied(i.url, url),
          caption: i.caption,
        })),
        source: { name: sourceName, url },
        extraction: article.via,
        provider: rewritten.provider,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return toErrorResponse(err);
  }
};
