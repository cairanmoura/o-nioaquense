/**
 * Imagens PNG 1080x1440 da Transparencia da Prefeitura: resumo, receitas, primeiro escalao,
 * cada autoridade, secretarias, areas e maiores recebedores. Os dados vem embutidos na pagina
 * (<script id="pref-export-data" type="application/json">); nada e' buscado na hora.
 */
import {
  ajustar,
  barraEmpilhada,
  barrasMensais,
  brl,
  brlInt,
  cabecalho,
  caixa,
  caixaVerde,
  carregarImagem,
  cortar,
  fonte,
  fotoRosto,
  H,
  MATA,
  MESES,
  novaTela,
  PEDRA,
  pct,
  prepararFontes,
  quebrar,
  retArredondado,
  rodape,
  salvar,
  secao,
  SERIF,
  SUAVE,
  TINTA,
  titulo,
  VERDE,
  VERMELHO,
  VERMELHO_TEXTO,
  W,
  type Ctx,
} from './png-kit';

interface Item {
  nome: string;
  valor: number;
  qtd: number;
}
interface AutoridadeExp {
  slug: string;
  nome: string;
  cargo: string;
  cargoCurto: string;
  foto: string | null;
  total: number;
  qtd: number;
  diarias: number;
  lista: { d: string; valor: number; tipo: string; secretaria: string }[];
}
interface ReceitasExp {
  ano: number;
  bimestre: number;
  previsao: number;
  arrecadado: number;
  porBimestre: number[];
  grupos: { nome: string; previsao: number; arrecadado: number; cor: string }[];
  anoFontes: number | null;
  totalFontes: number;
  deducoesFontes: number;
  fontes: { nome: string; valor: number }[];
}
interface PrefExport {
  ano: number;
  periodo: string;
  atualizadoEm: string;
  totais: { empenhado: number; liquidado: number; pago: number; qtd: number };
  porMes: number[];
  ultimoMes: number;
  categorias: { label: string; cor: string; valor: number }[];
  licitacao: { com: number; sem: number };
  escalao: AutoridadeExp[];
  secretarias: Item[];
  areas: Item[];
  fornecedores: { nome: string; valor: number; qtd: number }[];
  receitas: ReceitasExp | null;
}

const dataBr = (iso: string) => iso.split('-').reverse().join('/');
const FONTE_DESPESAS = (d: PrefExport) =>
  `Fonte: Portal da Transparência da Prefeitura de Nioaque (Quality Sistemas) · dados de ${new Date(d.atualizadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Campo_Grande' })}`;
const NOTA_SALARIO = 'Salários não entram aqui: a folha de pagamento é paga em bloco. Veja o valor por cargo na Folha de pagamento do portal oficial.';

function tresCaixas(ctx: Ctx, y: number, itens: [string, string, boolean][]) {
  const bw = (W - 108 - 40) / 3;
  itens.forEach(([rot, val, dest], i) => {
    const x = 54 + i * (bw + 20);
    caixa(ctx, x, y, bw, 104, dest);
    ctx.fillStyle = dest ? VERDE : SUAVE;
    fonte(ctx, 700, 20);
    ctx.fillText(rot.toUpperCase(), x + 20, y + 36);
    ctx.fillStyle = dest ? MATA : TINTA;
    ajustar(ctx, val, 800, 38, bw - 40, SERIF);
    ctx.fillText(val, x + 20, y + 84);
  });
}

/* -------------------------------------------------------------------------- */

