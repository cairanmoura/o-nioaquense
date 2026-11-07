/**
 * camara-dados.ts
 * -----------------------------------------------------------------------------
 * Dados abertos do portal da Camara (Instar) e higienizacao das proposicoes.
 *
 *  - Ingestao diaria dos JSON de `/portal/dados-abertos/<tema>/<ano>` (contratos, licitacoes,
 *    legislacao e os temas que o portal deixa vazios) e das noticias oficiais da Camara.
 *  - Limpeza na entrada: numero real da proposicao (o campo "numero" da fonte vem corrompido),
 *    duplicatas, autor (o campo Autor manda; divergencia com o titulo e' sinalizada), categoria e local.
 *
 * Regra do projeto: so dado real. O que a fonte nao informa fica vazio e a pagina diz isso.
 */
import { gravarChave, lerChave } from './transparencia-store';
import { PORTAL_CAMARA, chaveProposicoes, urlProposicao, type Proposicao } from './camara-sessoes';
import { vereadorDoTexto, type VereadorCanonico } from './camara-vereadores';
import { classificarLocais } from './locations-nioaque';

const UA = 'Mozilla/5.0 (compatible; ONioaquenseBot/1.0; +https://onioaquense.com)';

export const CHAVE_INSTAR = (ano: number) => `camara:instar:${ano}`;
export const CHAVE_NOTICIAS = (ano: number) => `camara:noticias:${ano}`;

/* -------------------------------------------------------------------------- */
/* Tipos                                                                       */
/* -------------------------------------------------------------------------- */

export interface ContratoCamara {
  nome: string | null;
  numero: number | null;
  processo: string | null;
  tipo: string | null;
  situacao: string | null;
  valor: number | null;
  assinatura: string | null;
  inicio: string | null;
  fim: string | null;
}

export interface LicitacaoCamara {
  titulo: string;
  modalidade: string | null;
  situacao: string | null;
  postagem: string | null;
  realizacao: string | null;
  atualizacao: string | null;
  processo: number | null;
  valorEstimado: string | null;
  valorHomologado: string | null;
  descricao: string;
}

export interface LegislacaoCamara {
  categoria: string;
  numero: number | null;
  data: string | null;
  ementa: string;
  situacao: string | null;
  vigenciaInicio: string | null;
}

export interface TemaVazio {
  chave: string;
  rotulo: string;
  /** total de registros somando os anos consultados */
  total: number;
  porAno: Record<string, number>;
}

export interface DadosInstar {
  atualizadoEm: string;
  ano: number;
  contratos: ContratoCamara[];
  licitacoes: LicitacaoCamara[];
  legislacao: LegislacaoCamara[];
  /** temas que o portal publica vazios (ou quase): contagem real por ano */
  temas: TemaVazio[];
  sicPedidos: number | null;
  ouvidoriaPedidos: number | null;
  vereadoresAtualizadoEm: string | null;
}

export interface NoticiaCamara {
  id: number;
  url: string;
  titulo: string;
  categoria: string | null;
  /** yyyy-mm-dd quando a fonte informa; senao null */
  data: string | null;
  resumo: string;
}

/* -------------------------------------------------------------------------- */
/* Busca nos JSON da Instar                                                    */
/* -------------------------------------------------------------------------- */

async function pegarJson(tema: string, ano: number): Promise<any> {
  const r = await fetch(`${PORTAL_CAMARA}/portal/dados-abertos/${tema}/${ano}`, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`dados-abertos/${tema}/${ano}: http ${r.status}`);
  return r.json();
}

/** "Nenhum registro encontrado." vem como lista de texto: conta como zero registros. */
function linhas(j: any): any[] {
  const d = j?.dados;
  return Array.isArray(d) ? d.filter((x) => x && typeof x === 'object' && !Array.isArray(x)) : [];
}

