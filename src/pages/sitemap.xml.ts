import type { APIRoute } from 'astro';

import { getHomeFeed } from '../lib/content';
import { CACHE_POLICIES, applyCacheHeaders } from '../lib/cache';

/**
 * GET /sitemap.xml
 * -----------------------------------------------------------------------------
 * Sitemap geral do portal: paginas fixas + todas as materias publicadas.
 */
export const GET: APIRoute = async ({ locals, site, url }) => {
  const feed = await getHomeFeed(locals);
  const base = (site?.toString().replace(/\/$/, '') ?? url.origin).replace(/\/$/, '');

  const escape = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const staticPages = [
    { loc: `${base}/`, priority: '1.0', changefreq: 'hourly' },
    { loc: `${base}/busca`, priority: '0.4', changefreq: 'weekly' },
  ];

  const staticXml = staticPages
    .map(
      (page) => `  <url>
    <loc>${escape(page.loc)}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
    )
    .join('\n');

  const articlesXml = feed.articles
    .slice(0, 5000)
    .map((article) => {
      const lastmod = (article.updated_at ?? article.published_at ?? '').slice(0, 10);

      return `  <url>
    <loc>${escape(`${base}/materia/${article.slug}`)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${articlesXml}
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