function desenharResumo(ctx: Ctx, d: PrefExport, logo: HTMLImageElement | null) {
  cabecalho(ctx, logo, 'Transparência');
  titulo(ctx, 'Despesas da Prefeitura de Nioaque', `${d.periodo} · ${d.totais.qtd.toLocaleString('pt-BR')} despesas`, 180);
  tresCaixas(ctx, 310, [
    ['Reservado', brlInt(d.totais.empenhado), false],
    ['Serviço entregue', brlInt(d.totais.liquidado), false],
    ['Dinheiro que saiu', brlInt(d.totais.pago), true],
  ]);

  secao(ctx, 'Em que o dinheiro foi gasto', 442);
  const fim = barraEmpilhada(ctx, d.categorias.filter((c) => c.valor > 0), 490);

  const yMes = fim + 24;
  secao(ctx, 'Pago mês a mês', yMes);
  barrasMensais(ctx, d.porMes, 54, yMes + 50, W - 108, 200, VERDE, 12);

  const yLic = yMes + 50 + 200 + 28;
  secao(ctx, 'Compras: com ou sem licitação?', yLic);
  const tot = d.licitacao.com + d.licitacao.sem || 1;
  const larg = W - 108;
  retArredondado(ctx, 54, yLic + 48, larg, 30, 6);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = VERDE;
  ctx.fillRect(54, yLic + 48, (d.licitacao.com / tot) * larg, 30);
  ctx.fillStyle = '#D97706';
  ctx.fillRect(54 + (d.licitacao.com / tot) * larg, yLic + 48, (d.licitacao.sem / tot) * larg, 30);
  ctx.restore();
  ctx.fillStyle = TINTA;
  fonte(ctx, 600, 22);
  ctx.fillText(`Com licitação ou contrato: ${brlInt(d.licitacao.com)} (${pct(d.licitacao.com, tot)})`, 54, yLic + 112);
  ctx.fillText(`Sem licitação informada: ${brlInt(d.licitacao.sem)} (${pct(d.licitacao.sem, tot)})`, 54, yLic + 144);
}

/* -------------------------------------------------------------------------- */

function desenharReceitas(ctx: Ctx, d: PrefExport, r: ReceitasExp, logo: HTMLImageElement | null) {
  cabecalho(ctx, logo, 'Transparência');
  const ate = MESES[Math.min(11, r.bimestre * 2 - 1)];
  const nomeAte = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][Math.min(11, r.bimestre * 2 - 1)];
  void ate;
  titulo(ctx, 'Receitas da Prefeitura de Nioaque', `De onde vem o dinheiro · janeiro a ${nomeAte} de ${r.ano}`, 180);
  tresCaixas(ctx, 310, [
    ['Arrecadado', brlInt(r.arrecadado), true],
    ['Previsto no ano', brlInt(r.previsao), false],
    ['Do previsto', pct(r.arrecadado, r.previsao), false],
  ]);

  secao(ctx, 'De onde veio o dinheiro', 442);
  const fim = barraEmpilhada(
    ctx,
    r.grupos.filter((g) => g.arrecadado > 0).map((g) => ({ label: g.nome, valor: g.arrecadado, cor: g.cor })),
    490,
  );

  const yB = fim + 22;
  secao(ctx, 'Arrecadação a cada dois meses', yB);
  const nb = r.porBimestre.length;
  const larg = W - 108;
  const max = Math.max(...r.porBimestre, 1);
  const cw = larg / Math.max(nb, 1);
  const gy = yB + 56;
  const gh = 150;
  r.porBimestre.forEach((v, i) => {
    const alt = Math.max(6, (v / max) * (gh - 56));
    const bx = 54 + i * cw + 10;
    ctx.fillStyle = VERDE;
    ctx.fillRect(bx, gy + gh - 28 - alt, cw - 20, alt);
    ctx.fillStyle = SUAVE;
    fonte(ctx, 600, 19);
    ctx.textAlign = 'center';
    ctx.fillText(`${MESES[i * 2].toUpperCase()}-${MESES[i * 2 + 1].toUpperCase()}`, bx + (cw - 20) / 2, gy + gh - 4);
    ctx.fillStyle = TINTA;
    fonte(ctx, 700, 18);
    ctx.fillText(`${(v / 1_000_000).toFixed(1).replace('.', ',')} mi`, bx + (cw - 20) / 2, gy + gh - 34 - alt);
    ctx.textAlign = 'left';
  });

  if (r.anoFontes && r.fontes.length) {
    const yF = gy + gh + 22;
    secao(ctx, `Principais fontes em ${r.anoFontes}`, yF);
    r.fontes.slice(0, 4).forEach((f, i) => {
      const y = yF + 54 + i * 30;
      ctx.fillStyle = TINTA;
      fonte(ctx, 600, 22);
      ctx.fillText(cortar(ctx, f.nome, 640), 54, y);
      fonte(ctx, 800, 22);
      ctx.textAlign = 'right';
      ctx.fillText(`${brlInt(f.valor)} · ${pct(f.valor, r.totalFontes)}`, W - 54, y);
      ctx.textAlign = 'left';
    });
  }
}

