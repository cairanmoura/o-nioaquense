/**
 * src/lib/scraper.ts
 * -----------------------------------------------------------------------------
 * Web Scraper (raspador de HTML) para portais de noticias SEM RSS funcional.
 *
 * Muitos portais do MS (G1, Midiamax, TopMidiaNews, Primeira Pagina) nao
 * mantem mais feeds RSS publicos. Este modulo raspaga a pagina inicial do
 * portal, encontra os links das blocos de noticia, entra em cada materia e
 * extrai titulo, descricao, foto de capa (og:image) e conteudo completo.
 *
 * Estrategia anti-bloqueio (Cloudflare / firewalls):
 *   - User-Agent de Google Chrome atualizado
 *   - Headers Accept / Accept-Language / Sec-Fetch-* de navegador real
 *   - Sequestramos a resposta com HTMLRewriter (nativo do Cloudflare Workers)
 *     ou regex como fallback (dev local / Node)
 *
 * O Workers nao tem DOM nem cheerio; usamos HTMLRewriter para varrer os <a>
 * da pagina e regex apenas como fallback portavel.
 */

import { resolveImageUrl, stripHtml, decodeEntities } from './rss';

/* -------------------------------------------------------------------------- */
/* Tipagem do HTMLRewriter (Workers) — ausente nos tipos globais do projeto   */
/* -------------------------------------------------------------------------- */

declare global {
  // eslint-disable-next-line no-var
  var HTMLRewriter: any;
}

/* -------------------------------------------------------------------------- */
/* Headers de navegador (anti-bot)                                            */
/* -------------------------------------------------------------------------- */

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': CHROME_UA,
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8,en-US;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  // Evita que o servidor veja "sec-ch-ua" ausente e deduza um cliente nao-browser
  'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

/** Busca uma pagina com headers de navegador e devolve o HTML (ou null). */
export async function fetchPageHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
    } as RequestInit);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType && !contentType.includes('text/html')) return null;

    return await res.text();
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Extracao de links de noticias da pagina inicial                            */
/* -------------------------------------------------------------------------- */

/**
 * Heuristica: o link parece uma materia (nao uma categoria, tag, autor, pagina
 * interna, login, busca, arquivo estatico etc.).
 */
const EXCLUDE_PATH_RE =
  /\/(?:tag|tags|categoria|category|autor|author|page|pag|busca|search|login|cadastro|conta|wp-admin|wp-json|feed|rss|rss2|newsletter|podcast|video|videos|tv|publicidade|propaganda|anuncio|anuncios|cartas|comunidade|classificados|classificado|cinema|opiniao|editorial|termos|politica|privacidade|sobre|quem-somos|contato|fale-conco|resultados|promocao|promocoes|mercadinho|agenda|calendario|galeria|fotos|ultimas-noticias|ultimas|mais-lidas|mais-vistas|eleicoes|especial|especiais|cobertura|acervo|arquivo|podcast|parceiros|sitemap|robots)(?:\/|$|\?)/i;

const STATIC_EXT_RE = /\.(?:jpe?g|png|gif|svg|webp|pdf|css|js|mp4|mp3|woff2?|zip)(?:\?|$)/i;

/**
 * Sufixos de dominio multi-parte (ccTLDs compostos). Sem essa lista,
 * "campograndenews.com.br" teria registrable = "com.br" e o filtro de
 * dominio aceitaria QUALQUER site .com.br.
 */
const MULTI_PART_TLDS = [
  'com.br', 'gov.br', 'org.br', 'net.br', 'edu.br', 'art.br', 'blog.br', 'eco.br', 'emp.br', 'ind.br', 'mil.br', 'nom.br', 'tur.br',
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'net.uk', 'sch.uk',
  'com.au', 'net.au', 'org.au', 'gov.au', 'edu.au',
  'co.jp', 'ne.jp', 'or.jp', 'go.jp', 'ac.jp',
  'com.mx', 'org.mx', 'gob.mx', 'net.mx', 'edu.mx',
  'com.ar', 'org.ar', 'gob.ar', 'net.ar', 'edu.ar',
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn',
  'co.in', 'net.in', 'org.in', 'gov.in', 'ac.in',
];

