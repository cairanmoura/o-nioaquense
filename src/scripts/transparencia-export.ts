/**
 * Exporta o resumo de despesas da Camara como imagem PNG 1080x1440.
 * Desenha direto no canvas (sem bibliotecas) a partir dos dados embutidos na
 * pagina (<script id="export-data" type="application/json">).
 */

interface VereadorExport {
  slug: string;
  nome: string;
  cargo: string;
  partido: string;
  foto: string;
  total: number;
  quantidade: number;
  dias: number;
  porMes: number[];
  lista: { data: string; destino: string; valor: number; dias: number }[];
}

interface ExportData {
  ano: number;
  periodo: string;
  atualizadoEm: string;
  total: { empenhado: number; liquidado: number; pago: number };
  categorias: { label: string; cor: string; valor: number }[];
  diarias: { total: number; quantidade: number; pctGasto: number; equipeTotal: number; equipeQtd: number; vereadoresTotal: number };
  vereadores: VereadorExport[];
}

const W = 1080;
const H = 1440;
const PAPEL = '#F7F5F0';
const TINTA = '#1B1F1C';
const SUAVE = '#4A4F4A';
const PEDRA = '#E5E0D5';
const MATA = '#0D4722';
const VERDE = '#166A34';
const VERMELHO = '#D92323';
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const brlInt = (v: number) => `R$ ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Math.round(v))}`;

const SERIF = 'Bitter, Georgia, serif';
const SANS = 'Chivo, system-ui, sans-serif';

