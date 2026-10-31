/**
 * clean-content.ts
 * -----------------------------------------------------------------------------
 * Sanitizacao e controle de qualidade do corpo das materias captadas
 * (RSS, scraper, Google News).
 *
 * Em vez de "limpar" o HTML da fonte com regex (que deixava atributos,
 * widgets, links de compartilhamento e scripts vazarem para o corpo), o
 * corpo e' RECONSTRUIDO: so paragrafos e intertitulos de texto, sem
 * atributos, sem tags da fonte, sem lixo de rodape/UI.
 */

const BOILERPLATE =
  /(nossa ferramenta de ia|resume a not[ií]cia|leia aqui|nos siga|siga[- ]nos|receba as principais|receba (as )?not[ií]cias|assine (a|nossa)|compartilh|clique aqui|leia tamb[eé]m|veja tamb[eé]m|leia mais|saiba mais|publicidade|continua depois|cookies|todos os direitos|inscreva-se|baixe o app|entre no (grupo|canal)|siga o .* no (instagram|facebook|x)|whatsapp|ouça a not[ií]cia|^foto:|^cr[eé]ditos?:|^reprodu[cç][aã]o)/i;

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  agrave: 'à', acirc: 'â', ecirc: 'ê', ocirc: 'ô', atilde: 'ã', otilde: 'õ',
  ccedil: 'ç', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  Atilde: 'Ã', Otilde: 'Õ', Ccedil: 'Ç', ndash: '–', mdash: '—', hellip: '…',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
};

function decode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name] ?? m);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Texto puro de um trecho de HTML. */
export function htmlToText(html: string): string {
  return decode(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')')
    .replace(/ ([,.;:!?])/g, '$1')
    .trim();
}

export interface CleanContent {
  /** HTML novo, so com <p> e <h2>. */
  html: string;
  /** Texto corrido dos paragrafos (para medir qualidade). */
  text: string;
  paragraphs: number;
}

/**
 * Reconstroi o corpo da materia a partir do HTML bruto da fonte.
 * Mantem so blocos de texto "de materia" e descarta navegacao, widgets,
 * compartilhamento, creditos soltos e listas de links.
 */
export function sanitizeArticleHtml(raw: string): CleanContent {
  let html = String(raw ?? '');

  html = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|iframe|form|button|select|nav|header|footer|aside|figcaption)\b[\s\S]*?<\/\1>/gi, ' ');

  // Corta no primeiro marcador de fim de materia (relacionadas, comentarios)
  const stop = html.search(/(leia tamb[eé]m|veja tamb[eé]m|mat[eé]rias relacionadas|receba as principais|coment[aá]rios)/i);
  if (stop > 1500) html = html.slice(0, stop);

  const blocks: string[] = [];
  const seen = new Set<string>();
  const re = /<(p|h2|h3|blockquote|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase();
    const inner = m[2];
    const text = htmlToText(inner);
    if (!text) continue;

    const isHeading = tag === 'h2' || tag === 'h3';
    if (!isHeading && text.length < 45) continue;
    if (isHeading && (text.length < 8 || text.length > 140)) continue;
    if (BOILERPLATE.test(text)) continue;
    if (/(class=|data-[a-z]+=|function\s*\(|\bvar\s|{\s*"|=>)/.test(text)) continue;

    // Bloco dominado por links (relacionadas, menus): descarta
    const linkText = [...inner.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((x) => htmlToText(x[1])).join(' ');
    if (linkText.length > text.length * 0.7 && text.length < 220) continue;

    const key = text.slice(0, 80).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    blocks.push(isHeading ? `<h2>${escapeHtml(text)}</h2>` : `<p>${escapeHtml(text)}</p>`);
  }

  const text = blocks
    .filter((b) => b.startsWith('<p>'))
    .map((b) => htmlToText(b))
    .join(' ');

  return { html: blocks.join(''), text, paragraphs: blocks.filter((b) => b.startsWith('<p>')).length };
}

export interface QualityReport {
  ok: boolean;
  /** Motivos que levam a materia para rascunho. */
  issues: string[];
}

/**
 * Porteiro de qualidade: decide se a materia pode ir ao ar sozinha.
 * Reprovou -> vira rascunho para a redacao revisar.
 */
export function assessQuality(input: {
  title: string;
  bodyText: string;
  paragraphs: number;
  hasPhoto: boolean;
  bullets: string[];
}): QualityReport {
  const issues: string[] = [];
  const { title, bodyText, paragraphs, bullets } = input;

  if (title.length < 25) issues.push('titulo curto demais');
  if (title.length > 160) issues.push('titulo longo demais');
  if (/\.{3}$|…$/.test(title.trim())) issues.push('titulo truncado');
  if (title === title.toUpperCase() && /[A-Z]{6,}/.test(title)) issues.push('titulo em caixa alta');
  if (/(t[ií]tulo reescrito|como ia|desculpe|n[aã]o posso|as an ai)/i.test(title)) issues.push('titulo com lixo de IA');

  if (bodyText.length < 400) issues.push('corpo curto (' + bodyText.length + ' caracteres)');
  if (paragraphs < 3) issues.push('menos de 3 paragrafos');
  if (/(class=|<div|<span|data-[a-z-]+=)/i.test(bodyText)) issues.push('HTML vazando no corpo');

  if (bullets.length < 2) issues.push('Direto ao Ponto incompleto');
  if (bullets.some((b) => BOILERPLATE.test(b) || b.length < 20)) issues.push('bullet com lixo');

  return { ok: issues.length === 0, issues };
}