/** Extrai o dominio registravel (ex.: campograndenews.com.br) de um hostname. */
export function registrableDomain(hostname: string): string {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  const lastTwo = parts.slice(-2).join('.');
  if (MULTI_PART_TLDS.includes(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return lastTwo;
}

/**
 * Varre o HTML da pagina inicial e devolve URLs absolutas de materias.
 *
 * No Cloudflare Workers usa HTMLRewriter (nativo, rapido, sem regex frageis);
 * em outros ambientes (dev local Node) cai para regex sobre os atributos href.
 */
export async function extractArticleLinks(html: string, baseUrl: string, maxLinks = 20): Promise<string[]> {
  const seen = new Set<string>();
  const results: string[] = [];
  const base = new URL(baseUrl);
  const baseRegistrable = registrableDomain(base.hostname);
  const basePath = base.pathname.replace(/\/+$/, '');

  const push = (rawHref: string) => {
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:')) {
      return;
    }
    let abs: string;
    try {
      abs = new URL(rawHref, baseUrl).toString();
    } catch {
      return;
    }
    if (!/^https?:\/\//i.test(abs)) return;

    const u = new URL(abs);
    // Aceita o proprio dominio e subdominios do mesmo dominio registravel
    if (registrableDomain(u.hostname) !== baseRegistrable) return;

    if (STATIC_EXT_RE.test(u.pathname)) return;
    if (EXCLUDE_PATH_RE.test(u.pathname)) return;

    // Normaliza: remove query/hash e barra final para deduplicar
    const path = u.pathname.replace(/\/+$/, '');
    const key = `${u.hostname.replace(/^www\./, '')}${path}`;
    if (seen.has(key)) return;
    seen.add(key);

    // Ignora a propria pagina inicial e secoes pai (ex.: /ms/ quando a home
    // e' /ms/mato-grosso-do-sul/) — nao sao materias.
    if (!path || path === basePath) return;
    if (basePath.startsWith(path)) return;

    // Exige pelo menos 2 segmentos de caminho (ex.: /cidade/titulo-da-materia)
    const segments = path.split('/').filter(Boolean);
    if (segments.length < 2) return;

    // Materia precisa de um "slug" razoavel (titulo, nao so data ou id curto).
    // Alguns portais (ex.: TopMidiaNews) põem um ID numerico no final
    // (/interior/titulo-da-materia/248378/); nesse caso o slug e' o penultimo
    // segmento e o ultimo e' descartado.
    const lastSegment = segments[segments.length - 1];
    const slugCandidate = /^\d{4,}$/.test(lastSegment)
      ? (segments[segments.length - 2] ?? '')
      : lastSegment;
    if (slugCandidate.length < 15) return;

    results.push(abs);
  };

  if (typeof HTMLRewriter !== 'undefined') {
    // Cloudflare Workers: varredura nativa do DOM
    const rewriter = new HTMLRewriter('a[href]');
    rewriter.on('a', {
      element(el: any) {
        const href = el.getAttribute('href');
        if (href) push(href);
      },
    });
    // HTMLRewriter consome um Response; transformamos o HTML e descartamos o resultado
    await rewriter.transform(new Response(html)).text();
  } else {
    // Fallback portavel (dev local / Node): regex nos atributos href
    for (const m of html.matchAll(/<a[^>]+href=["']([^"']+)["']/gi)) {
      push(m[1]);
      if (results.length >= maxLinks * 2) break;
    }
  }

  return results.slice(0, maxLinks);
}

/* -------------------------------------------------------------------------- */
/* Extracao de detalhes de uma materia                                        */
/* -------------------------------------------------------------------------- */

export interface ScrapedArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
  coverImageUrl: string | null;
  coverImageCaption: string | null;
  contentHtml: string;
}

function metaContent(html: string, key: string, attr: 'property' | 'name' = 'property'): string | null {
  // Tenta property= e name= na mesma passada (alguns portais usam um ou outro)
  for (const a of [attr, attr === 'property' ? 'name' : 'property'] as const) {
    const re = new RegExp(
      `<meta[^>]+${a}=["']${key}["'][^>]+content=["']([^"']+)["']`,
      'i',
    );
    const m = html.match(re);
    if (m?.[1]) return decodeEntities(m[1]).trim();
    // Ordem inversa: content antes da chave
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+${a}=["']${key}["']`,
      'i',
    );
    const m2 = html.match(re2);
    if (m2?.[1]) return decodeEntities(m2[1]).trim();
  }
  return null;
}

/**
 * Extrai titulo, descricao, data, foto de capa e conteudo de uma pagina de
 * materia ja baixada. Reutiliza a mesma logica de og:image / article do rss.ts.
 */
export function parseArticlePage(html: string, articleUrl: string, sourceName: string): ScrapedArticle | null {
  // --- Pagina indice? So aceita paginas com og:type=article (ou sem og:type) ---
  const ogType = metaContent(html, 'og:type');
  if (ogType && !/article|news|blog/i.test(ogType)) return null;

  // --- Titulo ---
  let title = metaContent(html, 'og:title');
  if (!title) {
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1) title = stripHtml(h1[1]);
  }
  if (!title) {
    const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (t) title = stripHtml(t[1]);
  }
  if (!title || title.length < 10) return null;

  // Remove sufixos comuns do portal no final do titulo
  // (ex.: "Titulo da materia - G1 Mato Grosso do Sul" | "Titulo | Campo Grande News")
  title = title
    .replace(/\s*[-–—|::]\s*(G1|Globo|Mato Grosso do Sul|Campo Grande News|Midiamax|MIDIA MS|TopMidiaNews|Primeira P[áa]gina.*|MSN|UOL)\s*$/i, '')
    .trim();

  // --- Descricao ---
  const description =
    metaContent(html, 'og:description') ??
    metaContent(html, 'description', 'name') ??
    '';

  // --- Data de publicacao ---
  let pubDate: string | null = null;
  const timeMatch = html.match(/<time[^>]+datetime=["']([^"']+)["']/i);
  if (timeMatch?.[1]) {
    const d = new Date(timeMatch[1]);
    if (!isNaN(d.getTime())) pubDate = d.toISOString();
  }
  if (!pubDate) {
    const publishedMeta = metaContent(html, 'article:published_time');
    if (publishedMeta) {
      const d = new Date(publishedMeta);
      if (!isNaN(d.getTime())) pubDate = d.toISOString();
    }
  }

  // --- Foto de capa (og:image -> twitter:image -> article img) ---
  let coverImageUrl: string | null = null;
  let coverImageCaption: string | null = null;
  const ogImage = metaContent(html, 'og:image');
  if (ogImage) {
    coverImageUrl = resolveImageUrl(ogImage, articleUrl);
    coverImageCaption = `Foto: Reprodução / ${sourceName}`;
  }
  if (!coverImageUrl) {
    const twImage = metaContent(html, 'twitter:image', 'name');
    if (twImage) {
      coverImageUrl = resolveImageUrl(twImage, articleUrl);
      coverImageCaption = `Foto: Reprodução / ${sourceName}`;
    }
  }

  // --- Conteudo (<article> -> seletores comuns -> <p>) ---
  let contentHtml = '';
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch && articleMatch[0].length > 300) {
    contentHtml = articleMatch[0];
  }
  if (!contentHtml) {
    const selectors = [
      'article-body',
      'article-content',
      'post-content',
      'entry-content',
      'materia-conteudo',
      'texto-materia',
      'content-body',
    ];
    for (const cls of selectors) {
      const re = new RegExp(`<div[^>]+class=["'][^"']*${cls}[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>\\s*<\\/div>`, 'i');
      const m = html.match(re);
      if (m && m[0].length > 300) {
        contentHtml = m[0];
        break;
      }
    }
  }
  if (!contentHtml) {
    const paragraphs = html.match(/<p[\s\S]*?<\/p>/gi);
    if (paragraphs && paragraphs.length >= 3) {
      contentHtml = paragraphs.slice(0, 20).join('');
    }
  }

  // Limpa o conteudo: remove scripts, styles, nav, iframes e torna imgs absolutas
  if (contentHtml) {
    contentHtml = contentHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/\s+on\w+=["'][^"']*["']/gi, '')
      .replace(/<img([^>]*)\/?>/gi, (match, attrs) => {
        const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        if (srcMatch) {
          const abs = resolveImageUrl(srcMatch[1], articleUrl);
          attrs = attrs.replace(srcMatch[1], abs);
        }
        if (!/referrerpolicy/i.test(attrs)) attrs += ' referrerpolicy="no-referrer"';
        if (!/loading=/i.test(attrs)) attrs += ' loading="lazy"';
        return `<img${attrs} />`;
      })
      .trim();
  }

  return {
    title: title.slice(0, 300),
    link: articleUrl,
    description: description.slice(0, 800),
    pubDate,
    coverImageUrl,
    coverImageCaption,
    contentHtml,
  };
}

/**
 * Pipeline completo de uma fonte scraper:
 *   1) Baixa a pagina inicial com headers de navegador
 *   2) Extrai os links das noticias (HTMLRewriter)
 *   3) Baixa cada materia e extrai titulo/descricao/foto/conteudo
 *
 * Devolve no maximo `maxArticles` materias ja prontas.
 */
export async function scrapeSource(
  homeUrl: string,
  sourceName: string,
  maxArticles = 12,
): Promise<ScrapedArticle[]> {
  const homeHtml = await fetchPageHtml(homeUrl);
  if (!homeHtml) {
    throw new Error(`Falha ao baixar a pagina inicial de ${sourceName}`);
  }

  const links = await extractArticleLinks(homeHtml, homeUrl, maxArticles);
  const articles: ScrapedArticle[] = [];
  const seenTitles = new Set<string>();

  for (const link of links) {
    if (articles.length >= maxArticles) break;

    const html = await fetchPageHtml(link);
    if (!html) continue;

    const parsed = parseArticlePage(html, link, sourceName);
    if (parsed && parsed.title) {
      // Deduplica por titulo (a home repete chamadas de secoes)
      const titleKey = parsed.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);
      articles.push(parsed);
    }
  }

  return articles;
}
