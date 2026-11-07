/**
 * Transparencia da Prefeitura de Nioaque (entidade 265 do portal Quality).
 * Interpreta os empenhos e seus detalhes e monta o resumo que a pagina exibe.
 */
import autoridades from '../data/autoridades.json';
import { brNumber, semAcento, type Detalhe, type RawEmpenho } from './transparencia';

export const ENTIDADE_PREFEITURA = '265';

/** Codigo do orgao (usado no detalhe do empenho) para cada unidade gestora. */
const ORGAOS: [RegExp, string][] = [
  [/^PREFEITURA/i, '1'],
  [/SA[ÚU]DE/i, '2'],
  [/ASSIST[ÊE]NCIA SOCIAL/i, '3'],
  [/INVESTIMENTO SOCIAL/i, '6'],
  [/CRIAN[ÇC]A/i, '8'],
  [/FUNDEB/i, '9'],
  [/MEIO AMBIENTE/i, '11'],
];
/** Orgaos a tentar quando a unidade gestora nao esta na lista acima. */
export const ORGAOS_TENTAR = ['1', '2', '3', '6', '8', '9', '11', '4', '5', '10', '12', '13'];

export function orgaoDe(unidade: string): string | null {
  return ORGAOS.find(([re]) => re.test(unidade))?.[1] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Categorias                                                                  */
/* -------------------------------------------------------------------------- */

export type CategoriaPref = 'pessoal' | 'encargos' | 'diarias' | 'servicos' | 'obras' | 'repasses' | 'outras';

export const CATEGORIAS_PREF: Record<CategoriaPref, { label: string; cor: string }> = {
  pessoal: { label: 'Pessoal e folha', cor: '#0D4722' },
  encargos: { label: 'Encargos (INSS e outros)', cor: '#D97706' },
  servicos: { label: 'Serviços e materiais', cor: '#6FCB8B' },
  obras: { label: 'Obras e equipamentos', cor: '#2B6CB0' },
  repasses: { label: 'Repasses e subvenções', cor: '#8A6BBE' },
  diarias: { label: 'Diárias', cor: '#D92323' },
  outras: { label: 'Outras despesas', cor: '#8A8F8A' },
};

function categoriaDe(natureza: string, credor: string): CategoriaPref {
  if (/FOLHA/i.test(credor)) return 'pessoal';
  if (/INSS|PREVID|RPPS|FGTS/i.test(credor)) return 'encargos';
  const cod = natureza.replace(/\D/g, '').slice(0, 8);
  if (/di[aá]ria/i.test(natureza)) return 'diarias';
  if (!cod) return 'servicos';
  if (cod.startsWith('3114') || cod.startsWith('3194') || /^3[1]9[01]13/.test(cod) || /^319[01]1[67]/.test(cod)) return 'encargos';
  if (cod.startsWith('31')) return 'pessoal';
  // 4.4 = investimentos (obras, equipamentos); 4.5 inversoes financeiras e 4.6 amortizacao da divida nao sao obra
  if (cod.startsWith('44')) return 'obras';
  if (cod.startsWith('4')) return 'outras';
  if (/^33(50|40|30|41|45|60|70|80)/.test(cod) || /^3[2]/.test(cod)) return 'repasses';
  if (cod.startsWith('339014') || cod.startsWith('339015')) return 'diarias';
  if (cod.startsWith('33')) return 'servicos';
  return 'outras';
}

/* -------------------------------------------------------------------------- */
/* Tipos                                                                       */
/* -------------------------------------------------------------------------- */

export interface PrefEmpenho {
  /** numero do empenho */
  n: string;
  /** data ISO */
  d: string;
  /** credor */
  c: string;
  /** cpf/cnpj */
  j: string;
  e: number;
  l: number;
  p: number;
  /** unidade gestora (resumida) */
  u: string;
  /** secretaria / unidade orcamentaria */
  s: string;
  /** funcao de governo */
  f: string;
  /** categoria */
  t: CategoriaPref;
  /** licitacao/contrato, quando houver */
  lic?: string;
}

export interface Agg {
  nome: string;
  slug: string;
  valor: number;
  qtd: number;
}

export interface Fornecedor {
  nome: string;
  cnpj: string;
  pago: number;
  empenhos: number;
  /** natureza da despesa mais frequente (por valor), do detalhe do empenho */
  oque: string;
}

export interface Autoridade {
  slug: string;
  nome: string;
  cargo: string;
  /** prefeito | vice | secretario */
  grupo: 'prefeito' | 'vice' | 'secretario';
  foto: string | null;
  total: number;
  qtd: number;
  diarias: number;
  lista: { n: string; d: string; valor: number; tipo: string; secretaria: string }[];
}

export interface ResumoPref {
  ano: number;
  totalEmpenhado: number;
  totalLiquidado: number;
  totalPago: number;
  qtd: number;
  porMes: number[];
  porCategoria: Record<CategoriaPref, number>;
  porSecretaria: Agg[];
  porFuncao: Agg[];
  porUnidade: Agg[];
  credores: { nome: string; cnpj: string; pago: number; empenhos: number }[];
  /** maiores fornecedores (sem folha, encargos e diarias), com o que fornecem (natureza da despesa mais frequente por valor) */
  fornecedores?: Fornecedor[];
  /** quem recebeu sem licitacao ou contrato informado no detalhe do empenho */
  semLicCredores?: Fornecedor[];
  /** quem mais recebeu diarias */
  diariasRanking?: { nome: string; pago: number; qtd: number }[];
  /** valor pago em despesas cujo detalhe ainda nao foi lido (nao entram em com/sem licitacao) */
  licSemDetalhe?: number;
  maiores: PrefEmpenho[];
  escalao: Autoridade[];
  diariasTotal: number;
  diariasQtd: number;
  comLicitacao: number;
  semLicitacao: number;
  semDetalhe: number;
  atualizadoEm: string;
}

/* -------------------------------------------------------------------------- */
/* Interpretacao                                                               */
/* -------------------------------------------------------------------------- */

export const slugDe = (t: string) =>
  semAcento(t)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

const depoisDoTraco = (t: string) => (t.includes(' - ') ? t.slice(t.indexOf(' - ') + 3) : t).trim();

function unidadeCurta(u: string): string {
  const x = u.trim();
  if (/^PREFEITURA/i.test(x)) return 'Prefeitura';
  if (/SA[ÚU]DE/i.test(x)) return 'Fundo Municipal de Saúde';
  if (/ASSIST[ÊE]NCIA/i.test(x)) return 'Fundo de Assistência Social';
  if (/INVESTIMENTO SOCIAL/i.test(x)) return 'Fundo de Investimento Social';
  if (/CRIAN[ÇC]A/i.test(x)) return 'Fundo da Criança e do Adolescente';
  if (/FUNDEB/i.test(x)) return 'FUNDEB (educação)';
  if (/MEIO AMBIENTE/i.test(x)) return 'Fundo de Meio Ambiente';
  return x.charAt(0) + x.slice(1).toLowerCase();
}

const SIGLAS = /\b(Fmas|Fmis|Fmdca|Fundeb|Semditec|Ltda|Epp|Mei|Me|Inss)\b/g;
function bonito(t: string): string {
  if (t !== t.toUpperCase() && t !== t.toLowerCase()) return t;
  return t
    .toLowerCase()
    .replace(/(^|[\s.\-/(])(\S)/g, (_, a, b) => a + b.toUpperCase())
    .replace(/\s(De|Do|Da|Dos|Das|E|Em|Para)\s/g, (c) => c.toLowerCase())
    .replace(/Secretria/g, 'Secretaria')
    .replace(SIGLAS, (s) => s.toUpperCase());
}

interface AutoridadeBase {
  slug: string;
  nome: string;
  cargo: string;
  grupo: Autoridade['grupo'];
  foto: string | null;
  primeiro: string;
  ultimo: string;
}

/** Prefeito, vice e secretarios (fonte: src/data/autoridades.json). */
export const ESCALAO: AutoridadeBase[] = (autoridades.grupos.find((g) => g.id === 'executivo')?.itens ?? [])
  .filter((i) => /prefeit|secret/i.test(i.cargo) && i.id !== 'prefeitura')
  .map((i) => {
    const toks = semAcento(i.nome).split(/\s+/).filter((t) => t.length > 1 && !['de', 'da', 'do', 'dos', 'das', 'e'].includes(t));
    const grupo: Autoridade['grupo'] = /vice/i.test(i.cargo) ? 'vice' : /secret/i.test(i.cargo) ? 'secretario' : 'prefeito';
    return { slug: i.id, nome: i.nome, cargo: i.cargo.replace(/\s*\(.*\)$/, ''), grupo, foto: i.foto, primeiro: toks[0], ultimo: toks[toks.length - 1] };
  });

function autoridadeDe(credor: string): AutoridadeBase | null {
  const n = ` ${semAcento(credor)} `;
  return ESCALAO.find((a) => n.includes(` ${a.primeiro} `) && n.includes(` ${a.ultimo} `)) ?? null;
}

const rotuloTipo: Record<CategoriaPref, string> = {
  pessoal: 'Pessoal',
  encargos: 'Encargos',
  diarias: 'Diária',
  servicos: 'Serviço ou material',
  obras: 'Obra ou equipamento',
  repasses: 'Repasse',
  outras: 'Outra despesa',
};

function somar(mapa: Map<string, Agg>, nome: string, valor: number) {
  const slug = slugDe(nome) || 'nao-informado';
  const a = mapa.get(slug) ?? { nome, slug, valor: 0, qtd: 0 };
  a.valor += valor;
  a.qtd += 1;
  mapa.set(slug, a);
}

const ordenar = (m: Map<string, Agg>) => [...m.values()].sort((a, b) => b.valor - a.valor);

/** Chave unica de um empenho: numero/ano na unidade gestora. */
export const chaveEmpenho = (x: RawEmpenho) => `${x.ano}/${x.numero_empenho}/${x.nome_unidade_gestora ?? ''}`;

export function montarResumoPref(ano: number, bruto: RawEmpenho[], detalhes: Record<string, Detalhe | 'x'>): { resumo: ResumoPref; lista: PrefEmpenho[] } {
  const unicos = new Map<string, RawEmpenho>();
  for (const x of bruto) {
    const k = chaveEmpenho(x);
    if (!unicos.has(k)) unicos.set(k, x);
  }

  const lista: PrefEmpenho[] = [];
  const porMes = Array<number>(12).fill(0);
  const porCategoria: Record<CategoriaPref, number> = { pessoal: 0, encargos: 0, diarias: 0, servicos: 0, obras: 0, repasses: 0, outras: 0 };
  const sec = new Map<string, Agg>();
  const fun = new Map<string, Agg>();
  const uni = new Map<string, Agg>();
  const cred = new Map<string, { nome: string; cnpj: string; pago: number; empenhos: number }>();
  const esc = new Map<string, Autoridade>();
  let totalEmpenhado = 0;
  let totalLiquidado = 0;
  let totalPago = 0;
  let diariasTotal = 0;
  let diariasQtd = 0;
  let comLicitacao = 0;
  let semLicitacao = 0;
  let semDetalhe = 0;
  let licSemDetalhe = 0;
  type AggForn = { nome: string; cnpj: string; pago: number; empenhos: number; naturezas: Map<string, number> };
  const forn = new Map<string, AggForn>();
  const semLic = new Map<string, AggForn>();
  const diariasRank = new Map<string, { nome: string; pago: number; qtd: number }>();
  const topForn = (m: Map<string, AggForn>, n: number): Fornecedor[] =>
    [...m.values()]
      .sort((a, b) => b.pago - a.pago)
      .slice(0, n)
      .map((f) => ({ nome: f.nome, cnpj: f.cnpj, pago: f.pago, empenhos: f.empenhos, oque: [...f.naturezas.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '' }));

  for (const [k, x] of unicos) {
    const det = detalhes[k];
    const d = det && det !== 'x' ? det : null;
    if (!d) semDetalhe += 1;
    const credor = (x.credor_nome ?? '').trim() || 'Não informado';
    const pago = brNumber(x.valor_pago);
    const [dd, mm, yy] = x.data.split('/');
    const cat = categoriaDe(d?.natureza ?? '', credor);
    const secretaria = d?.unidade ? bonito(depoisDoTraco(d.unidade)).replace(/Secretria/gi, 'Secretaria') : 'Não identificada';
    const funcao = d?.funcao ? bonito(depoisDoTraco(d.funcao).trim()) : 'Não identificada';
    const unidade = unidadeCurta(x.nome_unidade_gestora ?? '');
    const lic = d ? [d.licitacao, d.contrato && `contrato ${d.contrato}`].filter(Boolean).join(' · ') : '';

    const e: PrefEmpenho = {
      n: x.numero_empenho,
      d: `${yy}-${mm}-${dd}`,
      c: credor,
      j: x.credor_cnpj ?? '',
      e: brNumber(x.valor_empenhado),
      l: brNumber(x.valor_liquidado),
      p: pago,
      u: unidade,
      s: secretaria,
      f: funcao,
      t: cat,
      ...(lic ? { lic } : {}),
    };
    lista.push(e);

    totalEmpenhado += e.e;
    totalLiquidado += e.l;
    totalPago += pago;
    porCategoria[cat] += pago;
    const mes = Number(mm) - 1;
    if (mes >= 0 && mes < 12) porMes[mes] += pago;
    somar(sec, secretaria, pago);
    somar(fun, funcao, pago);
    somar(uni, unidade, pago);
    const kc = e.j || credor;
    const c = cred.get(kc) ?? { nome: credor, cnpj: e.j, pago: 0, empenhos: 0 };
    c.pago += pago;
    c.empenhos += 1;
    cred.set(kc, c);
    const natureza = d?.natureza ? bonito(depoisDoTraco(d.natureza)) : '';
    if (cat === 'diarias') {
      diariasTotal += pago;
      diariasQtd += 1;
      const r = diariasRank.get(kc) ?? { nome: credor, pago: 0, qtd: 0 };
      r.pago += pago;
      r.qtd += 1;
      diariasRank.set(kc, r);
    }
    if (cat !== 'pessoal' && cat !== 'encargos' && cat !== 'diarias' && cat !== 'outras') {
      const f = forn.get(kc) ?? { nome: credor, cnpj: e.j, pago: 0, empenhos: 0, naturezas: new Map<string, number>() };
      f.pago += pago;
      f.empenhos += 1;
      if (natureza) f.naturezas.set(natureza, (f.naturezas.get(natureza) ?? 0) + pago);
      forn.set(kc, f);
    }
    if (cat !== 'pessoal' && cat !== 'encargos') {
      if (!d) licSemDetalhe += pago;
      else if (d.licitacao || d.contrato) comLicitacao += pago;
      else {
        semLicitacao += pago;
        const f = semLic.get(kc) ?? { nome: credor, cnpj: e.j, pago: 0, empenhos: 0, naturezas: new Map<string, number>() };
        f.pago += pago;
        f.empenhos += 1;
        if (natureza) f.naturezas.set(natureza, (f.naturezas.get(natureza) ?? 0) + pago);
        semLic.set(kc, f);
      }
    }

    if ((x.credor_cnpj ?? '').length === 11) {
      const au = autoridadeDe(credor);
      if (au) {
        const r = esc.get(au.slug) ?? { slug: au.slug, nome: au.nome, cargo: au.cargo, grupo: au.grupo, foto: au.foto, total: 0, qtd: 0, diarias: 0, lista: [] };
        r.total += pago;
        r.qtd += 1;
        if (cat === 'diarias') r.diarias += pago;
        r.lista.push({ n: x.numero_empenho, d: e.d, valor: pago, tipo: rotuloTipo[cat], secretaria });
        esc.set(au.slug, r);
      }
    }
  }

  lista.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : Number(b.n) - Number(a.n)));
  const escalao = ESCALAO.map(
    (a) => esc.get(a.slug) ?? { slug: a.slug, nome: a.nome, cargo: a.cargo, grupo: a.grupo, foto: a.foto, total: 0, qtd: 0, diarias: 0, lista: [] },
  );
  for (const a of escalao) a.lista = a.lista.slice(0, 40);

  return {
    lista,
    resumo: {
      ano,
      totalEmpenhado,
      totalLiquidado,
      totalPago,
      qtd: lista.length,
      porMes,
      porCategoria,
      porSecretaria: ordenar(sec),
      porFuncao: ordenar(fun),
      porUnidade: ordenar(uni),
      credores: [...cred.values()].sort((a, b) => b.pago - a.pago).slice(0, 40),
      fornecedores: topForn(forn, 20),
      semLicCredores: topForn(semLic, 25),
      diariasRanking: [...diariasRank.values()].sort((a, b) => b.pago - a.pago).slice(0, 15),
      licSemDetalhe,
      maiores: [...lista].sort((a, b) => b.p - a.p).slice(0, 30),
      escalao,
      diariasTotal,
      diariasQtd,
      comLicitacao,
      semLicitacao,
      semDetalhe,
      atualizadoEm: new Date().toISOString(),
    },
  };
}
