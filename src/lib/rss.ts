/**
 * src/lib/rss.ts
 * -----------------------------------------------------------------------------
 * Integrador de RSS de agencias de noticia publicas (Agencia Brasil).
 *
 * Importante: o portal roda no Cloudflare Workers, que NAO tem DOMParser.
 * Por isso o XML e' lido com expressoes regulares (sem dependencia nova) e o
 * HTML do resumo e' limpo antes de ir para a pagina.
 */

import type { ArticleScope } from './types';

export interface RssArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image?: string;
  source: string;
}

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
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  atilde: 'ã',
  otilde: 'õ',
  ccedil: 'ç',
  agrave: 'à',
  egrave: 'è',
  igrave: 'ì',
  ograve: 'ò',
  ugrave: 'ù',
  auml: 'ä',
  euml: 'ë',
  iuml: 'ï',
  ouml: 'ö',
  uuml: 'ü',
  acirc: 'â',
  ecirc: 'ê',
  ocirc: 'ô',
  ucirc: 'û',
  raquo: '»',
  laquo: '«',
  copy: '©',
  reg: '®',
  trade: '™',
  deg: '°',
  times: '×',
  divide: '÷',
  pound: '£',
  euro: '€',
  cent: '¢',
  sect: '§',
  para: '¶',
  middot: '·',
  bull: '•',
  dagger: '†',
  permil: '‰',
  plusmn: '±',
  frac12: '½',
  frac14: '¼',
  sup2: '²',
  sup3: '³',
  ordm: 'º',
  ordf: 'ª',
  iexcl: '¡',
  iquest: '¿',
  not: '¬',
  macr: '¯',
  acute: '´',
  cedil: '¸',
  micro: 'µ',
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
    local_tags: [],
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
  regiao: '/artes-nioarquense/arte-cultura-9gac.svg',
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

/* -------------------------------------------------------------------------- */
/* Extracao avançada de fotos reais (Etapa 3)                                 */
/* -------------------------------------------------------------------------- */

/** Resolve uma URL relativa (começando com /) para absoluta usando o domínio da fonte. */
export function resolveImageUrl(url: string, sourceUrl: string): string {
  try {
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) {
      const base = new URL(sourceUrl);
      return `${base.protocol}//${base.host}${url}`;
    }
    // Caminho relativo simples: junta ao domínio
    const base = new URL(sourceUrl);
    return `${base.protocol}//${base.host}/${url.replace(/^\//, '')}`;
  } catch {
    return url;
  }
}

/** Extrai a imagem de um item RSS (media:content, enclosure, thumbnail, img no description/content:encoded). */
export function extractRssImage(block: string, sourceUrl: string): string | undefined {
  const candidates: string[] = [];

  // media:content
  const media = block.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (media) candidates.push(media[1]);

  // media:thumbnail
  const thumbnail = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (thumbnail) candidates.push(thumbnail[1]);

  // enclosure
  const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (enclosure) candidates.push(enclosure[1]);

  // imagem-destaque (Agência Brasil)
  const featured = block.match(/<imagem-destaque>([\s\S]*?)<\/imagem-destaque>/i);
  if (featured) candidates.push(featured[1].trim());

  // img dentro de description / content:encoded
  const description = decodeEntities(takeTag(block, 'description'));
  const content = decodeEntities(takeTag(block, 'content:encoded'));
  for (const html of [description, content]) {
    for (const img of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
      candidates.push(img[1]);
    }
  }

  for (const candidate of candidates) {
    const url = resolveImageUrl(candidate, sourceUrl);
    if (!/^https?:\/\//i.test(url)) continue;
    if (/\.(svg|gif)(\?|$)/i.test(url)) continue;
    if (/\/ebc\.(png|gif)\?/i.test(url)) continue;
    if (/logo/i.test(url)) continue;
    return url;
  }

  return undefined;
}

/**
 * Busca o HTML da URL original da notícia e extrai a melhor imagem de capa,
 * seguindo a ordem de prioridade:
 *   1) <meta property="og:image" content="...">
 *   2) <meta name="twitter:image" content="...">
 *   3) Primeira <img> dentro de <article> ou <figure>
 *   4) Primeira <img> principal do corpo
 */
export async function fetchHtmlCoverImage(
  articleUrl: string,
  sourceUrl: string,
): Promise<{ url: string | null; caption: string | null }> {
  try {
    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    } as RequestInit);

    if (!response.ok) return { url: null, caption: null };
    const html = await response.text();

    // 1) og:image
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch) {
      const url = resolveImageUrl(ogMatch[1], sourceUrl);
      return { url, caption: extractCaption(html, ogMatch[1]) };
    }

    // 2) twitter:image
    const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (twMatch) {
      const url = resolveImageUrl(twMatch[1], sourceUrl);
      return { url, caption: extractCaption(html, twMatch[1]) };
    }

    // 3) primeira imagem dentro de <article> ou <figure>
    const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
    const figureMatch = html.match(/<figure[\s\S]*?<\/figure>/i);
    const blocks = [articleMatch?.[0], figureMatch?.[0]].filter((b): b is string => Boolean(b));
    for (const block of blocks) {
      const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch?.[1]) {
        const url = resolveImageUrl(imgMatch[1], sourceUrl);
        const caption = extractCaption(block, imgMatch[1]);
        return { url, caption };
      }
    }

    // 4) primeira imagem qualquer do corpo (sem ser ícone/logo)
    const anyImg = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (anyImg?.[1]) {
      const url = resolveImageUrl(anyImg[1], sourceUrl);
      if (!/logo|icon|\.(svg|gif)(\?|$)/i.test(url)) {
        return { url, caption: extractCaption(html, anyImg[1]) };
      }
    }

    return { url: null, caption: null };
  } catch {
    return { url: null, caption: null };
  }
}

