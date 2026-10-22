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

  /**
   * Paginas fixas publicas.
   *
   * `/busca` nao entra: o `robots.txt` bloqueia essa rota, e uma URL no
   * sitemap que o robo pede para nao indexar e um sinal contraditorio.
   */
  const staticPages = [
    { loc: `${base}/`, priority: '1.0', changefreq: 'hourly' },
    { loc: `${base}/editoria/nioaque`, priority: '0.9', changefreq: 'hourly' },
    { loc: `${base}/radar-oficial`, priority: '0.9', changefreq: 'daily' },
    { loc: `${base}/colunistas`, priority: '0.7', changefreq: 'weekly' },
    { loc: `${base}/editoria/coluna`, priority: '0.8', changefreq: 'daily' },
    { loc: `${base}/editoria/ms`, priority: '0.8', changefreq: 'daily' },
    { loc: `${base}/editoria/brasil`, priority: '0.8', changefreq: 'daily' },
    { loc: `${base}/mande-sua-noticia`, priority: '0.6', changefreq: 'monthly' },
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

  /** Paginas individuais dos colunistas. */
  const columnistXml = feed.profiles
    .filter((profile) => profile.role === 'columnist' && profile.active)
    .map(
      (profile) => `  <url>
    <loc>${escape(`${base}/colunistas/${profile.slug}`)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`,
    )
    .join('\n');

  const articlesXml = feed.articles
    .slice(0, 5000)
    .map((article) => {
      const lastmod = (article.updated_at ?? article.published_at ?? '').slice(0, 10);

      return `  <url>
    <loc>${escape(`${base}/noticia/${article.slug}`)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${columnistXml}
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