const txt = (s: unknown) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/g, (e) => ({ '&ccedil;': 'ç', '&atilde;': 'ã', '&otilde;': 'õ', '&eacute;': 'é', '&aacute;': 'á', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú', '&ecirc;': 'ê', '&ocirc;': 'ô', '&agrave;': 'à', '&ldquo;': '“', '&rdquo;': '”', '&ndash;': '–' })[e] ?? e)
    .replace(/\s+/g, ' ')
    .trim();
const dia = (s: unknown) => (/^\d{4}-\d{2}-\d{2}/.test(String(s ?? '')) ? String(s).slice(0, 10) : null);
const num = (v: unknown) => {
  const n = Number(v);
  return v === null || v === '' || v === undefined || !Number.isFinite(n) ? null : n;
};

const TEMAS_VAZIOS: Array<[string, string]> = [
  ['relatorio-viagens', 'Relatórios de viagem'],
  ['diario-oficial', 'Diário Oficial'],
  ['obras', 'Obras'],
  ['audiencias-publicas', 'Audiências públicas'],
  ['compra-direta', 'Compras diretas (dispensa e inexigibilidade)'],
  ['chamamento-publico', 'Chamamentos públicos'],
  ['concursos', 'Concursos'],
  ['carta-servicos', 'Carta de Serviços'],
];

/** Busca os dados abertos do ano e grava em `camara:instar:<ano>`. Cerca de 24 chamadas ao portal. */
export async function buscarDadosInstar(sb: any, ano: number): Promise<string> {
  const [contratosJ, licJ, legJ, vereJ, sicJ, ouvJ] = await Promise.all([
    pegarJson('contratos', ano),
    pegarJson('licitacoes', ano),
    pegarJson('legislacao', ano),
    pegarJson('vereadores', ano),
    pegarJson('sic', ano),
    pegarJson('ouvidoria', ano),
  ]);

  const contratos = linhas(contratosJ).map<ContratoCamara>((c) => ({
    nome: txt(c.nomeContratada) || null,
    numero: num(c.numeroContrato),
    processo: txt(c.numeroProcesso) || null,
    tipo: txt(c.tipo) || null,
    situacao: txt(c.situacao) || null,
    valor: num(c.valorContrato),
    assinatura: dia(c.dataAssinatura),
    inicio: dia(c.dataInicioVigencia),
    fim: dia(c.dataFimVigencia ?? c.dataVigencia),
  }));
  const licitacoes = linhas(licJ).map<LicitacaoCamara>((l) => ({
    titulo: txt(l.titulo),
    modalidade: txt(l.modalidade) || null,
    situacao: txt(l.situacao) || null,
    postagem: dia(l.dataPostagem),
    realizacao: dia(l.dataRealizacao),
    atualizacao: dia(l.dataAtualizacao),
    processo: num(l.numeroProcesso),
    valorEstimado: txt(l.valorEstimado) || null,
    valorHomologado: txt(l.valorHomologado) || null,
    descricao: txt(l.descricao).slice(0, 400),
  }));
  const legislacao = linhas(legJ)
    .map<LegislacaoCamara>((l) => ({
      categoria: txt(l.categoria),
      numero: num(l.numero),
      data: dia(l.data),
      ementa: txt(l.ementa).slice(0, 500),
      situacao: txt(l.situacao) || null,
      vigenciaInicio: dia(l.dataInicioVigencia),
    }))
    .filter((l) => l.data && l.data >= `${ano}-01-01`);

  // Temas que o portal deixa vazios: contagem real dos 3 ultimos anos (2 chamadas extras so para os 3 principais)
  const temas: TemaVazio[] = [];
  const anos = [ano - 2, ano - 1, ano];
  for (const [chave, rotulo] of TEMAS_VAZIOS) {
    const principal = ['relatorio-viagens', 'diario-oficial', 'obras', 'audiencias-publicas'].includes(chave);
    const consulta = principal ? anos : [ano];
    const porAno: Record<string, number> = {};
    for (const a of consulta) porAno[String(a)] = linhas(await pegarJson(chave, a)).length;
    temas.push({ chave, rotulo, porAno, total: Object.values(porAno).reduce((s, n) => s + n, 0) });
  }

  const vereAt = linhas(vereJ)
    .map((v) => String(v.dataAtualizacao ?? ''))
    .filter(Boolean)
    .sort()
    .at(-1);

  const dados: DadosInstar = {
    atualizadoEm: new Date().toISOString(),
    ano,
    contratos,
    licitacoes,
    legislacao,
    temas,
    sicPedidos: num(sicJ?.dados?.totalPedidos),
    ouvidoriaPedidos: num(ouvJ?.dados?.totalPedidos),
    vereadoresAtualizadoEm: vereAt ? vereAt.slice(0, 10) : null,
  };
  await gravarChave(sb, CHAVE_INSTAR(ano), dados);
  return `dados: ${contratos.length} contrato(s), ${licitacoes.length} licitacao(oes), ${legislacao.length} ato(s) de legislacao`;
}

/* -------------------------------------------------------------------------- */
/* Noticias oficiais da Camara (explicam o conteudo de cada proposicao)         */
/* -------------------------------------------------------------------------- */

const MESES_SIGLA = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export function lerNoticias(html: string, hoje = new Date()): NoticiaCamara[] {
  const out: NoticiaCamara[] = [];
  const partes = html.split('<a href="/portal/noticias/0/3/').slice(1);
  for (const p of partes) {
    const m = /^(\d+)\/([^"]*)"/.exec(p);
    if (!m) continue;
    const bloco = p.slice(0, 4500);
    const titulo = txt(/ntc_titulo_noticia[^>]*>([\s\S]*?)<\/div>/.exec(bloco)?.[1]);
    if (!titulo) continue;
    const resumo = txt(/ntc_descricao_noticia[^>]*>([\s\S]*?)<\/div>/.exec(bloco)?.[1]);
    const categoria = txt(/ntc_categoria_noticia[^>]*>\s*(?:<[^>]+>\s*)*([\s\S]*?)<\/(?:span|div)>/.exec(bloco)?.[1]) || null;
    // a data completa vem como "29 OUT 2026 - 12h17" ou, nos ultimos dias, "Ha 3 dias"
    const dataTxt = txt(/ntc_data_noticia[^>]*>([\s\S]*?)<\/div>/.exec(bloco)?.[1]);
    let data: string | null = null;
    const cheia = /(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(\d{4})/i.exec(dataTxt);
    const relativa = /h[aá]\s+(\d+)\s+dias?/i.exec(dataTxt);
    if (cheia) data = `${cheia[3]}-${String(MESES_SIGLA.indexOf(cheia[2].toUpperCase()) + 1).padStart(2, '0')}-${cheia[1].padStart(2, '0')}`;
    else if (relativa) data = new Date(hoje.getTime() - Number(relativa[1]) * 86_400_000).toISOString().slice(0, 10);
    else if (/hoje|h[aá]\s+\d+\s+(hora|min)/i.test(dataTxt)) data = hoje.toISOString().slice(0, 10);
    out.push({ id: Number(m[1]), url: `${PORTAL_CAMARA}/portal/noticias/0/3/${m[1]}/${m[2]}`, titulo, categoria, data, resumo });
  }
  return out;
}

/** Le as paginas de noticias ate chegar ao ano anterior (no maximo `maxPaginas`). */
export async function buscarNoticias(sb: any, ano: number, maxPaginas = 6): Promise<string> {
  const todas = new Map<number, NoticiaCamara>();
  for (let pg = 1; pg <= maxPaginas; pg++) {
    const r = await fetch(`${PORTAL_CAMARA}/portal/noticias/3/${pg}/0/0/0/0`, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR' }, signal: AbortSignal.timeout(20_000) });
    if (!r.ok) break;
    const lista = lerNoticias(await r.text());
    if (!lista.length) break;
    for (const n of lista) todas.set(n.id, n);
    if (lista.filter((n) => n.data && n.data < `${ano}-01-01`).length >= 3) break; // chegou no ano anterior
  }
  const itens = [...todas.values()].filter((n) => !n.data || n.data >= `${ano}-01-01`);
  await gravarChave(sb, CHAVE_NOTICIAS(ano), { atualizadoEm: new Date().toISOString(), itens });
  return `noticias: ${itens.length} de ${ano}`;
}

/* -------------------------------------------------------------------------- */
/* Higienizacao das proposicoes                                                */
/* -------------------------------------------------------------------------- */

export type CategoriaProducao = 'leis' | 'fiscalizacao' | 'zeladoria' | 'sem-ementa' | 'parecer';

export const ROTULO_CATEGORIA: Record<CategoriaProducao, string> = {
  leis: 'Leis e decretos',
  fiscalizacao: 'Fiscalização do Executivo',
  zeladoria: 'Zeladoria e homenagens',
  'sem-ementa': 'Requerimentos sem ementa publicada',
  parecer: 'Pareceres',
};

export interface PropNormalizada extends Proposicao {
  sigla: string;
  /** numero real ("11/2026"), tirado do titulo; null quando nem titulo nem campo dao um numero confiavel */
  numeroReal: string | null;
  categoria: CategoriaProducao;
  /** slugs dos vereadores autores (campo Autor do portal) */
  vereadores: string[];
  /** autores que nao sao vereadores (Executivo, Mesa, comissoes...) */
  outrosAutores: string[];
  /** vereador citado no titulo que nao consta no campo Autor da fonte */
  divergencia: string | null;
  locais: string[];
  /** texto usado na classificacao (ementa do portal + noticia oficial da Camara) */
  texto: string;
  fonteUrl: string;
  noticiaUrl: string | null;
}

const SIGLAS_LEIS = new Set(['PL', 'PLC', 'PDL', 'PRE', 'RSL', 'E-LOM', 'EMEN']);
// Pedidos de informacao ao Executivo. "com copia para conhecimento" NAO conta: e' so o encaminhamento do requerimento.
const FISCALIZA =
  /\b(informacoes (sobre|acerca|referentes|detalhadas|quanto)|prestar informacoes|solicita informacoes|requer informacoes|esclarecimentos?|prestacao de contas|convoca(cao|r)|copias? (integral|dos|das|de|do)|relatorios? (de|detalhado|circunstanciado)|justificativas?|explicacoes)\b/;

const sem = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** "REQUERIMENTO Nº 11/2026 - SÉRGIO MARQUES" -> "11/2026". Pareceres citam o numero do projeto: usam o campo. */
export function numeroReal(p: Proposicao, sigla: string): string | null {
  if (sigla !== 'PRC') {
    const m = /\b0*(\d{1,3})\s*\/\s*(20\d{2})\b/.exec(p.titulo);
    if (m) return `${m[1]}/${m[2]}`;
  }
  const campo = /^0*(\d{1,3})\/(20\d{2})$/.exec(p.numero.trim());
  return campo ? `${campo[1]}/${campo[2]}` : null;
}

const SIGLA_NOTICIA: Array<[RegExp, string]> = [
  [/projeto de lei complementar/, 'PLC'],
  [/projeto de lei/, 'PL'],
  [/projeto de decreto legislativo/, 'PDL'],
  [/projeto de resolucao/, 'PRE'],
  [/requerimento/, 'REQ'],
  [/indicacao/, 'IND'],
  [/mocao/, 'MOC'],
];

/** Indice "REQ-40/2026" -> noticia oficial que cita a proposicao. */
function indiceNoticias(noticias: NoticiaCamara[]): Map<string, NoticiaCamara> {
  const idx = new Map<string, NoticiaCamara>();
  const re = /(projeto de lei complementar|projeto de lei|projeto de decreto legislativo|projeto de resolucao|requerimento|indicacao|mocao)\s*(?:n[oº°.]*\s*)?0*(\d{1,3})\s*\/\s*(20\d{2})/g;
  for (const n of noticias) {
    const t = sem(`${n.titulo} ${n.resumo}`);
    for (const m of t.matchAll(re)) {
      const sigla = SIGLA_NOTICIA.find(([r]) => r.test(m[1]))![1];
      const k = `${sigla}-${m[2]}/${m[3]}`;
      if (!idx.has(k)) idx.set(k, n);
    }
  }
  return idx;
}

export interface ResultadoNormalizacao {
  itens: PropNormalizada[];
  /** registros repetidos pela fonte e removidos */
  duplicatasRemovidas: number;
  /** numeros do portal corrompidos e corrigidos pelo titulo */
  numerosCorrigidos: number;
  semNumero: number;
  divergencias: PropNormalizada[];
}

export function normalizarProposicoes(brutas: Proposicao[], noticias: NoticiaCamara[], ano: number): ResultadoNormalizacao {
  const idx = indiceNoticias(noticias);
  let corrigidos = 0;
  let semNumero = 0;

  const norm = brutas.map<PropNormalizada>((p) => {
    const sigla = p.tipo.split(' - ')[0].trim();
    const real = numeroReal(p, sigla);
    if (real && real !== p.numero.trim() && sigla !== 'PRC') corrigidos++;
    if (!real) semNumero++;

    // ementa do portal + noticia oficial (quando a noticia cita esta proposicao)
    const noticia = real ? (idx.get(`${sigla}-${real}`) ?? (sigla === 'PL' ? idx.get(`PLC-${real}`) : undefined)) : undefined;
    const texto = `${p.titulo} ${p.descricao} ${noticia ? `${noticia.titulo} ${noticia.resumo}` : ''}`.trim();

    const autoresVer: VereadorCanonico[] = [];
    const outros: string[] = [];
    for (const a of p.autores) {
      const v = vereadorDoTexto(a);
      if (v) {
        if (!autoresVer.some((x) => x.slug === v.slug)) autoresVer.push(v);
      } else outros.push(a);
    }
    // vereador citado no titulo ("... - PAULO ROBERTO M. SIMAO") que nao esta no campo Autor
    const doTitulo = sigla === 'PRC' ? null : vereadorDoTexto(p.titulo.split(' - ').slice(1).join(' - '));
    const divergencia = doTitulo && autoresVer.length > 0 && !autoresVer.some((v) => v.slug === doTitulo.slug) ? doTitulo.slug : null;
    // sem vereador no campo Autor mas com vereador no titulo (e nenhum outro autor): vale o titulo
    const vereadores = autoresVer.length ? autoresVer.map((v) => v.slug) : doTitulo && outros.length === 0 ? [doTitulo.slug] : [];

    const temTexto = Boolean(p.descricao.trim() || noticia);
    let categoria: CategoriaProducao;
    if (sigla === 'PRC') categoria = 'parecer';
    else if (SIGLAS_LEIS.has(sigla)) categoria = 'leis';
    else if (sigla === 'IND' || sigla === 'MOC') categoria = 'zeladoria';
    else if (sigla === 'REQ') categoria = !temTexto ? 'sem-ementa' : FISCALIZA.test(sem(texto)) ? 'fiscalizacao' : 'zeladoria';
    else categoria = 'zeladoria';

    return {
      ...p,
      sigla,
      numeroReal: real,
      categoria,
      vereadores,
      outrosAutores: outros,
      divergencia,
      locais: temTexto ? classificarLocais(texto) : [],
      texto,
      fonteUrl: urlProposicao(p.id),
      noticiaUrl: noticia?.url ?? null,
    };
  });

  // Duplicatas: mesmo tipo + mesmo numero real + mesmos autores (a numeracao de requerimentos, indicacoes e mocoes e' por vereador).
  // Fica a mais recente.
  const porChave = new Map<string, PropNormalizada>();
  const sobras: PropNormalizada[] = [];
  let removidas = 0;
  for (const p of norm) {
    if (!p.numeroReal) {
      sobras.push(p);
      continue;
    }
    const k = `${p.sigla}-${p.numeroReal}-${[...p.autores].sort().join('+')}`;
    const atual = porChave.get(k);
    if (!atual) porChave.set(k, p);
    else {
      removidas++;
      const maisNova = (p.data ?? '') > (atual.data ?? '') || ((p.data ?? '') === (atual.data ?? '') && p.id > atual.id);
      if (maisNova) porChave.set(k, p);
    }
  }
  const itens = [...porChave.values(), ...sobras].sort((a, b) => (b.data ?? '').localeCompare(a.data ?? '') || b.id - a.id);
  return { itens, duplicatasRemovidas: removidas, numerosCorrigidos: corrigidos, semNumero, divergencias: itens.filter((p) => p.divergencia) };
}

/** Le proposicoes + noticias do cache e normaliza. */
export async function lerProposicoesNormalizadas(sb: any, ano: number): Promise<(ResultadoNormalizacao & { total: number; atualizadoEm: string }) | null> {
  const [p, n] = await Promise.all([
    lerChave<{ atualizadoEm: string; total: number; itens: Proposicao[] }>(sb, chaveProposicoes(ano)),
    lerChave<{ itens: NoticiaCamara[] }>(sb, CHAVE_NOTICIAS(ano)),
  ]);
  if (!p) return null;
  return { ...normalizarProposicoes(p.valor.itens, n?.valor.itens ?? [], ano), total: p.valor.total, atualizadoEm: p.valor.atualizadoEm };
}

/* -------------------------------------------------------------------------- */
/* Producao por vereador                                                       */
/* -------------------------------------------------------------------------- */

export interface ProducaoVereador {
  slug: string;
  total: number;
  porCategoria: Record<CategoriaProducao, number>;
  itens: PropNormalizada[];
}

export function producaoDosVereadores(itens: PropNormalizada[]): Map<string, ProducaoVereador> {
  const m = new Map<string, ProducaoVereador>();
  for (const p of itens) {
    if (p.categoria === 'parecer') continue;
    for (const slug of p.vereadores) {
      const e = m.get(slug) ?? { slug, total: 0, porCategoria: { leis: 0, fiscalizacao: 0, zeladoria: 0, 'sem-ementa': 0, parecer: 0 }, itens: [] };
      e.total++;
      e.porCategoria[p.categoria]++;
      e.itens.push(p);
      m.set(slug, e);
    }
  }
  return m;
}

/* -------------------------------------------------------------------------- */
/* Diarias em dia de sessao                                                    */
/* -------------------------------------------------------------------------- */

/** Datas de viagem escritas no historico do empenho ("NO DIA 29/09/2026", "NOS DIAS 17/09/2026 e 18/09/2026"). */
export function datasDaViagem(historico: string): string[] {
  const out = new Set<string>();
  for (const m of historico.matchAll(/\b(\d{2})\/(\d{2})\/?(\d{4})\b/g)) {
    const [d, mm, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (d >= 1 && d <= 31 && mm >= 1 && mm <= 12) out.add(`${y}-${String(mm).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return [...out];
}

export const ehTerca = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay() === 2;

/* -------------------------------------------------------------------------- */
/* Selos de auditoria (contratos e licitacoes)                                  */
/* -------------------------------------------------------------------------- */

export interface Selo {
  texto: string;
  /** alerta = lacuna na fonte; info = observacao */
  nivel: 'alerta' | 'info';
}

export function selosDoContrato(c: ContratoCamara, hoje: string): Selo[] {
  const s: Selo[] = [];
  if (/suspens/i.test(c.situacao ?? '')) s.push({ texto: 'Suspenso', nivel: 'alerta' });
  if (c.valor === null || c.valor === 0) s.push({ texto: 'Sem valor informado no portal', nivel: 'alerta' });
  if (!c.nome) s.push({ texto: 'Sem nome do contratado no portal', nivel: 'alerta' });
  if (c.fim && c.fim < hoje && /vigente/i.test(c.situacao ?? '')) s.push({ texto: 'Vigência vencida e ainda constando como vigente', nivel: 'alerta' });
  return s;
}

export function seloDaLicitacao(l: LicitacaoCamara, hoje: string): Selo | null {
  if (!/aberto/i.test(l.situacao ?? '') || l.valorHomologado) return null;
  const base = l.realizacao ?? l.postagem;
  if (!base) return null;
  const dias = (Date.parse(`${hoje}T12:00:00Z`) - Date.parse(`${base}T12:00:00Z`)) / 86_400_000;
  if (dias < 30) return null;
  const [y, m] = base.split('-');
  const mes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1];
  return { texto: `Licitação em aberto sem homologação desde ${mes}/${y}`, nivel: 'alerta' };
}

/** Data (yyyy-mm-dd) do registro mais recente de cada tema publicado. */
export function ultimoRegistro(d: DadosInstar): { contratos: string | null; licitacoes: string | null } {
  const maior = (xs: Array<string | null>) => xs.filter((x): x is string => Boolean(x)).sort().at(-1) ?? null;
  return {
    contratos: maior(d.contratos.map((c) => c.assinatura)),
    licitacoes: maior(d.licitacoes.map((l) => l.postagem ?? l.atualizacao)),
  };
}
