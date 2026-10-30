import type { APIRoute } from 'astro';

import { scrapeSource, fetchPageHtml, extractArticleLinks, parseArticlePage, BROWSER_HEADERS } from '../../../lib/scraper';
import {
  detectLocalTags,
  routeScope,
  isGoogleNewsFeed,
  parseGoogleNewsItems,
  resolveGoogleNewsUrl,
  fetchGoogleNewsFeed,
  isBingNewsFeed,
  parseBingNewsItems,
} from '../../../lib/rss';

/**
 * GET /api/debug/scrape?url=...&limit=5
 * -----------------------------------------------------------------------------
 * TESTE temporario do web scraper / Google News. Protegido por x-cron-secret.
 *
 * Se `url` for um feed do Google News (news.google.com/rss/...), testa o
 * pipeline completo: parse do feed -> resolucao do redirect -> pagina real.
 * Caso contrario, testa o scraper da pagina inicial (links + materias).
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const env = (locals as any)?.runtime?.env ?? {};
  const secret = request.headers.get('x-cron-secret');
  if (!env.CRON_SECRET || secret !== env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const u = new URL(request.url);
  const target = u.searchParams.get('url');
  const limit = Number(u.searchParams.get('limit') ?? 5);
  const sourceName = u.searchParams.get('name') ?? 'Teste';

  if (!target) {
    return new Response(JSON.stringify({ error: 'url obrigatorio' }), { status: 400 });
  }

  // --- Modo Google/Bing News: feed -> (resolve redirects) -> pagina real ---
  if (isGoogleNewsFeed(target) || isBingNewsFeed(target)) {
    let feedStatus = 0;
    let feedError = '';
    let xml = '';
    const attempts: Record<string, string> = {};
    try {
      // Tenta fetch direto e depois cada proxy, registrando o resultado
      const tryDirect = async () => {
        try {
          const res = await fetch(target, {
            headers: {
              ...BROWSER_HEADERS,
              Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
            },
          } as RequestInit);
          attempts.direct = String(res.status);
          return res.ok ? await res.text() : '';
        } catch (e: any) {
          attempts.direct = `ERR ${e?.message}`;
          return '';
        }
      };
      const tryRss2json = async () => {
        try {
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(target)}`, {
            headers: { ...BROWSER_HEADERS, Accept: 'application/json' },
          } as RequestInit);
          attempts.rss2json = String(res.status);
          if (!res.ok) return '';
          const data = await res.json();
          if (data?.status !== 'ok' || !Array.isArray(data?.items)) return '';
          return (
            '<rss>' +
            data.items
              .map(
                (it: any) =>
                  `<item><title><![CDATA[${it.title ?? ''}]]></title><link>${it.link ?? ''}</link>` +
                  `<pubDate>${it.pubDate ?? ''}</pubDate></item>`,
              )
              .join('') +
            '</rss>'
          );
        } catch (e: any) {
          attempts.rss2json = `ERR ${e?.message}`;
          return '';
        }
      };
      const tryCorslol = async () => {
        try {
          const res = await fetch(`https://api.cors.lol/?url=${encodeURIComponent(target)}`, {
            headers: BROWSER_HEADERS,
          } as RequestInit);
          attempts.corslol = String(res.status);
          return res.ok ? await res.text() : '';
        } catch (e: any) {
          attempts.corslol = `ERR ${e?.message}`;
          return '';
        }
      };

      xml = await tryDirect();
      if (!xml && isGoogleNewsFeed(target)) {
        // Bing News funciona direto; so' o Google News precisa de proxies
        xml = await tryRss2json();
        if (!xml) xml = await tryCorslol();
      }
      feedStatus = xml ? 200 : 0;
    } catch (e: any) {
      feedError = String(e?.message ?? e);
    }

    const isBing = isBingNewsFeed(target);
    const items = isBing ? parseBingNewsItems(xml, limit) : parseGoogleNewsItems(xml, limit);

    const resolved: any[] = [];
    for (const item of items) {
      // Bing: o link ja e' a URL real da materia; Google: resolve o redirect
      const realUrl = isBing ? item.link : await resolveGoogleNewsUrl(item.link);
      let page: any = null;
      if (realUrl) {
        const html = await fetchPageHtml(realUrl);
        if (html) {
          const p = parseArticlePage(html, realUrl, sourceName);
          if (p) {
            page = {
              title: p.title,
              cover_image_url: p.coverImageUrl,
              content_length: p.contentHtml?.length ?? 0,
            };
          }
        }
      }
      resolved.push({
        gn_title: item.title,
        source_url: item.sourceUrl,
        resolved_url: realUrl,
        page,
        local_tags: detectLocalTags(`${item.title} ${page?.title ?? ''}`),
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        mode: 'google-news',
        target,
        feed_ok: xml.length > 0,
        feed_status: feedStatus,
        attempts,
        feed_error: feedError || undefined,
        items: resolved,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 1) Testa a extracao de links da home
  const homeHtml = await fetchPageHtml(target);
  const links = homeHtml ? await extractArticleLinks(homeHtml, target, limit * 2) : [];

  // 2) Testa o scrape completo (materias)
  let articles: any[] = [];
  let scrapeError: string | null = null;
  try {
    const scraped = await scrapeSource(target, sourceName, limit);
    articles = scraped.map((a) => ({
      title: a.title,
      link: a.link,
      description: a.description?.slice(0, 200),
      pubDate: a.pubDate,
      cover_image_url: a.coverImageUrl,
      content_length: a.contentHtml?.length ?? 0,
      local_tags: detectLocalTags(`${a.title} ${a.description}`),
      scope: routeScope(detectLocalTags(`${a.title} ${a.description}`), sourceName),
    }));
  } catch (err: any) {
    scrapeError = err?.message;
  }

  return new Response(
    JSON.stringify({
      ok: true,
      target,
      home_fetched: Boolean(homeHtml),
      links_found: links.length,
      links: links.slice(0, 10),
      articles,
      scrape_error: scrapeError,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