/** Extrai legenda/crédito da foto: figcaption, alt da imagem, ou fallback "Foto: Reprodução / [Fonte]". */
export function extractCaption(html: string, imageUrl: string, sourceName = 'Fonte'): string {
  // Tenta figcaption próxima à imagem
  const figCaption = html.match(
    new RegExp(`<figure[\\s\\S]*?<img[^>]+src=["']${escapeRegExp(imageUrl)}["'][\\s\\S]*?<figcaption[^>]*>([\\s\\S]*?)<\\/figcaption>`, 'i'),
  );
  if (figCaption) {
    const text = stripHtml(figCaption[1]).trim();
    if (text) return text;
  }

  // Tenta alt da própria imagem
  const altMatch = html.match(
    new RegExp(`<img[^>]+src=["']${escapeRegExp(imageUrl)}["'][^>]*alt=["']([^"']*)["']`, 'i'),
  );
  if (altMatch) {
    const text = stripHtml(altMatch[1]).trim();
    if (text) return `Foto: ${text}`;
  }

  return `Foto: Reprodução / ${sourceName}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extrai todas as imagens internas de um HTML (para inclusão no corpo da matéria).
 * Retorna array de { url, caption }.
 */
export function extractInternalImages(html: string, sourceUrl: string, sourceName: string): Array<{ url: string; caption: string }> {
  const images: Array<{ url: string; caption: string }> = [];
  const seen = new Set<string>();

  for (const img of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    let url = img[1];
    url = resolveImageUrl(url, sourceUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    if (/\.(svg|gif)(\?|$)/i.test(url)) continue;
    if (/logo/i.test(url)) continue;
    if (/\/pixel|tracking|\d{1,3}x\d{1,3}/i.test(url)) continue;

    const caption = extractCaption(html, img[1], sourceName);
    images.push({ url, caption });
  }

  return images;
}

/* -------------------------------------------------------------------------- */
/* Classificacao geografica e tematica (Etapa 4)                              */
/* -------------------------------------------------------------------------- */

/** Cidades e locais da regiao de Nioaque (MS) usados na deteccao por conteudo. */
export const REGION_CITIES: string[] = [
  'Jardim',
  'Guia Lopes da Laguna',
  'Bonito',
  'Anastacio',
  'Anastácio',
  'Aquidauana',
  'Sidrolandia',
  'Sidrolândia',
  'Maracaju',
  'Dois Irmãos do Buriti',
  'Dois Irmãos do Buriti'.replace('ã', 'a'),
  'Miranda',
  'Bodoquena',
  'Porto Murtinho',
  'Rota Bioceania',
  'Rota Bioceânica',
  'BR-060',
  'BR-419',
];

/** Fontes estaduais (usadas como fallback quando nao ha Nioaque nem regiao). */
const STATE_SOURCES: Record<string, boolean> = {
  'G1 Mato Grosso do Sul': true,
  'Campo Grande News': true,
  'Midiamax': true,
  'Agencia de Noticias de MS': true,
  'Agência de Notícias de MS': true,
};

/** Fontes nacionais. */
const NATIONAL_SOURCES: Record<string, boolean> = {
  'Agencia Brasil / EBC': true,
  'Agência Brasil': true,
};

/** Normaliza uma string para comparacao (remove acentos, espacos duplos). */
export function normCity(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detecta "Nioaque" e cidades da constante REGION_CITIES no texto.
 * Devolve array de local_tags (sem duplicatas, ordem de aparecimento).
 */
export function detectLocalTags(text: string): string[] {
  const haystack = normCity(text);
  const tags: string[] = [];
  const seen = new Set<string>();

  const nioaqueNorm = normCity('Nioaque');
  if (haystack.includes(nioaqueNorm) && !seen.has(nioaqueNorm)) {
    tags.push('Nioaque');
    seen.add(nioaqueNorm);
  }

  for (const city of REGION_CITIES) {
    const cn = normCity(city);
    if (haystack.includes(cn) && !seen.has(cn)) {
      tags.push(city);
      seen.add(cn);
    }
  }

  return tags;
}

/**
 * Roteamento de escopo baseado nas regras de proximidade geografica.
 *
 * Regras:
 *  a) Se encontrou "Nioaque": scope = 'nioaque'
 *  b) Se NAO encontrou Nioaque, mas encontrou cidade da regiao: scope = 'regiao'
 *  c) Se NAO encontrou nenhum dos dois, mas fonte estadual: scope = 'ms'
 *  d) Se for Agencia Brasil: scope = 'brasil'
 */
export function routeScope(
  localTags: string[],
  sourceName: string,
  defaultFallback: ArticleScope = 'ms',
): ArticleScope {
  const hasNioaque = localTags.some((t) => normCity(t) === normCity('Nioaque'));
  const hasRegion = localTags.length > 0 && !hasNioaque;

  if (hasNioaque) return 'nioaque';
  if (hasRegion) return 'regiao';
  if (STATE_SOURCES[sourceName ?? '']) return 'ms';
  if (NATIONAL_SOURCES[sourceName ?? '']) return 'brasil';
  return defaultFallback;
}

/**
 * Detecta a editoria tematica com base em palavras-chave do titulo.
 */
export function detectCategory(title: string): string {
  const t = title.toLowerCase();

  const themes: Array<{ keywords: string[]; label: string }> = [
    { keywords: ['policial', 'polícia', 'homicidio', 'assassinato', 'prisao', 'prisão', 'fuzil', 'revolver', 'droga', 'trafico', 'tráfico', 'roubo', 'frota', 'facao', 'facção'], label: 'Polícia' },
    { keywords: ['agro', 'agricultura', 'lavoura', 'fazenda', 'produtor rural', 'plantio', 'colheita', 'boi', 'gado', 'soja', 'milho', 'pecuaria'], label: 'Agro' },
    { keywords: ['prefeitura', 'camara', 'câmara', 'vereador', 'prefeito', 'projeto de lei', 'sessao', 'sessão', 'legislativo', 'executivo', 'edital', 'concurso publico'], label: 'Política' },
    { keywords: ['saude', 'saúde', 'hospital', 'ubs', 'vacina', 'vacinacao', 'vacinação', 'medico', 'médico', 'enfermagem', 'epidemia', 'dengue'], label: 'Saúde' },
    { keywords: ['futebol', 'time', 'campeonato', 'esporte', 'atleta', 'jogo', 'partida', 'torcida', 'estadio'], label: 'Esporte' },
    { keywords: ['cultura', 'festival', 'show', 'musica', 'música', 'teatro', 'exposicao', 'exposição', 'artista', 'livro'], label: 'Cultura' },
  ];

  for (const theme of themes) {
    if (theme.keywords.some((k) => t.includes(k.toLowerCase()))) {
      return theme.label;
    }
  }

  return 'Geral';
}

/* -------------------------------------------------------------------------- */
/* Extracao de conteudo completo da materia original                          */
/* -------------------------------------------------------------------------- */

/** Seletores comuns de corpo de materia em portais de noticias. */
const CONTENT_SELECTORS: string[] = [
  'article',
  '[itemprop="articleBody"]',
  '.article-body',
  '.article-content',
  '.post-content',
  '.entry-content',
  '.content',
  '.materia',
  '.noticia',
  '.texto',
  '.corpo',
  'main',
];

/**
 * Remove elementos indesejados (scripts, styles, navegação, rodapé, anúncios)
 * de um trecho HTML para deixar apenas o corpo da matéria.
 */
function cleanArticleHtml(html: string, sourceUrl: string): string {
  let cleaned = html;

  // Remove scripts e styles
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Remove seções de navegação, header, footer, aside, figuras de anúncio
  cleaned = cleaned.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  cleaned = cleaned.replace(/<header[\s\S]*?<\/header>/gi, '');
  cleaned = cleaned.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  cleaned = cleaned.replace(/<aside[\s\S]*?<\/aside>/gi, '');

  // Remove iframes e embeds (videos externos, anúncios)
  cleaned = cleaned.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  cleaned = cleaned.replace(/<embed[\s\S]*?>/gi, '');

  // Remove elementos com classes de anúncio/social
  cleaned = cleaned.replace(
    /<[^>]+(class=["'][^"']*(ad|advertisement|banner|social|share|related|pub|anuncio)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>)/gi,
    '',
  );

  // Converte imagens relativas para absolutas
  cleaned = cleaned.replace(
    /<img[^>]+src=["']([^"']+)["']/gi,
    (match, src) => {
      const absolute = resolveImageUrl(src, sourceUrl);
      return match.replace(src, absolute);
    },
  );

  // Adiciona referrerpolicy e loading lazy nas imagens
  cleaned = cleaned.replace(
    /<img([^>]*)\/?>/gi,
    (match, attrs) => {
      if (!/referrerpolicy/i.test(attrs)) {
        attrs += ' referrerpolicy="no-referrer"';
      }
      if (!/loading=/i.test(attrs)) {
        attrs += ' loading="lazy"';
      }
      return `<img${attrs} />`;
    },
  );

  // Limpa atributos onclick / eventos indesejados
  cleaned = cleaned.replace(/\s+on\w+=["'][^"']*["']/gi, '');

  return cleaned.trim();
}

/**
 * Busca o HTML da URL original da materia e extrai o corpo completo do texto.
 *
 * Estrategia:
 *   1) Procura por tag <article>
 *   2) Tenta seletores comuns (.article-body, .post-content, etc.)
 *   3) Fallback: pega todos os <p> do corpo
 *
 * Retorna o HTML limpo do corpo da materia, pronto para ser inserido no
 * campo `content` do banco.
 */
export async function fetchArticleContent(
  articleUrl: string,
  sourceUrl: string,
): Promise<string> {
  try {
    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    } as RequestInit);

    if (!response.ok) return '';

    const html = await response.text();

    // Tenta encontrar o conteudo principal por seletor
    let contentHtml = '';

    for (const selector of CONTENT_SELECTORS) {
      const regex = new RegExp(
        `<${selector}[\\s\\S]*?<\\/${selector}>`,
        'i',
      );
      const match = html.match(regex);
      if (match && match[0].length > 200) {
        contentHtml = match[0];
        break;
      }
    }

    // Fallback: se nao encontrou tag article/outro, pega todos os <p> do body
    if (!contentHtml) {
      const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);
      const bodyHtml = bodyMatch ? bodyMatch[0] : html;
      const paragraphs = bodyHtml.match(/<p[\s\S]*?<\/p>/gi);
      if (paragraphs && paragraphs.length > 0) {
        contentHtml = paragraphs.join('');
      }
    }

    if (!contentHtml) return '';

    return cleanArticleHtml(contentHtml, sourceUrl);
  } catch {
    return '';
  }
}

/* -------------------------------------------------------------------------- */
/* Bing News RSS (feeds de busca — alternativa ao Google News)                */
/* -------------------------------------------------------------------------- */

/**
 * Detecta feeds de busca do Bing News (`bing.com/news/search?q=...&format=RSS`).
 * Alternativa ao Google News: funciona direto do IP de datacenter (sem
 * bloqueio 503) e o link real da materia vem no parametro `url=` do
 * redirect `apiclick.aspx` (resolucao local, sem fetch extra).
 */
export function isBingNewsFeed(url: string): boolean {
  return /bing\.com\/news\/search/i.test(url);
}

/**
 * Extrai a URL real de um redirect do Bing News
 * (`bing.com/news/apiclick.aspx?...&url=<URL real>`).
 * Retorna a propria URL se nao for um redirect do Bing.
 */
export function resolveBingUrl(link: string): string {
  try {
    // Desescapa entidades XML comuns do RSS (&amp; etc.)
    const clean = link.replace(/&amp;/g, '&').replace(/&#160;/g, ' ').replace(/&quot;/g, '"');
    if (!/bing\.com\/news\/apiclick/i.test(clean)) return clean;
    const inner = new URL(clean).searchParams.get('url');
    return inner || clean;
  } catch {
    return link;
  }
}

/**
 * Parseia o XML de um feed de busca do Bing News (RSS 2.0) e devolve os
 * itens com o link JA resolvido (URL real da materia do portal).
 */
export function parseBingNewsItems(xml: string, maxItems = 20): GoogleNewsItem[] {
  const items: GoogleNewsItem[] = [];
  const itemRegex = /<item\b([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1];

    let title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
      block.match(/<title>([\s\S]*?)<\/title>/))?.[1]?.trim();
    const link = (block.match(/<link>([\s\S]*?)<\/link>/))?.[1]?.trim();
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/))?.[1]?.trim();
    const descRaw = (block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
      block.match(/<description>([\s\S]*?)<\/description>/))?.[1]?.trim();

    if (!title || !link) continue;

    title = stripHtml(title).trim();
    if (title.length < 10) continue;

    items.push({
      title,
      link: resolveBingUrl(link),
      sourceUrl: null,
      sourceName: null,
      pubDate: pubDate ? new Date(pubDate).toISOString() : null,
      description: descRaw ? stripHtml(descRaw) : null,
    });
  }

  return items;
}

/* -------------------------------------------------------------------------- */
/* Google News RSS (feeds de busca)                                           */
/* -------------------------------------------------------------------------- */

/**
 * Detecta feeds do Google News (`news.google.com/rss/search?q=...`).
 * Sao a forma mais estavel de acompanhar portais sem RSS proprio.
 */
export function isGoogleNewsFeed(url: string): boolean {
  return /news\.google\.com\/rss/i.test(url);
}

export interface GoogleNewsItem {
  title: string;
  /** Link do Google News (redirecionamento) — resolver antes de usar.
   *  No Bing News o link ja e' a URL real da materia. */
  link: string;
  /** URL do portal de origem, se declarada em <source url="...">. */
  sourceUrl: string | null;
  /** Nome do portal de origem (<source>...</source>). */
  sourceName: string | null;
  pubDate: string | null;
  /** Resumo do item (Bing News preenche; Google News nao). */
  description?: string | null;
}

/**
 * Parseia o XML de um feed do Google News (mesmo formato RSS 2.0).
 * O <title> vem no padrao "Titulo da materia - Nome do Portal"; o sufixo
 * e' removido aqui para nao poluir o cabecalho do artigo.
 */
export function parseGoogleNewsItems(xml: string, maxItems = 20): GoogleNewsItem[] {
  const items: GoogleNewsItem[] = [];
  const itemRegex = /<item\b([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1];

    const sourceTag = block.match(/<source[^>]*url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i);
    const sourceUrl = sourceTag?.[1]?.trim() ?? null;
    const sourceName = sourceTag?.[2] ? stripHtml(sourceTag[2]).trim() : null;

    let title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
      block.match(/<title>(.*?)<\/title>/))?.[1]?.trim();
    const link = (block.match(/<link>(.*?)<\/link>/))?.[1]?.trim();
    const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/))?.[1]?.trim();

    if (!title || !link) continue;

    // Remove o sufixo " - Nome do Portal" do titulo do Google News
    if (sourceName) {
      title = title.replace(new RegExp(`\\s*-\\s*${escapeRegExp(sourceName)}\\s*$`, 'i'), '').trim();
    } else {
      title = title.replace(/\s*-\s*[^-]{1,60}$/, '').trim();
    }
    if (title.length < 10) continue;

    items.push({
      title,
      link,
      sourceUrl,
      sourceName,
      pubDate: pubDate ?? null,
    });
  }

  return items;
}

/**
 * Busca o XML de um feed do Google News. Tenta o fetch direto primeiro e, se
 * o servidor responder 403/503 (bloqueio de IP de datacenter — Cloudflare
 * Workers), usa proxies publicos como fallback:
 *
 *   1) rss2json  — devolve JSON (ate 10 itens no plano gratuito)
 *   2) cors.lol  — devolve o XML original (ate 100 itens)
 *
 * Os itens sao normalizados para blocos <item> XML que o
 * parseGoogleNewsItems ja entende. Retorna '' se tudo falhar.
 */
export async function fetchGoogleNewsFeed(feedUrl: string, maxItems = 20): Promise<string> {
  // --- 1) Fetch direto ---
  try {
    const res = await fetch(feedUrl, {
      headers: {
        ...GN_HEADERS,
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
    } as RequestInit);
    if (res.ok) {
      const xml = await res.text();
      if (/<item\b/i.test(xml)) return xml;
    }
  } catch {
    // segue para os proxies
  }

  // --- 2) Proxy rss2json (JSON; plano gratuito nao aceita `count`) ---
  try {
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const res = await fetch(proxyUrl, {
      headers: { ...GN_HEADERS, Accept: 'application/json' },
    } as RequestInit);
    if (res.ok) {
      const data = (await res.json()) as {
        status?: string;
        items?: Array<{ title?: string; link?: string; pubDate?: string; content?: string }>;
      };
      if (data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
        const xml =
          '<rss>' +
          data.items
            .slice(0, maxItems)
            .map(
              (it) =>
                `<item><title><![CDATA[${it.title ?? ''}]]></title><link>${it.link ?? ''}</link>` +
                `<pubDate>${it.pubDate ?? ''}</pubDate>` +
                `<description><![CDATA[${it.content ?? ''}]]></description></item>`,
            )
            .join('') +
          '</rss>';
        if (xml.length > 100) return xml;
      }
    }
  } catch {
    // segue para o proximo proxy
  }

  // --- 3) Proxy cors.lol (devolve o XML original) ---
  try {
    const proxyUrl = `https://api.cors.lol/?url=${encodeURIComponent(feedUrl)}`;
    const res = await fetch(proxyUrl, { headers: GN_HEADERS } as RequestInit);
    if (res.ok) {
      const xml = await res.text();
      if (/<item\b/i.test(xml)) return xml;
    }
  } catch {
    // todos os caminhos falharam
  }

  return '';
}