/* -------------------------------------------------------------------------- */

function desenharEscalao(ctx: Ctx, d: PrefExport, logo: HTMLImageElement | null, imgs: Map<string, HTMLImageElement | null>) {
  cabecalho(ctx, logo, 'Transparência');
  titulo(ctx, 'Primeiro escalão da Prefeitura', `Pagamentos em nome de cada autoridade em ${d.ano} (diárias, reembolsos e similares)`, 180);

  const cols = 3;
  const gap = 16;
  const cw = (W - 108 - (cols - 1) * gap) / cols;
  const ch = 238;
  d.escalao.forEach((a, i) => {
    const col = i % cols;
    const lin = Math.floor(i / cols);
    const bx = 54 + col * (cw + gap);
    const by = 310 + lin * (ch + 12);
    caixa(ctx, bx, by, cw, ch);
    fotoRosto(ctx, imgs.get(a.slug) ?? null, a.foto, bx + cw / 2, by + 58, 44, a.nome[0]);
    ctx.textAlign = 'center';
    ctx.fillStyle = TINTA;
    ajustar(ctx, a.nome, 800, 25, cw - 24, SERIF);
    ctx.fillText(a.nome, bx + cw / 2, by + 136);
    ctx.fillStyle = SUAVE;
    fonte(ctx, 500, 16);
    quebrar(ctx, a.cargoCurto, cw - 28, 2).forEach((l, k) => ctx.fillText(l, bx + cw / 2, by + 158 + k * 18));
    ctx.fillStyle = a.total > 0 ? VERMELHO_TEXTO : SUAVE;
    const txt = a.total > 0 ? brl(a.total) : 'R$ 0,00';
    ajustar(ctx, txt, 800, 32, cw - 24, SERIF);
    ctx.fillText(txt, bx + cw / 2, by + 208);
    ctx.fillStyle = SUAVE;
    fonte(ctx, 600, 17);
    ctx.fillText(a.qtd === 0 ? 'nenhum pagamento individual' : `${a.qtd} ${a.qtd === 1 ? 'pagamento' : 'pagamentos'}${a.diarias > 0 ? ' · diárias' : ''}`, bx + cw / 2, by + 230);
    ctx.textAlign = 'left';
  });

  // Quadro-resumo no ultimo espaco da grade
  const i = d.escalao.length;
  const col = i % cols;
  const lin = Math.floor(i / cols);
  const bx = 54 + col * (cw + gap);
  const by = 310 + lin * (ch + 12);
  const lw = W - 54 - bx;
  caixaVerde(ctx, bx, by, lw, ch);
  const total = d.escalao.reduce((s, a) => s + a.total, 0);
  ctx.fillStyle = '#CFE0D3';
  fonte(ctx, 700, 19);
  ctx.fillText('TOTAL EM NOME DO PRIMEIRO ESCALÃO', bx + 22, by + 40);
  ctx.fillStyle = '#fff';
  ajustar(ctx, brl(total), 800, 44, lw - 44, SERIF);
  ctx.fillText(brl(total), bx + 22, by + 92);
  ctx.fillStyle = '#CFE0D3';
  fonte(ctx, 500, 18);
  quebrar(ctx, NOTA_SALARIO, lw - 44, 4).forEach((l, k) => ctx.fillText(l, bx + 22, by + 130 + k * 24));
}

/* -------------------------------------------------------------------------- */