function carregarImagem(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fonte(ctx: CanvasRenderingContext2D, peso: number, px: number, familia = SANS) {
  ctx.font = `${peso} ${px}px ${familia}`;
}

/** Reduz a fonte ate o texto caber na largura. */
function ajustar(ctx: CanvasRenderingContext2D, texto: string, peso: number, px: number, max: number, familia = SANS): number {
  let t = px;
  while (t > 14) {
    fonte(ctx, peso, t, familia);
    if (ctx.measureText(texto).width <= max) break;
    t -= 1;
  }
  return t;
}

function cortar(ctx: CanvasRenderingContext2D, texto: string, max: number): string {
  if (ctx.measureText(texto).width <= max) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function retArredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function foto(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, cy: number, r: number, inicial: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) {
    // recorte "cover" quadrado, ancorado no topo (rostos)
    const lado = Math.min(img.width, img.height);
    const sx = (img.width - lado) / 2;
    ctx.drawImage(img, sx, 0, lado, lado, cx - r, cy - r, r * 2, r * 2);
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

function cabecalho(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null, direita: string) {
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
  // filete duplo verde/vermelho
  ctx.fillStyle = VERMELHO;
  ctx.fillRect(0, 150, W, 6);
}

function rodape(ctx: CanvasRenderingContext2D, atualizadoEm: string) {
  const y = H - 112;
  ctx.fillStyle = MATA;
  ctx.fillRect(0, y, W, 112);
  ctx.fillStyle = VERMELHO;
  ctx.fillRect(0, y, W, 5);
  ctx.fillStyle = '#fff';
  fonte(ctx, 800, 34, SERIF);
  ctx.fillText('onioaquense.com/transparencia', 54, y + 50);
  ctx.fillStyle = '#CFE0D3';
  const data = new Date(atualizadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Campo_Grande' });
  const fonteTxt = `Fonte: Portal da Transparência da Câmara de Nioaque (Quality Sistemas) · dados de ${data}`;
  ajustar(ctx, fonteTxt, 500, 21, W - 108);
  ctx.fillText(fonteTxt, 54, y + 86);
}

function titulo(ctx: CanvasRenderingContext2D, texto: string, sub: string, y: number) {
  ctx.fillStyle = TINTA;
  const px = ajustar(ctx, texto, 800, 56, W - 108, SERIF);
  fonte(ctx, 800, px, SERIF);
  ctx.fillText(texto, 54, y + 56);
  ctx.fillStyle = SUAVE;
  fonte(ctx, 500, 28);
  ctx.fillText(sub, 54, y + 100);
}

function secao(ctx: CanvasRenderingContext2D, texto: string, y: number) {
  ctx.fillStyle = VERMELHO;
  ctx.fillRect(54, y, 6, 34);
  ctx.fillStyle = TINTA;
  fonte(ctx, 800, 32, SERIF);
  ctx.fillText(texto, 76, y + 30);
}

function caixa(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, destaque = false) {
  retArredondado(ctx, x, y, w, h, 6);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.lineWidth = destaque ? 3 : 2;
  ctx.strokeStyle = destaque ? VERDE : PEDRA;
  ctx.stroke();
}

/* -------------------------------------------------------------------------- */
/* Resumo do ano                                                               */
/* -------------------------------------------------------------------------- */

async function desenharResumo(ctx: CanvasRenderingContext2D, d: ExportData, logo: HTMLImageElement | null, fotos: Map<string, HTMLImageElement | null>) {
  cabecalho(ctx, logo, 'Transparência');
  titulo(ctx, 'Despesas da Câmara de Nioaque', d.periodo, 180);

  // Totais
  const bw = (W - 108 - 40) / 3;
  const totais: [string, number, boolean][] = [
    ['Reservado', d.total.empenhado, false],
    ['Serviço entregue', d.total.liquidado, false],
    ['Dinheiro que saiu', d.total.pago, true],
  ];
  totais.forEach(([rot, v, dest], i) => {
    const x = 54 + i * (bw + 20);
    caixa(ctx, x, 300, bw, 104, dest);
    ctx.fillStyle = dest ? VERDE : SUAVE;
    fonte(ctx, 700, 20);
    ctx.fillText(rot.toUpperCase(), x + 20, 336);
    ctx.fillStyle = dest ? MATA : TINTA;
    const px = ajustar(ctx, brlInt(v), 800, 38, bw - 40, SERIF);
    fonte(ctx, 800, px, SERIF);
    ctx.fillText(brlInt(v), x + 20, 384);
  });

  // Composição (barra única + legenda)
  secao(ctx, 'Para onde foi o dinheiro', 424);
  const totalPago = d.categorias.reduce((s, c) => s + c.valor, 0) || 1;
  let x = 54;
  const larg = W - 108;
  retArredondado(ctx, 54, 472, larg, 36, 6);
  ctx.save();
  ctx.clip();
  d.categorias.forEach((c) => {
    const w = (c.valor / totalPago) * larg;
    ctx.fillStyle = c.cor;
    ctx.fillRect(x, 472, w, 36);
    x += w;
  });
  ctx.restore();
  d.categorias.forEach((c, i) => {
    const col = 0;
    const lin = i;
    const cx = 54 + col;
    const cy = 524 + lin * 34;
    ctx.fillStyle = c.cor;
    ctx.fillRect(cx, cy + 2, 22, 22);
    ctx.fillStyle = TINTA;
    fonte(ctx, 600, 24);
    ctx.fillText(c.label, cx + 34, cy + 21);
    fonte(ctx, 800, 24);
    ctx.textAlign = 'right';
    ctx.fillText(`${brlInt(c.valor)}  ·  ${Math.round((c.valor / totalPago) * 100)}%`, cx + larg, cy + 21);
    ctx.textAlign = 'left';
  });

  // Vereadores
  secao(ctx, 'Diárias por vereador', 672);
  const cols = 3;
  const cw = (W - 108 - 2 * 16) / cols;
  const ch = 148;
  d.vereadores.forEach((v, i) => {
    const col = i % cols;
    const lin = Math.floor(i / cols);
    const bx = 54 + col * (cw + 16);
    const by = 722 + lin * (ch + 12);
    caixa(ctx, bx, by, cw, ch);
    foto(ctx, fotos.get(v.slug) ?? null, bx + 62, by + 58, 42, v.nome[0]);
    ctx.fillStyle = TINTA;
    const nomeX = bx + 120;
    const px = ajustar(ctx, v.nome, 800, 25, cw - 130, SERIF);
    fonte(ctx, 800, px, SERIF);
    ctx.fillText(v.nome, nomeX, by + 40);
    ctx.fillStyle = SUAVE;
    fonte(ctx, 500, 19);
    ctx.fillText(cortar(ctx, `${v.cargo} · ${v.partido}`, cw - 130), nomeX, by + 64);
    ctx.fillStyle = v.total > 0 ? VERMELHO : SUAVE;
    const pv = ajustar(ctx, v.total > 0 ? brlInt(v.total) : 'R$ 0', 800, 32, cw - 130, SERIF);
    fonte(ctx, 800, pv, SERIF);
    ctx.fillText(v.total > 0 ? brlInt(v.total) : 'R$ 0', nomeX, by + 102);
    ctx.fillStyle = SUAVE;
    fonte(ctx, 600, 20);
    ctx.fillText(v.quantidade === 0 ? 'nenhuma diária' : `${v.quantidade} ${v.quantidade === 1 ? 'diária' : 'diárias'}${v.dias > 0 ? ` · ${v.dias} ${v.dias === 1 ? 'dia' : 'dias'}` : ''}`, bx + 20, by + ch - 14);
  });

  // Resumo das diárias
  const yb = 722 + 3 * (ch + 12) + 4;
  retArredondado(ctx, 54, yb, W - 108, 84, 6);
  ctx.fillStyle = MATA;
  ctx.fill();
  ctx.fillStyle = '#fff';
  fonte(ctx, 800, 34, SERIF);
  ctx.fillText(`Diárias no ano: ${brl(d.diarias.total)}`, 78, yb + 36);
  ctx.fillStyle = '#CFE0D3';
  fonte(ctx, 500, 21);
  ctx.fillText(
    cortar(ctx, `${d.diarias.quantidade} pagamentos · ${d.diarias.pctGasto.toFixed(1).replace('.', ',')}% do gasto · vereadores ${brlInt(d.diarias.vereadoresTotal)} · equipe ${brlInt(d.diarias.equipeTotal)}`, W - 156),
    78,
    yb + 68,
  );
}

/* -------------------------------------------------------------------------- */
/* Um vereador                                                                 */
/* -------------------------------------------------------------------------- */

async function desenharVereador(ctx: CanvasRenderingContext2D, d: ExportData, v: VereadorExport, logo: HTMLImageElement | null, fotos: Map<string, HTMLImageElement | null>) {
  cabecalho(ctx, logo, 'Transparência');
  foto(ctx, fotos.get(v.slug) ?? null, 54 + 110, 180 + 120, 110, v.nome[0]);
  ctx.fillStyle = VERDE;
  fonte(ctx, 700, 22);
  ctx.fillText('DIÁRIAS DO VEREADOR', 300, 250);
  ctx.fillStyle = TINTA;
  const px = ajustar(ctx, v.nome, 800, 58, W - 354, SERIF);
  fonte(ctx, 800, px, SERIF);
  ctx.fillText(v.nome, 300, 312);
  ctx.fillStyle = SUAVE;
  fonte(ctx, 500, 28);
  ctx.fillText(`${v.cargo} · ${v.partido} · ${d.periodo}`, 300, 358);

  // estatísticas
  const bw = (W - 108 - 40) / 3;
  const media = v.quantidade ? v.total / v.quantidade : 0;
  const stats: [string, string, boolean][] = [
    ['Total recebido', brl(v.total), true],
    ['Diárias', `${v.quantidade}${v.dias > 0 ? ` (${v.dias} ${v.dias === 1 ? 'dia' : 'dias'})` : ''}`, false],
    ['Média por diária', brl(media), false],
  ];
  stats.forEach(([rot, val, dest], i) => {
    const x = 54 + i * (bw + 20);
    caixa(ctx, x, 440, bw, 118, dest);
    ctx.fillStyle = dest ? VERDE : SUAVE;
    fonte(ctx, 700, 19);
    ctx.fillText(rot.toUpperCase(), x + 20, 476);
    ctx.fillStyle = dest ? MATA : TINTA;
    const p = ajustar(ctx, val, 800, 34, bw - 40, SERIF);
    fonte(ctx, 800, p, SERIF);
    ctx.fillText(val, x + 20, 528);
  });

  // gráfico mensal
  secao(ctx, 'Mês a mês', 596);
  const gx = 54;
  const gy = 650;
  const gw = W - 108;
  const gh = 190;
  const max = Math.max(...v.porMes, 1);
  const cwid = gw / 12;
  v.porMes.forEach((val, i) => {
    const h = val > 0 ? Math.max(6, (val / max) * (gh - 40)) : 0;
    const x = gx + i * cwid + 6;
    ctx.fillStyle = VERDE;
    if (h) ctx.fillRect(x, gy + gh - 28 - h, cwid - 12, h);
    ctx.fillStyle = SUAVE;
    fonte(ctx, 600, 19);
    ctx.textAlign = 'center';
    ctx.fillText(MESES[i].toUpperCase(), x + (cwid - 12) / 2, gy + gh - 4);
    if (val > 0) {
      ctx.fillStyle = TINTA;
      fonte(ctx, 700, 17);
      ctx.fillText(val >= 1000 ? `${(val / 1000).toFixed(1).replace('.', ',')}k` : String(Math.round(val)), x + (cwid - 12) / 2, gy + gh - 34 - h);
    }
    ctx.textAlign = 'left';
  });

  // lista
  secao(ctx, 'Diárias mais recentes', 870);
  const linhas = v.lista.slice(0, 9);
  if (linhas.length === 0) {
    ctx.fillStyle = SUAVE;
    fonte(ctx, 500, 26);
    ctx.fillText('Nenhuma diária registrada neste período.', 54, 940);
  }
  linhas.forEach((l, i) => {
    const y = 920 + i * 44;
    if (i % 2 === 0) {
      ctx.fillStyle = '#EFEBE1';
      ctx.fillRect(54, y - 4, W - 108, 42);
    }
    ctx.fillStyle = SUAVE;
    fonte(ctx, 600, 23);
    const [yy, mm, dd] = l.data.split('-');
    ctx.fillText(`${dd}/${mm}/${yy}`, 70, y + 26);
    ctx.fillStyle = TINTA;
    fonte(ctx, 500, 23);
    ctx.fillText(cortar(ctx, `${l.destino}${l.dias > 1 ? ` · ${l.dias} dias` : ''}`, 520), 230, y + 26);
    fonte(ctx, 800, 24);
    ctx.textAlign = 'right';
    ctx.fillText(brl(l.valor), W - 70, y + 26);
    ctx.textAlign = 'left';
  });
}


/* -------------------------------------------------------------------------- */
/* Secao "Diarias por vereador" isolada                                        */
/* -------------------------------------------------------------------------- */

function desenharVereadores(ctx: CanvasRenderingContext2D, d: ExportData, logo: HTMLImageElement | null, fotos: Map<string, HTMLImageElement | null>) {
  cabecalho(ctx, logo, 'Transparência');
  ctx.fillStyle = VERDE;
  fonte(ctx, 700, 22);
  ctx.fillText(`CÂMARA MUNICIPAL DE NIOAQUE · ${d.periodo.toUpperCase()}`, 54, 214);
  ctx.fillStyle = TINTA;
  fonte(ctx, 800, 58, SERIF);
  ctx.fillText('Diárias por vereador', 54, 280);

  const cols = 3;
  const gap = 16;
  const cw = (W - 108 - (cols - 1) * gap) / cols;
  const ch = 318;
  const max = Math.max(...d.vereadores.map((v) => v.total), 1);
  d.vereadores.forEach((v, i) => {
    const col = i % cols;
    const lin = Math.floor(i / cols);
    const bx = 54 + col * (cw + gap);
    const by = 312 + lin * (ch + gap);
    caixa(ctx, bx, by, cw, ch);
    foto(ctx, fotos.get(v.slug) ?? null, bx + cw / 2, by + 74, 52, v.nome[0]);
    ctx.textAlign = 'center';
    ctx.fillStyle = TINTA;
    const px = ajustar(ctx, v.nome, 800, 27, cw - 24, SERIF);
    fonte(ctx, 800, px, SERIF);
    ctx.fillText(v.nome, bx + cw / 2, by + 158);
    ctx.fillStyle = SUAVE;
    fonte(ctx, 500, 19);
    ctx.fillText(cortar(ctx, `${v.cargo} · ${v.partido}`, cw - 24), bx + cw / 2, by + 184);
    ctx.fillStyle = v.total > 0 ? VERMELHO : SUAVE;
    const txt = v.total > 0 ? brl(v.total) : 'R$ 0,00';
    const pv = ajustar(ctx, txt, 800, 34, cw - 24, SERIF);
    fonte(ctx, 800, pv, SERIF);
    ctx.fillText(txt, bx + cw / 2, by + 232);
    ctx.fillStyle = SUAVE;
    fonte(ctx, 600, 20);
    ctx.fillText(v.quantidade === 0 ? 'nenhuma diária' : `${v.quantidade} ${v.quantidade === 1 ? 'diária' : 'diárias'}${v.dias > 0 ? ` · ${v.dias} ${v.dias === 1 ? 'dia' : 'dias'}` : ''}`, bx + cw / 2, by + 262);
    ctx.textAlign = 'left';
    // barra proporcional
    ctx.fillStyle = PEDRA;
    ctx.fillRect(bx + 20, by + ch - 30, cw - 40, 10);
    ctx.fillStyle = VERMELHO;
    ctx.fillRect(bx + 20, by + ch - 30, (cw - 40) * (v.total / max), 10);
  });

  const yb = 312 + 3 * (ch + gap) + 2;
  retArredondado(ctx, 54, yb, W - 108, 78, 6);
  ctx.fillStyle = MATA;
  ctx.fill();
  ctx.fillStyle = '#fff';
  fonte(ctx, 800, 32, SERIF);
  ctx.fillText(`Diárias dos vereadores: ${brl(d.diarias.vereadoresTotal)}`, 78, yb + 34);
  ctx.fillStyle = '#CFE0D3';
  fonte(ctx, 500, 20);
  ctx.fillText(cortar(ctx, `Total de diárias da Câmara: ${brl(d.diarias.total)} (inclui assessores e equipe: ${brlInt(d.diarias.equipeTotal)})`, W - 156), 78, yb + 62);
}

/* -------------------------------------------------------------------------- */
/* Entrada                                                                     */
/* -------------------------------------------------------------------------- */

async function gerar(d: ExportData, slug: string | null): Promise<void> {
  await Promise.all([
    document.fonts.load(`800 40px Bitter`),
    document.fonts.load(`500 24px Chivo`),
    document.fonts.load(`600 24px Chivo`),
    document.fonts.load(`700 24px Chivo`),
    document.fonts.load(`800 24px Chivo`).catch(() => undefined),
  ]).catch(() => undefined);

  const soVereadores = slug === '__vereadores__';
  const alvo = slug && !soVereadores ? d.vereadores.filter((v) => v.slug === slug) : d.vereadores;
  const fotos = new Map<string, HTMLImageElement | null>();
  const [logo] = await Promise.all([
    carregarImagem('/brand/logo-branca.svg'),
    ...alvo.map(async (v) => {
      fotos.set(v.slug, await carregarImagem(v.foto));
    }),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas indisponível');
  ctx.fillStyle = PAPEL;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  if (soVereadores) desenharVereadores(ctx, d, logo, fotos);
  else if (slug && alvo[0]) await desenharVereador(ctx, d, alvo[0], logo, fotos);
  else await desenharResumo(ctx, d, logo, fotos);
  rodape(ctx, d.atualizadoEm);

  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) throw new Error('não foi possível gerar a imagem');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = soVereadores ? `diarias-por-vereador-${d.ano}.png` : slug ? `diarias-${slug}-${d.ano}.png` : `despesas-camara-nioaque-${d.ano}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function iniciar() {
  const el = document.getElementById('export-data');
  if (!el?.textContent) return;
  const dados = JSON.parse(el.textContent) as ExportData;

  document.querySelectorAll<HTMLButtonElement>('[data-exportar-png]').forEach((btn) => {
    const rotulo = btn.querySelector('[data-rotulo]');
    btn.addEventListener('click', async () => {
      const original = rotulo?.textContent ?? '';
      btn.disabled = true;
      if (rotulo) rotulo.textContent = 'Gerando imagem…';
      try {
        await gerar(dados, btn.dataset.exportarPng || null);
        if (rotulo) rotulo.textContent = 'Imagem baixada';
      } catch {
        if (rotulo) rotulo.textContent = 'Não deu certo. Tente de novo';
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          if (rotulo) rotulo.textContent = original;
        }, 2500);
      }
    });
  });
}

iniciar();
