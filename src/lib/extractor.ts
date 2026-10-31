/**
 * extractor.ts
 * -----------------------------------------------------------------------------
 * Extrator limpo de materias (Curadoria manual + automacao RSS).
 *
 *   linkedom (DOM leve, roda em Workers) + @mozilla/readability, com fallback
 *   por seletores classicos do jornalismo brasileiro e, opcionalmente, pelo
 *   Jina Reader (https://r.jina.ai) quando o fetch direto e' bloqueado.
 *
 * Entrega: texto limpo, HTML so com <p>/<h2>/<h3>/<blockquote>/<li>, foto de
 * capa (og:image, sempre https) e fotos internas SO do corpo da materia, com
 * tratamento de lazy-load e filtro anti-lixo.
 */

import { parseHTML } from 'linkedom';
import { Readability } from '@mozilla/readability';

import { sanitizeArticleHtml, htmlToText } from './clean-content';

export const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export interface ArticleImage {
  url: string;
  caption: string | null;
}

export interface ExtractedArticle {
  title: string;
  siteName: string | null;
  description: string;
  publishedAt: string | null;
  /** Texto corrido, limpo. */
  text: string;
  /** HTML limpo (so blocos de texto). */
  contentHtml: string;
  paragraphs: number;
  coverImage: string | null;
  coverCaption: string | null;
  images: ArticleImage[];
  via: 'readability' | 'fallback' | 'jina';
}

/* -------------------------------------------------------------------------- */
/* Download da pagina                                                         */
/* -------------------------------------------------------------------------- */

export async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      redirect: 'follow',
    } as RequestInit);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Fallback opcional: Jina Reader (gratuito) devolve o Markdown limpo e a
 * imagem principal sem navegador headless. Util quando o portal bloqueia o
 * Worker (WAF) ou renderiza so no cliente.
 */
export async function fetchViaJina(url: string): Promise<ExtractedArticle | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'application/json', 'X-Return-Format': 'markdown' },
    });
    if (!res.ok) return null;
    const data: any = (await res.json())?.data;
    const md = String(data?.content ?? '');
    if (md.length < 300) return null;

    const blocks = md
      .split(/\n{2,}/)
      .map((b) => b.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`>#]/g, '').trim())
      .filter((b) => b.length >= 30);
    const html = blocks.map((b) => `<p>${b.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join('');
    const clean = sanitizeArticleHtml(html);

    const cover = typeof data?.image === 'string' ? toHttps(data.image) : null;
    return {
      title: String(data?.title ?? '').trim(),
      siteName: null,
      description: String(data?.description ?? ''),
      publishedAt: data?.publishedTime ? new Date(data.publishedTime).toISOString() : null,
      text: clean.text,
      contentHtml: clean.html,
      paragraphs: clean.paragraphs,
      coverImage: cover,
      coverCaption: null,
      images: [],
      via: 'jina',
    };
  } catch {
    return null;
  }
}

/** Fetch direto; se falhar ou vier vazio, tenta o Jina Reader. */
export async function extractFromUrl(url: string, siteHint?: string): Promise<ExtractedArticle | null> {
  const html = await fetchHtml(url);
  if (html) {
    const ex = extractArticle(html, url, siteHint);
    if (ex.text.length >= 300) return ex;
    const jina = await fetchViaJina(url);
    if (jina && jina.text.length > ex.text.length) return { ...jina, title: jina.title || ex.title, coverImage: jina.coverImage ?? ex.coverImage };
    return ex;
  }
  return fetchViaJina(url);
}

/* -------------------------------------------------------------------------- */
/* Utilitarios                                                                */
/* -------------------------------------------------------------------------- */