function desenharAutoridade(ctx: Ctx, d: PrefExport, a: AutoridadeExp, logo: HTMLImageElement | null, img: HTMLImageElement | null) {
  cabecalho(ctx, logo, 'Transparência');
  fotoRosto(ctx, img, a.foto, 54 + 110, 180 + 120, 110, a.nome[0]);
  ctx.fillStyle = VERDE;
  fonte(ctx, 700, 22);
  ctx.fillText('PRIMEIRO ESCALÃO · PREFEITURA DE NIOAQUE', 300, 244);
  ctx.fillStyle = TINTA;
  ajustar(ctx, a.nome, 800, 56, W - 354, SERIF);
  ctx.fillText(a.nome, 300, 308);
  ctx.fillStyle = SUAVE;
  fonte(ctx, 500, 26);
  quebrar(ctx, `${a.cargoCurto} · ${d.periodo}`, W - 354, 2).forEach((l, k) => ctx.fillText(l, 300, 350 + k * 32));

  tresCaixas(ctx, 440, [
    ['Pago em nome', brl(a.total), true],
    ['Pagamentos', String(a.qtd), false],
    ['Diárias', a.diarias > 0 ? brl(a.diarias) : 'R$ 0,00', false],
  ]);

  secao(ctx, 'Pagamentos mais recentes', 578);
  if (a.lista.length === 0) {
    ctx.fillStyle = SUAVE;
    fonte(ctx, 500, 26);
    ctx.fillText(`Nenhum pagamento individual registrado em ${d.ano}.`, 54, 650);
  }
  a.lista.slice(0, 12).forEach((l, i) => {
    const y = 630 + i * 46;
    if (i % 2 === 0) {
      ctx.fillStyle = '#EFEBE1';
      ctx.fillRect(54, y - 4, W - 108, 44);
    }
    ctx.fillStyle = SUAVE;
    fonte(ctx, 600, 22);
    ctx.fillText(dataBr(l.d), 70, y + 26);
    ctx.fillStyle = TINTA;
    fonte(ctx, 500, 22);
    ctx.fillText(cortar(ctx, `${l.tipo} · ${l.secretaria}`, 560), 230, y + 26);
    fonte(ctx, 800, 24);
    ctx.textAlign = 'right';
    ctx.fillText(brl(l.valor), W - 70, y + 26);
    ctx.textAlign = 'left';
  });

  // aviso sobre salario
  caixa(ctx, 54, 1214, W - 108, 92);
  ctx.fillStyle = SUAVE;
  fonte(ctx, 500, 20);
  quebrar(ctx, `${NOTA_SALARIO} Os pagamentos acima são os feitos em nome da própria pessoa (diárias e reembolsos).`, W - 148, 3).forEach((l, k) => ctx.fillText(l, 74, 1246 + k * 25));
}

/* -------------------------------------------------------------------------- */

function desenharBarras(
  ctx: Ctx,
  logo: HTMLImageElement | null,
  tit: string,
  sub: string,
  itens: { nome: string; valor: number; meta: string }[],
  total: number,
  cor: string,
) {
  cabecalho(ctx, logo, 'Transparência');
  titulo(ctx, tit, sub, 180);
  const lista = itens.slice(0, 12);
  const max = Math.max(...lista.map((i) => i.valor), 1);
  const larg = W - 108;
  lista.forEach((it, i) => {
    const y = 316 + i * 82;
    ctx.fillStyle = TINTA;
    fonte(ctx, 700, 24);
    ctx.fillText(cortar(ctx, `${i + 1}. ${it.nome}`, larg - 240), 54, y + 22);
    fonte(ctx, 800, 26);
    ctx.textAlign = 'right';
    ctx.fillText(brlInt(it.valor), W - 54, y + 22);
    ctx.textAlign = 'left';
    ctx.fillStyle = PEDRA;
    ctx.fillRect(54, y + 34, larg, 14);
    ctx.fillStyle = cor;
    ctx.fillRect(54, y + 34, Math.max(4, (it.valor / max) * larg), 14);
    ctx.fillStyle = SUAVE;
    fonte(ctx, 500, 19);
    ctx.fillText(`${pct(it.valor, total)} do total · ${it.meta}`, 54, y + 70);
  });
}

