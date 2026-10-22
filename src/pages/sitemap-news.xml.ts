import type { APIRoute } from 'astro';

import { getHomeFeed } from '../lib/content';
import { CACHE_POLICIES, applyCacheHeaders } from '../lib/cache';

/**
 * GET /sitemap-news.xml
 * -----------------------------------------------------------------------------
 * Sitemap de Noticias no formato exigido pelo Google Noticias (News Sitemap).
 *
 * Regras do Google:
 *  - apenas URL's publicadas nas **ultimas 48 horas**;
 *  - no maximo 1000 URL's por sitemap;
 *  - cada URL precisa de `<news:news>` com `publication`, `publication_date`
 *    (W3C datetime) e `title`.
 *
 * O arquivo e' gerado dinamicamente a cada requisicao, sempre com os ultimos
 * 2 dias de materias.
 */
export const GET: APIRoute = async ({ locals, site, url }) => {
  const feed = await getHomeFeed(locals);
  const base = (site?.toString().replace(/\/$/, '') ?? url.origin).replace(/\/$/, '');

  const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;

  const recent = feed.articles
    .filter((article) => {
      if (!article.published_at) return false;
      const published = new Date(article.published_at).getTime();
      return published >= twoDaysAgo && published <= Date.now() + 60_000;
    })
    .sort(
      (a, b) =>
        new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime(),
    )
    .slice(0, 1000);

  const escape = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const urls = recent
    .map((article) => {
      const publishedAt = new Date(article.published_at ?? Date.now()).toISOString();

      return `  <url>
    <loc>${escape(`${base}/materia/${article.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>O Nioaquense</news:name>
        <news:language>pt-BR</news:language>
      </news:publication>
      <news:publication_date>${publishedAt}</news:publication_date>
      <news:title>${escape(article.title)}</news:title>
    </news:news>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;

  return applyCacheHeaders(
    new Response(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'X-Robots-Tag': 'noindex',
      },
    }),
    CACHE_POLICIES.seo,
  );
};