export function toHttps(u: string): string {
  return u.replace(/^http:\/\//i, 'https://');
}

function absolutize(src: string, base: string): string | null {
  try {
    const abs = new URL(src.trim(), base).href;
    return toHttps(abs);
  } catch {
    return null;
  }
}

const NOISE_TAGS = 'script,style,nav,header,footer,aside,form,template,noscript,iframe,svg,button,select';
const NOISE_CLASS =
  /(^|[\s_-])(sidebar|menu|related|mais-lidas|newsletter|comments?|breadcrumbs?|share|social|widget|banner|ads?)([\s_-]|$)|(^|[\s_])ad-/i;

const ARTICLE_SELECTORS = [
  '[itemprop="articleBody"]',
  '.entry-content',
  '.post-content',
  '.td-post-content',
  '.article-body',
  '.article-content',
  '.materia-conteudo',
  '.texto-materia',
  'article',
];

const BAD_IMG_WORDS = /(logo|avatar|icon|pixel|analytics|gravatar|banner|\/ads?\/|\bads\b|plugin|wp-smiley|emoji|sprite|placeholder|loading|blank)/i;

function pickImgUrl(img: any): string | null {
  const attrs = ['data-src', 'data-lazy-src', 'data-original', 'data-lazy', 'data-full-url'];
  for (const a of attrs) {
    const v = img.getAttribute(a);
    if (v && !v.startsWith('data:')) return v;
  }
  for (const a of ['data-srcset', 'srcset']) {
    const set = img.getAttribute(a);
    if (set) {
      const best = set
        .split(',')
        .map((p: string) => p.trim().split(/\s+/))
        .filter((p: string[]) => p[0] && !p[0].startsWith('data:'))
        .map((p: string[]) => ({ url: p[0], w: parseInt(p[1] ?? '0', 10) || 0 }))
        .sort((x: any, y: any) => y.w - x.w)[0];
      if (best) return best.url;
    }
  }
  const src = img.getAttribute('src');
  return src && !src.startsWith('data:') ? src : null;
}

function validCaption(text: string | null | undefined): string | null {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length < 6 || t.length > 220) return null;
  if (/\{\{|\}\}|\$\{|<%/.test(t)) return null;
  if (/\.(jpe?g|png|webp|avif)\b/i.test(t)) return null;
  if (/^[\w-]+$/.test(t) && /\d/.test(t)) return null; // nome de arquivo
  if (/(web analytics|visualiza[cç][aã]o de recorte|attachment)/i.test(t)) return null;
  return t;
}

function collectImages(container: any, baseUrl: string): ArticleImage[] {
  const out: ArticleImage[] = [];
  const seen = new Set<string>();

  for (const img of container.querySelectorAll('img')) {
    const raw = pickImgUrl(img);
    if (!raw) continue;
    const url = absolutize(raw, baseUrl);
    if (!url) continue;

    const alt = img.getAttribute('alt') ?? '';
    if (/\{\{|\}\}/.test(url) || /\{\{|\}\}/.test(alt)) continue;
    if (/\.(svg|gif|ico)(\?|$)/i.test(url)) continue;
    if (BAD_IMG_WORDS.test(url) || BAD_IMG_WORDS.test(alt)) continue;

    const w = parseInt(img.getAttribute('width') ?? '', 10);
    const h = parseInt(img.getAttribute('height') ?? '', 10);
    if ((Number.isFinite(w) && w < 250) || (Number.isFinite(h) && h < 250)) continue;

    // Mesma foto em tamanhos diferentes (…-300x200.jpg) conta uma vez
    const key = url.replace(/-\d{2,4}x\d{2,4}(?=\.\w+(\?|$))/, '').split('?')[0];
    if (seen.has(key)) continue;
    seen.add(key);

    const fig = img.closest?.('figure');
    const caption = validCaption(fig?.querySelector('figcaption')?.textContent) ?? validCaption(alt);
    out.push({ url, caption });
  }
  return out;
}

function meta(document: any, selector: string): string | null {
  const v = document.querySelector(selector)?.getAttribute('content');
  return v ? String(v).trim() : null;
}

/* -------------------------------------------------------------------------- */
/* Extracao principal                                                         */
/* -------------------------------------------------------------------------- */

export function extractArticle(html: string, url: string, siteHint?: string): ExtractedArticle {
  const { document } = parseHTML(html);

  // Metadados (antes da limpeza, que remove <header>/<script>)
  const title =
    meta(document, 'meta[property="og:title"]') ??
    document.querySelector('h1')?.textContent?.trim() ??
    document.querySelector('title')?.textContent?.trim() ??
    '';
  const siteName = meta(document, 'meta[property="og:site_name"]') ?? siteHint ?? null;
  const description = meta(document, 'meta[property="og:description"]') ?? meta(document, 'meta[name="description"]') ?? '';
  const published = meta(document, 'meta[property="article:published_time"]');
  const publishedAt = published && !isNaN(new Date(published).getTime()) ? new Date(published).toISOString() : null;

  let coverImage: string | null = null;
  const og = meta(document, 'meta[property="og:image"]') ?? meta(document, 'meta[name="twitter:image"]');
  if (og && !og.startsWith('data:') && !/\.(svg|ico)(\?|$)/i.test(og)) coverImage = absolutize(og, url);

  // Pre-limpeza do DOM
  for (const el of [...document.querySelectorAll(NOISE_TAGS)]) el.remove();
  for (const el of [...document.querySelectorAll('[class],[id]')]) {
    const cls = `${el.getAttribute('class') ?? ''} ${el.getAttribute('id') ?? ''}`;
    if (NOISE_CLASS.test(cls) && !['BODY', 'HTML', 'ARTICLE', 'MAIN'].includes(el.tagName)) el.remove();
  }

  // Container do corpo (para imagens e para o fallback)
  let container: any = null;
  for (const sel of ARTICLE_SELECTORS) {
    const el = document.querySelector(sel);
    if (el && (el.textContent ?? '').trim().length >= 300) {
      container = el;
      break;
    }
  }

  // 1) Readability
  let via: ExtractedArticle['via'] = 'readability';
  let clean = { html: '', text: '', paragraphs: 0 };
  let readabilityHtml = '';
  try {
    Object.defineProperty(document, 'baseURI', { value: url, configurable: true });
    Object.defineProperty(document, 'documentURI', { value: url, configurable: true });
    const parsed = new Readability(document.cloneNode(true) as any, { charThreshold: 250, keepClasses: false }).parse();
    if (parsed?.content) {
      readabilityHtml = parsed.content;
      clean = sanitizeArticleHtml(parsed.content);
    }
  } catch {
    // cai no fallback
  }

  // 2) Fallback por seletores
  if (clean.text.length < 250 && container) {
    via = 'fallback';
    clean = sanitizeArticleHtml(container.innerHTML);
  }

  // Imagens: SO dentro do corpo da materia
  // Prefere o DOM que o Readability isolou (sem relacionadas); senao o container
  const imgRoot =
    via === 'readability' && readabilityHtml
      ? parseHTML(`<div>${readabilityHtml}</div>`).document
      : container;
  const images = imgRoot ? collectImages(imgRoot, url) : [];

  // Legenda da capa: figcaption da foto interna equivalente, senao credito generico
  let coverCaption: string | null = null;
  if (coverImage) {
    const key = coverImage.split('?')[0].replace(/-\d{2,4}x\d{2,4}(?=\.\w+$)/, '');
    const match = images.find((i) => i.url.split('?')[0].replace(/-\d{2,4}x\d{2,4}(?=\.\w+$)/, '') === key);
    coverCaption = match?.caption ?? `Foto: Reprodução / ${siteName ?? 'portal de origem'}`;
  }

  return {
    title: htmlToText(title).replace(/\s+[|–—-]\s+[^|–—-]{3,40}$/, '').trim(),
    siteName,
    description: htmlToText(description),
    publishedAt,
    text: clean.text,
    contentHtml: clean.html,
    paragraphs: clean.paragraphs,
    coverImage,
    coverCaption,
    images,
    via,
  };
}