/* -------------------------------------------------------------------------- */

async function gerar(d: PrefExport, modo: string): Promise<void> {
  await prepararFontes();
  const { canvas, ctx } = novaTela();
  const logo = await carregarImagem('/brand/logo-branca.svg');
  let textoFonte = FONTE_DESPESAS(d);
  let nome = `prefeitura-${modo.replace(':', '-')}-${d.ano}.png`;

  if (modo === 'resumo') {
    desenharResumo(ctx, d, logo);
    nome = `despesas-prefeitura-nioaque-${d.ano}.png`;
  } else if (modo === 'receitas' && d.receitas) {
    desenharReceitas(ctx, d, d.receitas, logo);
    textoFonte = `Fonte: Tesouro Nacional (SICONFI), declarado pela Prefeitura · valores líquidos do FUNDEB · atualizado em ${new Date(d.atualizadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Campo_Grande' })}`;
    nome = `receitas-prefeitura-nioaque-${d.receitas.ano}.png`;
  } else if (modo === 'escalao') {
    const imgs = new Map<string, HTMLImageElement | null>();
    await Promise.all(d.escalao.map(async (a) => imgs.set(a.slug, a.foto ? await carregarImagem(a.foto) : null)));
    desenharEscalao(ctx, d, logo, imgs);
    nome = `primeiro-escalao-${d.ano}.png`;
  } else if (modo.startsWith('autoridade:')) {
    const slug = modo.slice('autoridade:'.length);
    const a = d.escalao.find((x) => x.slug === slug);
    if (!a) throw new Error('autoridade não encontrada');
    desenharAutoridade(ctx, d, a, logo, a.foto ? await carregarImagem(a.foto) : null);
    nome = `pagamentos-${slug}-${d.ano}.png`;
  } else if (modo === 'secretarias') {
    const tot = d.secretarias.reduce((s, x) => s + x.valor, 0);
    desenharBarras(ctx, logo, 'Quanto cada secretaria gastou', `Dinheiro pago por órgão da Prefeitura · ${d.periodo}`, d.secretarias.map((s) => ({ nome: s.nome, valor: s.valor, meta: `${s.qtd.toLocaleString('pt-BR')} despesas` })), tot, VERDE);
    nome = `secretarias-${d.ano}.png`;
  } else if (modo === 'areas') {
    const tot = d.areas.reduce((s, x) => s + x.valor, 0);
    desenharBarras(ctx, logo, 'Gastos por área de atuação', `Saúde, educação e demais áreas · ${d.periodo}`, d.areas.map((s) => ({ nome: s.nome, valor: s.valor, meta: `${s.qtd.toLocaleString('pt-BR')} despesas` })), tot, VERMELHO);
    nome = `areas-${d.ano}.png`;
  } else if (modo === 'fornecedores') {
    desenharBarras(ctx, logo, 'Maiores recebedores', `Quem mais recebeu da Prefeitura · ${d.periodo} (inclui a folha de pagamento)`, d.fornecedores.map((s) => ({ nome: s.nome, valor: s.valor, meta: `${s.qtd.toLocaleString('pt-BR')} empenhos` })), d.totais.pago, VERDE);
    nome = `maiores-recebedores-${d.ano}.png`;
  } else {
    throw new Error('imagem desconhecida');
  }

  rodape(ctx, textoFonte);
  void H;
  await salvar(canvas, nome);
}

function iniciar() {
  const el = document.getElementById('pref-export-data');
  if (!el?.textContent) return;
  const dados = JSON.parse(el.textContent) as PrefExport;
  document.querySelectorAll<HTMLButtonElement>('[data-png-pref]').forEach((btn) => {
    const rotulo = btn.querySelector('[data-rotulo]');
    btn.addEventListener('click', async () => {
      const original = rotulo?.textContent ?? '';
      btn.disabled = true;
      if (rotulo) rotulo.textContent = 'Gerando imagem…';
      try {
        await gerar(dados, btn.dataset.pngPref ?? '');
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
