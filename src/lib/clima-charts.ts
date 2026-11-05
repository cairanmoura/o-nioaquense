/**
 * clima-charts.ts
 * -----------------------------------------------------------------------------
 * Graficos SVG gerados no servidor (zero JS no navegador) para a pagina /clima.
 * Cores via tokens do tema (classes Tailwind), entao seguem o modo claro/escuro.
 * Cada funcao devolve a string <svg>; use com set:html.
 */

const W = 400;
const L = 34;
const R = 8;
const T = 14;
const B = 26;

export interface LineSeries {
  values: number[];
  /** classes Tailwind de stroke, ex.: "stroke-nioaque-red-dark" */
  cls: string;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function niceRange(min: number, max: number): [number, number] {
  if (min === max) return [min - 1, max + 1];
  const span = max - min;
  const step = span <= 8 ? 2 : span <= 20 ? 5 : span <= 60 ? 10 : 20;
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

function open(h: number, label: string): string {
  return `<svg viewBox="0 0 ${W} ${h}" class="block h-auto w-full" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">`;
}

function grid(h: number, lo: number, hi: number, unit: string, ticks = 4): string {
  let out = '';
  for (let i = 0; i <= ticks; i++) {
    const v = lo + ((hi - lo) * i) / ticks;
    const y = T + (h - T - B) * (1 - i / ticks);
    out += `<line x1="${L}" x2="${W - R}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="stroke-line" stroke-width="1"/>`;
    out += `<text x="${L - 5}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" class="fill-ink-muted" font-size="10">${Math.round(v)}${unit}</text>`;
  }
  return out;
}

function xLabels(labels: string[], h: number, every: number): string {
  const count = labels.length;
  const band = (W - L - R) / count;
  let out = '';
  labels.forEach((label, i) => {
    if (i % every !== 0) return;
    const x = L + band * i + band / 2;
    out += `<text x="${x.toFixed(1)}" y="${h - 8}" text-anchor="middle" class="fill-ink-muted" font-size="10">${esc(label)}</text>`;
  });
  return out;
}

/** Linhas (uma ou mais series) sobre o mesmo eixo. */
export function lineChart(opts: {
  labels: string[];
  series: LineSeries[];
  unit?: string;
  every?: number;
  height?: number;
  aria: string;
}): string {
  const h = opts.height ?? 200;
  const unit = opts.unit ?? '°';
  const all = opts.series.flatMap((s) => s.values);
  if (all.length === 0) return '';
  const [lo, hi] = niceRange(Math.min(...all), Math.max(...all));
  const count = opts.labels.length;
  const band = (W - L - R) / count;
  const y = (v: number) => T + (h - T - B) * (1 - (v - lo) / (hi - lo));

  let out = open(h, opts.aria) + grid(h, lo, hi, unit);
  for (const s of opts.series) {
    const pts = s.values.map((v, i) => `${(L + band * i + band / 2).toFixed(1)},${y(v).toFixed(1)}`);
    out += `<polyline points="${pts.join(' ')}" fill="none" class="${s.cls}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  out += xLabels(opts.labels, h, opts.every ?? 1);
  return out + '</svg>';
}

/** Barras verticais a partir de zero, com rotulo de valor opcional. */
export function barChart(opts: {
  labels: string[];
  values: number[];
  unit?: string;
  every?: number;
  height?: number;
  showValues?: boolean;
  max?: number;
  cls?: string;
  aria: string;
}): string {
  const h = opts.height ?? 180;
  const unit = opts.unit ?? '';
  if (opts.values.length === 0) return '';
  const hi = opts.max ?? niceRange(0, Math.max(...opts.values, 1))[1];
  const count = opts.values.length;
  const band = (W - L - R) / count;
  const barW = Math.max(2, band * 0.64);
  const y = (v: number) => T + (h - T - B) * (1 - v / hi);
  const cls = opts.cls ?? 'fill-nioaque-green';

  let out = open(h, opts.aria) + grid(h, 0, hi, unit);
  opts.values.forEach((v, i) => {
    const x = L + band * i + (band - barW) / 2;
    const top = y(v);
    const height = Math.max(v > 0 ? 1.5 : 0, h - B - top);
    out += `<rect x="${x.toFixed(1)}" y="${(h - B - height).toFixed(1)}" width="${barW.toFixed(1)}" height="${height.toFixed(1)}" rx="1.5" class="${cls}"/>`;
    if (opts.showValues && v > 0) {
      out += `<text x="${(x + barW / 2).toFixed(1)}" y="${(h - B - height - 3).toFixed(1)}" text-anchor="middle" class="fill-ink" font-size="9" font-weight="600">${v}</text>`;
    }
  });
  out += xLabels(opts.labels, h, opts.every ?? 1);
  return out + '</svg>';
}

/** Faixa minima-maxima por dia (barra flutuante) com os valores nas pontas. */
export function rangeChart(opts: {
  labels: string[];
  mins: number[];
  maxs: number[];
  aria: string;
}): string {
  const h = 210;
  const count = opts.labels.length;
  if (count === 0) return '';
  const [lo, hi] = niceRange(Math.min(...opts.mins) - 2, Math.max(...opts.maxs) + 2);
  const band = (W - L - R) / count;
  const barW = Math.min(16, band * 0.5);
  const y = (v: number) => T + (h - T - B) * (1 - (v - lo) / (hi - lo));

  let out = open(h, opts.aria) + grid(h, lo, hi, '°');
  opts.maxs.forEach((mx, i) => {
    const mn = opts.mins[i];
    const cx = L + band * i + band / 2;
    const top = y(mx);
    const bottom = y(mn);
    out += `<rect x="${(cx - barW / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(3, bottom - top).toFixed(1)}" rx="${(barW / 2).toFixed(1)}" class="fill-nioaque-red-dark" fill-opacity="0.85"/>`;
    out += `<text x="${cx.toFixed(1)}" y="${(top - 4).toFixed(1)}" text-anchor="middle" class="fill-ink" font-size="10" font-weight="700">${mx}°</text>`;
    out += `<text x="${cx.toFixed(1)}" y="${(bottom + 12).toFixed(1)}" text-anchor="middle" class="fill-ink-muted" font-size="10">${mn}°</text>`;
  });
  out += xLabels(opts.labels, h, 1);
  return out + '</svg>';
}
