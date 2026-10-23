/**
 * src/lib/rss.ts
 * -----------------------------------------------------------------------------
 * Integrador de RSS de agencias de noticia publicas (Agencia Brasil).
 *
 * Importante: o portal roda no Cloudflare Workers, que NAO tem DOMParser.
 * Por isso o XML e' lido com expressoes regulares (sem dependencia nova) e o
 * HTML do resumo e' limpo antes de ir para a pagina.
 */

export interface RssArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image?: string;
  source: string;
}

type ArticleScope = 'nioaque' | 'ms' | 'brasil' | 'coluna' | 'radar_oficial';

/* -------------------------------------------------------------------------- */
/* Texto                                                                      */
/* -------------------------------------------------------------------------- */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rdquo: '"',
  ldquo: '"',
  rsquo: "'",
  lsquo: "'",
  ndash: '–',
  mdash: '—',
  hellip: '…',
};

export function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (full, name) => ENTITIES[name.toLowerCase()] ?? full);
}

export function stripHtml(value: string): string {
  // O RSS da Agencia Brasil vem com o HTML escapado (&lt;p&gt;...). Primeiro
  // desescapamos, depois removemos as tags; o contrario deixaria o HTML visivel.
  return decodeEntities(
    decodeEntities(value)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripCdata(value: string): string {
  return value.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');
}

/** Corta um texto no fim de uma frase, sem deixar palavra pela metade. */
function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trim()}…`;
}

function sentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);
}

/* -------------------------------------------------------------------------- */
/* XML                                                                        */
/* -------------------------------------------------------------------------- */

function takeTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripCdata(match[1]).trim() : '';
}

function extractImage(block: string): string | undefined {
  const candidates: string[] = [];

  // Tag propria do feed da Agencia Brasil: e' a foto de capa de verdade.
  const featured = block.match(/<imagem-destaque>([\s\S]*?)<\/imagem-destaque>/i);
  if (featured) candidates.push(featured[1].trim());

  const media = block.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (media) candidates.push(media[1]);

  const thumbnail = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (thumbnail) candidates.push(thumbnail[1]);

  const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (enclosure) candidates.push(enclosure[1]);

  const description = decodeEntities(takeTag(block, 'description'));
  const content = decodeEntities(takeTag(block, 'content:encoded'));

  for (const html of [description, content]) {
    for (const img of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
      candidates.push(img[1]);
    }
  }

  for (const candidate of candidates) {
    const url = candidate.startsWith('//') ? `https:${candidate}` : candidate;
    if (!/^https?:\/\//i.test(url)) continue;
    // Logo da agencia e pixels de rastreamento nao sao foto de materia.
    if (/\.(svg|gif)(\?|$)/i.test(url)) continue;
    if (/\/ebc\.(png|gif)\?/i.test(url)) continue;
    if (/logo/i.test(url)) continue;
    return url;
  }

  return undefined;
}

function parseRSS(xml: string, sourceUrl: string): RssArticle[] {
  const articles: RssArticle[] = [];
  const sourceName =
    takeTag(xml, 'title') ||
    xml.match(/<channel>[\s\S]*?<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ||
    'Agencia Brasil';

  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks) {
    const title = stripHtml(takeTag(block, 'title'));
    const link = takeTag(block, 'link');
    const rawDescription = takeTag(block, 'description');
    const pubDate = takeTag(block, 'pubDate');

    if (!title || !link) continue;

    articles.push({
      title,
      link,
      description: rawDescription,
      pubDate,
      image: extractImage(block),
      source: sourceName,
    });
  }

  if (!articles.length) {
    console.warn(`RSS ${sourceUrl}: nenhum item reconhecido`);
  }

  return articles;
}

async function fetchRSS(url: string): Promise<RssArticle[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; O Nioaquense Bot/1.0; +https://onioaquense.com)',
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
      // A borda guarda o feed por 10 minutos: uma busca por pagina, nao por visita.
      cf: { cacheTtl: 600, cacheEverything: true },
    } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } });

    if (!response.ok) {
      console.warn(`RSS ${url}: status ${response.status}`);
      return [];
    }

    return parseRSS(await response.text(), url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`RSS ${url}: erro ao buscar - ${msg}`);
    return [];
  }
}

/**
 * Feeds configurados. A Agencia Brasil mudou os enderecos em 2025; os antigos
 * (`/rss/ultimas-noticias.xml`) devolvem 404.
 */
const RSS_FEEDS: { url: string; scope: ArticleScope; sourceName: string }[] = [
  {
    url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
    scope: 'brasil',
    sourceName: 'Agência Brasil',
  },
];

/** Busca os feeds e devolve os itens mais recentes. */
export async function fetchRSSArticles(limit = 8): Promise<RssArticle[]> {
  const all: RssArticle[] = [];

  for (const feed of RSS_FEEDS) {
    const articles = await fetchRSS(feed.url);
    for (const article of articles) {
      all.push({ ...article, source: feed.sourceName });
    }
  }

  return all.slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Conversao para o formato do portal                                         */
/* -------------------------------------------------------------------------- */

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

/**
 * Converte um item de RSS em materia do portal.
 *
 * O portal NAO republica o texto da agencia: mostra a chamada, a foto com
 * credito e um link para a materia original. Isso e' o correto editorialmente
 * e evita duplicacao de conteudo.
 */
export function rssToArticle(
  rss: RssArticle,
  scope: ArticleScope = 'brasil',
): import('./types').Article {
  const clean = stripHtml(rss.description);
  const bullets = sentences(clean).slice(0, 3);
  const lead = bullets.length ? bullets.join(' ') : clean;
  const slug = `rss-${slugify(rss.title)}-${slugify(new URL(rss.link).hostname.split('.').slice(-2).join('-'))}`;

  return {
    id: slug,
    title: rss.title,
    subtitle: truncate(lead, 180) || null,
    slug,
    summary_bullets: bullets.length ? bullets : [truncate(clean, 160)],
    content: [
      `<p>${escapeHtml(truncate(lead, 700))}</p>`,
      `<p>Leia a matéria completa na <a href="${escapeHtml(rss.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(rss.source)}</a>.</p>`,
    ].join(''),
    cover_image_url: rss.image ?? getArteFallback(scope),
    cover_image_caption: rss.image ? `Foto: ${rss.source}` : null,
    scope,
    category_label: rss.source,
    is_featured: false,
    is_breaking: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 0,
    published_at: rss.pubDate ? new Date(rss.pubDate).toISOString() : new Date().toISOString(),
    created_at: rss.pubDate ? new Date(rss.pubDate).toISOString() : new Date().toISOString(),
    updated_at: rss.pubDate ? new Date(rss.pubDate).toISOString() : new Date().toISOString(),
    source_name: rss.source,
    source_url: rss.link,
  };
}

/** Lista de artes disponiveis como fallback por escopo. */
const ARTE_FALLBACK: Record<ArticleScope, string> = {
  nioaque: '/artes-nioarquense/arte-agro-campo.svg',
  ms: '/artes-nioarquense/arte-prefeitura-obras.svg',
  brasil: '/artes-nioarquense/arte-cultura-9gac.svg',
  coluna: '/artes-nioarquense/arte-educacao.svg',
  radar_oficial: '/artes-nioarquense/arte-seguranca-plantao.svg',
};

export function getArteFallback(scope: ArticleScope): string {
  return ARTE_FALLBACK[scope] ?? '/artes-nioarquense/arte-cultura-9gac.svg';
}

/**
 * As artes geometricas oficiais sao capas de template: a caixa branca central
 * fica vazia quando usadas como imagem. Elas nao contam como foto de materia.
 */
const BLANK_COVER = /^\/(?:covers|artes-nioarquense)\/(?:cap-\d+|arte-[a-z0-9-]+)\.svg$/i;

export function isPhotoCover(url: string | null | undefined): url is string {
  return Boolean(url && !BLANK_COVER.test(url));
}
