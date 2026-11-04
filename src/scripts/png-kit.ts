/**
 * Utilidades de desenho em canvas para as imagens PNG 1080x1440 da Transparencia.
 * Sem bibliotecas: tudo e' desenhado direto (fontes Bitter e Chivo do site).
 */
import { FOCOS, recorte } from '../lib/foto-foco';

export const W = 1080;
export const H = 1440;
export const PAPEL = '#F7F5F0';
export const TINTA = '#1B1F1C';
export const SUAVE = '#4A4F4A';
export const PEDRA = '#E5E0D5';
export const MATA = '#0D4722';
export const VERDE = '#166A34';
export const VERMELHO = '#D92323';
export const VERMELHO_TEXTO = '#B01E1E';
export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const SERIF = 'Bitter, Georgia, serif';
export const SANS = 'Chivo, system-ui, sans-serif';

export const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
export const brlInt = (v: number) => `R$ ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(v))}`;
export const pct = (v: number, total: number) => (total ? `${((v / total) * 100).toFixed(1).replace('.', ',')}%` : '0%');

export type Ctx = CanvasRenderingContext2D;

export async function prepararFontes(): Promise<void> {
  await Promise.all([
    document.fonts.load('800 40px Bitter'),
    document.fonts.load('500 24px Chivo'),
    document.fonts.load('600 24px Chivo'),
    document.fonts.load('700 24px Chivo'),
    document.fonts.load('800 24px Chivo').catch(() => undefined),
  ]).catch(() => undefined);
}

export function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function novaTela(): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponível');
  ctx.fillStyle = PAPEL;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  return { canvas, ctx };
}

export function fonte(ctx: Ctx, peso: number, px: number, familia = SANS) {
  ctx.font = `${peso} ${px}px ${familia}`;
}

/** Reduz a fonte ate o texto caber na largura; deixa a fonte pronta para desenhar. */
export function ajustar(ctx: Ctx, texto: string, peso: number, px: number, max: number, familia = SANS): number {
  let t = px;
  while (t > 14) {
    fonte(ctx, peso, t, familia);
    if (ctx.measureText(texto).width <= max) break;
    t -= 1;
  }
  fonte(ctx, peso, t, familia);
  return t;
}

export function cortar(ctx: Ctx, texto: string, max: number): string {
  if (ctx.measureText(texto).width <= max) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Quebra o texto em linhas (a fonte ja deve estar definida). A ultima linha ganha reticencias se faltar espaco. */
export function quebrar(ctx: Ctx, texto: string, max: number, maxLinhas: number): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width <= max || !atual) atual = teste;
    else {
      linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  if (linhas.length > maxLinhas) {
    const resto = linhas.slice(maxLinhas - 1).join(' ');
    return [...linhas.slice(0, maxLinhas - 1), cortar(ctx, resto, max)];
  }
  return linhas;
}

export function retArredondado(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function caixa(ctx: Ctx, x: number, y: number, w: number, h: number, destaque = false) {
  retArredondado(ctx, x, y, w, h, 6);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.lineWidth = destaque ? 3 : 2;
  ctx.strokeStyle = destaque ? VERDE : PEDRA;
  ctx.stroke();
}

export function caixaVerde(ctx: Ctx, x: number, y: number, w: number, h: number) {
  retArredondado(ctx, x, y, w, h, 6);
  ctx.fillStyle = MATA;
  ctx.fill();
}

export function secao(ctx: Ctx, texto: string, y: number) {
  ctx.fillStyle = VERMELHO;
  ctx.fillRect(54, y, 6, 34);
  ctx.fillStyle = TINTA;
  fonte(ctx, 800, 32, SERIF);
  ctx.fillText(texto, 76, y + 30);
}

export function cabecalho(ctx: Ctx, logo: HTMLImageElement | null, direita: string) {
  ctx.fillStyle = MATA;
  ctx.fillRect(0, 0, W, 150);
  if (logo) {
    const h = 74;
    const w = (logo.width / logo.height) * h || 300;
    ctx.drawImage(logo, 54, 38, w, h);
  } else {
    ctx.fillStyle = '#fff';
    fonte(ctx, 800, 44, SERIF);
    ctx.fillText('O NIOAQUENSE', 54, 92);
  }
  ctx.fillStyle = '#CFE0D3';
  fonte(ctx, 700, 22);
  ctx.textAlign = 'right';
  ctx.fillText(direita.toUpperCase(), W - 54, 82);
  ctx.textAlign = 'left';
  ctx.fillStyle = VERMELHO;
  ctx.fillRect(0, 150, W, 6);
}

export function rodape(ctx: Ctx, textoFonte: string) {
  const y = H - 112;
  ctx.fillStyle = MATA;
  ctx.fillRect(0, y, W, 112);
  ctx.fillStyle = VERMELHO;
  ctx.fillRect(0, y, W, 5);
  ctx.fillStyle = '#fff';
  fonte(ctx, 800, 34, SERIF);
  ctx.fillText('onioaquense.com/transparencia', 54, y + 50);
  ctx.fillStyle = '#CFE0D3';
  ajustar(ctx, textoFonte, 500, 21, W - 108);
  ctx.fillText(textoFonte, 54, y + 86);
}

/** Titulo grande + subtitulo, a partir de y. */
export function titulo(ctx: Ctx, texto: string, sub: string, y: number) {
  ctx.fillStyle = TINTA;
  ajustar(ctx, texto, 800, 56, W - 108, SERIF);
  ctx.fillText(texto, 54, y + 56);
  ctx.fillStyle = SUAVE;
  ajustar(ctx, sub, 500, 28, W - 108);
  ctx.fillText(sub, 54, y + 100);
}

/** Foto redonda enquadrada no rosto (usa o mapa de focos; sem foco, recorte central ancorado no topo). */
export function fotoRosto(ctx: Ctx, img: HTMLImageElement | null, foto: string | null, cx: number, cy: number, r: number, inicial: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) {
    const foco = foto ? FOCOS[foto] : null;
    if (foco) {
      const { sx, sy, s } = recorte({ ...foco, w: img.naturalWidth || foco.w, h: img.naturalHeight || foco.h });
      ctx.drawImage(img, sx, sy, s, s, cx - r, cy - r, r * 2, r * 2);
    } else {
      const lado = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - lado) / 2, 0, lado, lado, cx - r, cy - r, r * 2, r * 2);
    }
  } else {
    ctx.fillStyle = PEDRA;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = SUAVE;
    fonte(ctx, 800, r, SERIF);
    ctx.textAlign = 'center';
    ctx.fillText(inicial, cx, cy + r * 0.35);
    ctx.textAlign = 'left';
  }
  ctx.restore();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