const GN_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
};

/**
 * Resolve o link de redirecionamento do Google News para a URL real da materia.
 *
 * Estrategias (em ordem, a primeira que funcionar vence):
 *   1) Decodificar o article ID em base64 (formato antigo "CBMi<url>": o
 *      payload embute a URL real) — zero fetch, gratis.
 *   2) Formato novo (AU_yqL...): busca a pagina do artigo no Google News e
 *      usa a API batchexecute com os parametros `data-n-a-id`, `data-n-a-sg`
 *      e `data-n-a-ts` embutidos na pagina (mesmo metodo da biblioteca
 *      googlenewsdecoder). Custo: 2 fetches (pagina + batchexecute).
 *
 * Retorna null quando nao consegue resolver (item deve ser descartado).
 */
export async function resolveGoogleNewsUrl(gnUrl: string): Promise<string | null> {
  // --- Estrategia 1: decodifica o article ID em base64 (formato antigo) ---
  const idMatch = gnUrl.match(/\/(?:rss\/)?articles\/([A-Za-z0-9_-]+)/);
  if (idMatch) {
    try {
      let b64 = idMatch[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) b64 += '=';
      const binary = atob(b64);
      // Formato antigo: a URL real aparece embutida no binario
      const urlMatch = binary.match(/https?:\/\/[^\s"'<>\\]+/);
      if (urlMatch?.[0]) return urlMatch[0];
    } catch {
      // segue para a estrategia 2
    }
  }

  // --- Estrategia 2: pagina do artigo + batchexecute (formato AU_yqL) ---
  try {
    const res = await fetch(gnUrl, { headers: GN_HEADERS, redirect: 'follow' } as RequestInit);

    // Redirect HTTP direto (raro, mas possivel)
    const finalUrl = res.url;
    if (finalUrl && !/news\.google\.com|consent\.google\.com|accounts\.google\.com/.test(finalUrl)) {
      return finalUrl;
    }

    const html = await res.text();

    // a) data-n-au direto no HTML (algumas versoes)
    const dataAu = html.match(/data-n-au=["'](https?:\/\/[^"']+)["']/i);
    if (dataAu?.[1] && !/google\.com/.test(dataAu[1])) return dataAu[1];

    // b) API batchexecute com os parametros da pagina (metodo estavel)
    const aId = html.match(/data-n-a-id="([^"]+)"/)?.[1];
    const aSg = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
    const aTs = html.match(/data-n-a-ts="([^"]+)"/)?.[1];

    if (aId && aSg && aTs) {
      const payload = JSON.stringify([
        'garturlreq',
        [
          ['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1],
          'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0,
        ],
        aId,
        parseInt(aTs, 10),
        aSg,
      ]);
      const freq = JSON.stringify([[['Fbv4je', payload, null, 'generic']]]);

      const bres = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
        method: 'POST',
        headers: {
          ...GN_HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: `f.req=${encodeURIComponent(freq)}`,
      } as RequestInit);

      if (bres.ok) {
        const btxt = await bres.text();
        const urlMatch = btxt.match(
          /https?:\/\/(?!news\.google|consent\.google|www\.google|accounts\.google)[^\\"\s]+/,
        );
        if (urlMatch?.[0]) {
          try {
            return decodeURIComponent(urlMatch[0]);
          } catch {
            return urlMatch[0];
          }
        }
      }
    }
  } catch {
    // ignora
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Sitemap XML (fallback quando o feed do portal falha)                       */
/* -------------------------------------------------------------------------- */

/**
 * Descobre URLs de materias lendo `/robots.txt` do dominio a procura de
 * `Sitemap:` (prioriza `news-sitemap.xml`) e, se necessario, baixa o
 * sitemap (ou sub-sitemaps de um sitemap index, 1 nivel) e extrai os `<loc>`.
 *
 * Devolve no maximo `maxUrls` URLs que parecem materias.
 */
export async function discoverSitemapUrls(pageUrl: string, maxUrls = 15): Promise<string[]> {
  const origin = new URL(pageUrl).origin;
  const candidates: string[] = [];

  // --- a) robots.txt ---
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: GN_HEADERS, redirect: 'follow' } as RequestInit);
    if (res.ok) {
      const txt = await res.text();
      for (const m of txt.matchAll(/^sitemap:\s*(\S+)/gim)) {
        candidates.push(m[1].trim());
      }
    }
  } catch {
    // sem robots.txt — tenta padroes comuns
  }

  // --- b) padroes comuns de sitemap ---
  candidates.push(
    `${origin}/sitemap.xml`,
    `${origin}/news-sitemap.xml`,
    `${origin}/sitemap_index.xml`,
  );

  // Dedup preservando prioridade: news-sitemap primeiro
  const unique = [...new Set(candidates)].sort((a, b) => {
    const score = (u: string) => (u.includes('news-sitemap') ? 2 : u.includes('sitemap') ? 1 : 0);
    return score(b) - score(a);
  });

  const isXmlUrl = (u: string) => /\.xml(\?|$)/i.test(u);
  const extractLocs = (xml: string) =>
    [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((m) => m[1].trim()).filter(Boolean);

  for (const smUrl of unique.slice(0, 3)) {
    let xml = '';
    try {
      const res = await fetch(smUrl, { headers: GN_HEADERS, redirect: 'follow' } as RequestInit);
      if (!res.ok) continue;
      xml = await res.text();
    } catch {
      continue;
    }

    const locs = extractLocs(xml);
    if (locs.length === 0) continue;

    let articleUrls = locs.filter((l) => !isXmlUrl(l));

    // Sitemap index: baixa ate 2 sub-sitemaps (1 nivel)
    if (articleUrls.length === 0) {
      const subSitemaps = locs.filter(isXmlUrl).slice(0, 2);
      for (const sub of subSitemaps) {
        try {
          const res = await fetch(sub, { headers: GN_HEADERS, redirect: 'follow' } as RequestInit);
          if (!res.ok) continue;
          const subXml = await res.text();
          articleUrls.push(...extractLocs(subXml).filter((l) => !isXmlUrl(l)));
        } catch {
          // ignora sub-sitemap quebrado
        }
        if (articleUrls.length >= maxUrls) break;
      }
    }

    if (articleUrls.length > 0) {
      return articleUrls.filter(looksLikeArticleUrl).slice(0, maxUrls);
    }
  }

  return [];
}

/** Heuristica leve: URL do mesmo site com caminho de materia (>= 2 segmentos). */
function looksLikeArticleUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return false;
    if (/\.(?:jpe?g|png|gif|svg|webp|pdf|css|js|mp4|woff2?|zip)$/i.test(u.pathname)) return false;
    const segments = u.pathname.split('/').filter(Boolean);
    return segments.length >= 2;
  } catch {
    return false;
  }
}
