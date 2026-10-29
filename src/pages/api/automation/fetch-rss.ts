import type { APIRoute } from 'astro';

import { readPayload, requireSession, toErrorResponse } from '../../../lib/api';
import { isAdmin } from '../../../lib/auth';
import {
  extractRssImage,
  fetchHtmlCoverImage,
  resolveImageUrl,
  extractInternalImages,
  detectLocalTags,
  routeScope,
  detectCategory,
  REGION_CITIES,
} from '../../../lib/rss';

/**
 * POST /api/automation/fetch-rss
 * -----------------------------------------------------------------------------
 * Extrator avançado de fotos reais e mídias.
 *
 * Recebe o XML do RSS (ou a URL do feed) e, para cada item, extrai:
 *   1º) Tags de mídia no XML (media:content, enclosure, img em content:encoded/description)
 *   2º) fetch do HTML da URL original (User-Agent de navegador real) → og:image / twitter-image / primeira img de <article> ou <figure>
 *   3º) Legenda/crédito (<figcaption> ou alt da imagem, ou "Foto: Reprodução / [Nome da Fonte]")
 *   4º) Conversão de URL relativa para absoluta usando o domínio da fonte
 *
 * Aplica classificacao geografica (scope + local_tags) e tematica (category_label).
 *
 * Retorna, para cada item: título, link, descrição, data, cover_image_url,
 * cover_image_caption, local_tags, scope, category_label e internal_images.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    if (!isAdmin(session)) throw new Error('Acesso negado');

    const payload = await readPayload(request);
    const { url, rssUrl, sourceName = 'Fonte' } = payload as {
      url?: string;
      rssUrl?: string;
      sourceName?: string;
    };

    const feedUrl = rssUrl || url;
    if (!feedUrl) throw new Error('URL ou RSS não informado');

    // Busca o XML do RSS
    const res = await fetch(feedUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
    } as RequestInit);

    if (!res.ok) throw new Error(`Falha ao buscar RSS: ${res.status}`);
    const xml = await res.text();

    // Extrai itens do RSS
    const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
    const items: Array<{
      title: string;
      link: string;
      description: string;
      pubDate: string;
      cover_image_url: string | null;
      cover_image_caption: string | null;
      local_tags: string[];
      scope: string;
      category_label: string;
      internal_images: Array<{ url: string; caption: string }>;
    }> = [];

    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];
      const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
        block.match(/<title>(.*?)<\/title>/))?.[1]?.trim();
      const link = (block.match(/<link>(.*?)<\/link>/) ||
        block.match(/<link\s+href="(.*?)"/))?.[1]?.trim();
      const rawDesc = (block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
        block.match(/<description>(.*?)<\/description>/))?.[1]?.trim();
      const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/))?.[1]?.trim();

      if (!title || !link) continue;

      // Classificacao geografica
      const fullText = `${title} ${rawDesc ?? ''}`;
      const localTags = detectLocalTags(fullText);
      const scope = routeScope(localTags, sourceName);
      const categoryLabel = detectCategory(title);

      // 1º) Imagem no próprio RSS
      let coverImage = extractRssImage(block, feedUrl);
      let coverCaption: string | null = null;

      // 2º) Buscar HTML da matéria original para og:image / twitter-image
      if (!coverImage) {
        const htmlCover = await fetchHtmlCoverImage(link, feedUrl);
        if (htmlCover.url) {
          coverImage = htmlCover.url;
          coverCaption = htmlCover.caption;
        }
      }

      if (!coverImage) {
        coverCaption = null;
      } else if (!coverCaption) {
        coverCaption = `Foto: Reprodução / ${sourceName}`;
      }

      // 3º/4º) Fotos internas da matéria original
      const internalImages: Array<{ url: string; caption: string }> = [];
      try {
        const pageRes = await fetch(link, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          },
        } as RequestInit);
        if (pageRes.ok) {
          const html = await pageRes.text();
          const internal = extractInternalImages(html, feedUrl, sourceName);
          for (const img of internal) {
            if (img.url === coverImage) continue;
            internalImages.push(img);
          }
        }
      } catch {
        // ignora erro de extração de fotos internas
      }

      items.push({
        title,
        link,
        description: rawDesc ?? '',
        pubDate: pubDate ?? new Date().toISOString(),
        cover_image_url: coverImage ?? null,
        cover_image_caption: coverCaption,
        local_tags: localTags,
        scope,
        category_label: categoryLabel,
        internal_images: internalImages,
      });
    }

    return new Response(JSON.stringify({ ok: true, items, count: items.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
};

export const GET = POST;