/** Grafico de barras por mes (12 colunas), com valores em "k". */
export function barrasMensais(ctx: Ctx, valores: number[], x: number, y: number, w: number, h: number, cor: string, ate = 12) {
  const max = Math.max(...valores, 1);
  const larg = w / ate;
  for (let i = 0; i < ate; i++) {
    const val = valores[i] ?? 0;
    const alt = val > 0 ? Math.max(6, (val / max) * (h - 56)) : 0;
    const bx = x + i * larg + 6;
    ctx.fillStyle = cor;
    if (alt) ctx.fillRect(bx, y + h - 28 - alt, larg - 12, alt);
    ctx.fillStyle = SUAVE;
    fonte(ctx, 600, 19);
    ctx.textAlign = 'center';
    ctx.fillText(MESES[i].toUpperCase(), bx + (larg - 12) / 2, y + h - 4);
    if (val > 0) {
      ctx.fillStyle = TINTA;
      fonte(ctx, 700, 17);
      const txt = val >= 1_000_000 ? `${(val / 1_000_000).toFixed(1).replace('.', ',')} mi` : val >= 1000 ? `${Math.round(val / 1000)} mil` : `R$ ${Math.round(val)}`;
      ctx.fillText(txt, bx + (larg - 12) / 2, y + h - 34 - alt);
    }
    ctx.textAlign = 'left';
  }
}

/** Barra empilhada horizontal com legenda em linhas (cor, nome, valor e %). Devolve o y final. */
export function barraEmpilhada(ctx: Ctx, itens: { label: string; valor: number; cor: string }[], y: number): number {
  const total = itens.reduce((s, c) => s + c.valor, 0) || 1;
  const larg = W - 108;
  let x = 54;
  retArredondado(ctx, 54, y, larg, 36, 6);
  ctx.save();
  ctx.clip();
  for (const c of itens) {
    const w = (c.valor / total) * larg;
    ctx.fillStyle = c.cor;
    ctx.fillRect(x, y, w, 36);
    x += w;
  }
  ctx.restore();
  itens.forEach((c, i) => {
    const cy = y + 52 + i * 34;
    ctx.fillStyle = c.cor;
    ctx.fillRect(54, cy + 2, 22, 22);
    ctx.fillStyle = TINTA;
    fonte(ctx, 600, 24);
    ctx.fillText(cortar(ctx, c.label, larg - 360), 88, cy + 21);
    fonte(ctx, 800, 24);
    ctx.textAlign = 'right';
    ctx.fillText(`${brlInt(c.valor)}  ·  ${pct(c.valor, total)}`, 54 + larg, cy + 21);
    ctx.textAlign = 'left';
  });
  return y + 52 + itens.length * 34;
}

export async function salvar(canvas: HTMLCanvasElement, nomeArquivo: string): Promise<void> {
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) throw new Error('não foi possível gerar a imagem');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
