import type { APIRoute } from 'astro';

import { CACHE_POLICIES, applyCacheHeaders } from '../lib/cache';

/**
 * GET /robots.txt
 * -----------------------------------------------------------------------------
 * O painel e as APIs ficam bloqueados para indexacao; os sitemaps sao
 * declarados (o de noticias em particular, para o Google Noticias).
 */
export const GET: APIRoute = async ({ site, url }) => {
  const base = (site?.toString().replace(/\/$/, '') ?? url.origin).replace(/\/$/, '');

  const body = `# O Nioaquense - onioaquense.com
User-agent: *
Allow: /

# Painel administrativo e APIs: fora do indice
Disallow: /admin
Disallow: /admin/
Disallow: /api
Disallow: /api/

# Paginas internas
Disallow: /busca

# Google Noticias
User-agent: Googlebot-News
Allow: /materia/
Disallow: /admin

Sitemap: ${base}/sitemap.xml
Sitemap: ${base}/sitemap-news.xml
`;

  return applyCacheHeaders(
    new Response(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Robots-Tag': 'noindex',
      },
    }),
    CACHE_POLICIES.seo,
  );
};
