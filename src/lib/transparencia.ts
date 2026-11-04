/**
 * transparencia.ts
 * -----------------------------------------------------------------------------
 * Despesas da Camara Municipal de Nioaque, lidas da API publica de Dados
 * Abertos do Portal da Transparencia (Quality Sistemas).
 * Documentacao: https://web.qualitysistemas.com.br/dados-abertos
 *
 * Autenticacao documentada pelo proprio portal: HTTP Basic, usuario
 * "PortalQuality", senha = md5("PortalQuality" + AAAAMMDDHH no horario de
 * Campo Grande). A senha muda a cada hora.
 *
 * - /despesas lista os empenhos (cada um repetido pela fonte: deduplicamos).
 * - /empenho/{entidade}/{n}/{ano}/{cod} traz natureza e historico. So buscamos
 *   o detalhe de empenhos de pessoa fisica (diarias, alugueis), e guardamos
 *   cada detalhe por 30 dias (empenhos pagos nao mudam).
 * - O codigo do orgao "Camara Municipal" no detalhe e' 7 (descoberto por teste:
 *   os demais codigos devolvem Prefeitura/Fundos).
 */

/** MD5 em JS puro (exigido pela autenticacao da API; nao e' usado para seguranca). */
function md5(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const n = bytes.length;
  const total = (((n + 8) >> 6) + 1) * 16;
  const w = new Array<number>(total).fill(0);
  for (let i = 0; i < n; i++) w[i >> 2] |= bytes[i] << ((i % 4) * 8);
  w[n >> 2] |= 0x80 << ((n % 4) * 8);
  w[total - 2] = (n * 8) >>> 0;
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
  for (let o = 0; o < total; o += 16) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + w[o + g]) | 0;
      A = D; D = C; C = B;
      const s = S[(i >> 4) * 4 + (i % 4)];
      B = (B + ((F << s) | (F >>> (32 - s)))) | 0;
    }
    a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
  }
  return [a0, b0, c0, d0]
    .map((v) => Array.from({ length: 4 }, (_, i) => ((v >>> (i * 8)) & 0xff).toString(16).padStart(2, '0')).join(''))
    .join('');
}

export const BASE_API = 'https://web.qualitysistemas.com.br/api/v1/dados-abertos';
export const ENTIDADE = '164';
export const COD_CAMARA = '7';
const TZ = 'America/Campo_Grande';

/* -------------------------------------------------------------------------- */
/* Vereadores                                                                  */
/* -------------------------------------------------------------------------- */

export interface Vereador {
  slug: string;
  nome: string;
  cargo: string;
  partido: string;
  foto: string;
  /** Casa com o nome do credor no portal (nome civil completo). */
  match: RegExp;
}

export const VEREADORES: Vereador[] = [
  { slug: 'reinaldo-andrea', nome: 'Reinaldo Andréa', cargo: 'Presidente', partido: 'PP', foto: '/autoridades/vereador-reinaldo-andrea.jpg', match: /REINALDO.*ANDREA/i },
  { slug: 'sergio-marques', nome: 'Sérgio Marques', cargo: 'Vice-presidente', partido: 'PT', foto: '/autoridades/vereador-sergio-marques.jpg', match: /^S[EÉ]RGIO MARQUES$/i },
  { slug: 'joao-goncalves', nome: 'João Gonçalves', cargo: '1º secretário', partido: 'PL', foto: '/autoridades/vereador-joao-carlos-corumba.jpg', match: /JO[AÃ]O CARLOS VERA/i },
  { slug: 'silas-ferreira', nome: 'Silas Ferreira', cargo: '2º secretário', partido: 'PSDB', foto: '/autoridades/vereador-silas-ferreira.jpg', match: /SILAS NUNES/i },
  { slug: 'jeuzimar-araujo', nome: 'Jeuzimar Araújo', cargo: 'Vereador', partido: 'PSDB', foto: '/autoridades/vereador-jeuzimar-seco.jpg', match: /JEUZIMAR/i },
  { slug: 'jorge-lemes', nome: 'Jorge Lemes', cargo: 'Vereador', partido: 'PP', foto: '/autoridades/vereador-jorge-uirapuru.jpg', match: /JORGE.*LEMES/i },
  { slug: 'pablo-correa', nome: 'Pablo Corrêa', cargo: 'Vereador', partido: 'PSDB', foto: '/autoridades/vereador-pablo-correa.jpg', match: /PABLO RUAN/i },
  { slug: 'paulo-simao', nome: 'Paulo Simão', cargo: 'Vereador', partido: 'PV', foto: '/autoridades/vereador-neguinho-santa-amelia.jpg', match: /PAULO ROBERTO MEIRA/i },
  { slug: 'rosemeire-arruda', nome: 'Rosemeire Arruda', cargo: 'Vereadora', partido: 'PP', foto: '/autoridades/vereador-rose-arruda.png', match: /ROSEMEIRE.*ARRUDA/i },
];

/* -------------------------------------------------------------------------- */
/* Tipos                                                                       */
/* -------------------------------------------------------------------------- */

export type Categoria = 'folha' | 'encargos' | 'diarias' | 'fornecedores';

export const CATEGORIAS: Record<Categoria, { label: string; cor: string }> = {
  folha: { label: 'Folha de pagamento', cor: '#0D4722' },
  encargos: { label: 'Encargos (INSS)', cor: '#D97706' },
  diarias: { label: 'Diárias', cor: '#D92323' },
  fornecedores: { label: 'Fornecedores e serviços', cor: '#6FCB8B' },
};

export interface Empenho {
  numero: string;
  /** ISO yyyy-mm-dd */
  data: string;
  credor: string;
  cnpj: string;
  empenhado: number;
  liquidado: number;
  pago: number;
  categoria: Categoria;
}

export interface Diaria {
  numero: string;
  data: string;
  credor: string;
  /** slug do vereador, ou null para servidores e assessores */
  vereador: string | null;
  valor: number;
  /** quantidade de diarias no empenho (alguns cobrem 2 dias) */
  dias: number;
  destino: string;
  motorista: boolean;
  historico: string;
}

export interface Credor {
  nome: string;
  cnpj: string;
  pago: number;
  empenhos: number;
}

export interface ResumoVereador {
  slug: string;
  total: number;
  quantidade: number;
  dias: number;
  porMes: number[];
}

export interface ResumoAno {
  ano: number;
  empenhos: Empenho[];
  totalEmpenhado: number;
  totalLiquidado: number;
  totalPago: number;
  porMes: number[];
  porCategoria: Record<Categoria, number>;
  credores: Credor[];
  diarias: Diaria[];
  diariasTotal: number;
  diariasPorMes: { vereadores: number[]; equipe: number[] };
  diariasPorVereador: ResumoVereador[];
  diariasEquipe: { total: number; quantidade: number; pessoas: Credor[] };
  destinos: { nome: string; valor: number; quantidade: number }[];
  /** quantos detalhes de empenho nao puderam ser lidos (classificacao aproximada) */
  semDetalhe: number;
  atualizadoEm: string;
}

export interface RawEmpenho {
  nome_unidade_gestora?: string;
  numero_empenho: string;
  ano: string;
  data: string;
  credor_nome: string;
  credor_cnpj: string;
  valor_empenhado: string;
  valor_liquidado: string;
  valor_pago: string;
}

export interface Detalhe {
  natureza: string;
  historico: string;
  unidade?: string;
  funcao?: string;
  licitacao?: string;
  contrato?: string;
  cnpj?: string;
  valor?: string;
}

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                  */
/* -------------------------------------------------------------------------- */

export function brNumber(s: string | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function parts(): Record<string, string> {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, x) => ((acc[x.type] = x.value), acc), {});
}

function authHeader(): string {
  const p = parts();
  return `Basic ${btoa(`PortalQuality:${md5(`PortalQuality${p.year}${p.month}${p.day}${p.hour}`)}`)}`;
}

export function anoAtual(): number {
  return Number(parts().year);
}

/** Anos disponiveis para consulta (do atual ate 2023). */
export function anosDisponiveis(): number[] {
  const atual = anoAtual();
  const out: number[] = [];
  for (let a = atual; a >= Math.max(2023, atual - 4); a--) out.push(a);
  return out;
}

/* -------------------------------------------------------------------------- */
/* Acesso a API                                                                */
/* -------------------------------------------------------------------------- */

export async function buscarBruto(entidade: string, ano: number): Promise<RawEmpenho[] | null> {
  const p = parts();
  const fim = ano === Number(p.year) ? `${p.day}${p.month}${ano}` : `3112${ano}`;
  try {
    const r = await fetch(`${BASE_API}/despesas/${entidade}/0101${ano}/${fim}`, {
      headers: { Authorization: authHeader() },
    });
    if (r.status === 404) return [];
    if (!r.ok) return null;
    const j = (await r.json()) as { empenhos?: RawEmpenho[] };
    return j.empenhos ?? [];
  } catch {
    return null;
  }
}

/** Le o detalhe de um empenho. null = falha temporaria; 'nada' = o portal nao conhece esse empenho nesse orgao. */
export async function buscarDetalheApi(entidade: string, ano: string, numero: string, orgao: string): Promise<Detalhe | null | 'nada'> {
  let r: Response | null = null;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      r = await fetch(`${BASE_API}/empenho/${entidade}/${numero}/${ano}/${orgao}`, { headers: { Authorization: authHeader() } });
      if (r.ok || r.status === 404) break;
    } catch {
      r = null;
    }
    await new Promise((ok) => setTimeout(ok, 300 * (tentativa + 1)));
  }
  if (!r) return null;
  if (r.status === 404) return 'nada';
  if (!r.ok) return null;
  try {
    const j = (await r.json()) as { detalhesempenho?: Record<string, string>[] };
    const d = j.detalhesempenho?.[0];
    if (!d) return 'nada';
    return {
      natureza: d.natureza_despesa ?? '',
      historico: (d.historico ?? '').replace(/s+/g, ' ').trim(),
      unidade: d.unidade_orcamentaria ?? '',
      funcao: d.funcao ?? '',
      licitacao: d.licitacao ?? '',
      contrato: d.contrato ?? '',
      cnpj: d.cpf_cnpj ?? '',
      valor: d.valor ?? '',
    };
  } catch {
    return null;
  }
}

export async function emLotes<T, R>(itens: T[], simultaneos: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(itens.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(simultaneos, itens.length) }, async () => {
      while (i < itens.length) {
        const k = i++;
        out[k] = await fn(itens[k]);
      }
    }),
  );
  return out;
}

/* -------------------------------------------------------------------------- */
/* Interpretacao                                                               */
/* -------------------------------------------------------------------------- */

function vereadorDe(nome: string): Vereador | null {
  return VEREADORES.find((v) => v.match.test(nome.trim())) ?? null;
}

function destinoDe(historico: string): string {
  const m = historico.match(/DESTINO\s+(?:À|A|AO|PARA)\s+([^,;.\d]+?)(?:\s*\/\s*([A-Z]{2}))?\s*(?:,|;|\.|\bNO\b|\bNOS\b|\bDIA\b|$)/i);
  if (!m) return 'Não informado';
  const cidade = m[1].trim().toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()).replace(/\s(De|Do|Da|Dos|Das)\s/g, (c) => c.toLowerCase());
  return m[2] ? `${cidade}/${m[2].toUpperCase()}` : cidade;
}

/** Conta os dias citados no historico (aceita "08/072026", erro comum da fonte). */
function diasDe(historico: string, valor: number): number {
  const datas = new Set((historico.match(/\d{2}\/\d{2}\/?\d{4}/g) ?? []).map((d) => d.replace(/\//g, '')));
  if (datas.size > 0) return datas.size;
  return valor > 1500 ? 2 : 1;
}

export function semAcento(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function distancia(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** Junta destinos com erro de digitacao ("Foz do Igaçu" -> "Foz do Iguaçu") no nome mais frequente. */
function unificarDestinos(diarias: Diaria[]): void {
  const freq = new Map<string, number>();
  for (const d of diarias) freq.set(d.destino, (freq.get(d.destino) ?? 0) + 1);
  const nomes = [...freq.keys()].sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0));
  const canonico = new Map<string, string>();
  for (const n of nomes) {
    const igual = [...new Set(canonico.values())].find((c) => {
      const x = semAcento(c);
      const y = semAcento(n);
      return x === y || (Math.min(x.length, y.length) > 6 && distancia(x, y) <= 2);
    });
    canonico.set(n, igual ?? n);
  }
  for (const d of diarias) d.destino = canonico.get(d.destino) ?? d.destino;
}

function resumir(ano: number, bruto: RawEmpenho[], detalhes: Map<string, Detalhe | null>): ResumoAno {
  const unicos = new Map<string, RawEmpenho>();
  for (const x of bruto) {
    const key = `${x.ano}/${x.numero_empenho}`;
    if (!unicos.has(key)) unicos.set(key, x);
  }

  const empenhos: Empenho[] = [];
  const diarias: Diaria[] = [];
  let semDetalhe = 0;

  for (const x of unicos.values()) {
    const [d, m, y] = x.data.split('/');
    const nome = x.credor_nome?.trim() || 'Não informado';
    const cnpj = x.credor_cnpj ?? '';
    const pago = brNumber(x.valor_pago);
    const det = detalhes.get(`${x.ano}/${x.numero_empenho}`);
    const pessoaFisica = cnpj.length === 11 && !/FOLHA/i.test(nome);

    let categoria: Categoria = 'fornecedores';
    if (/FOLHA/i.test(nome)) categoria = 'folha';
    else if (/INSS|PREVID|RPPS|FGTS/i.test(nome)) categoria = 'encargos';
    else if (pessoaFisica) {
      if (det === undefined || det === null) semDetalhe += 1;
      else if (/di[aá]ria/i.test(det.natureza) || /CONCESS[ÃA]O DE DI[ÁA]RIA/i.test(det.historico)) categoria = 'diarias';
    }

    const iso = `${y}-${m}-${d}`;
    empenhos.push({ numero: x.numero_empenho, data: iso, credor: nome, cnpj, empenhado: brNumber(x.valor_empenhado), liquidado: brNumber(x.valor_liquidado), pago, categoria });

    if (categoria === 'diarias') {
      const hist = det?.historico ?? '';
      const ver = vereadorDe(nome);
      diarias.push({
        numero: x.numero_empenho,
        data: iso,
        credor: nome,
        vereador: ver?.slug ?? null,
        valor: pago,
        dias: diasDe(hist, pago),
        destino: destinoDe(hist),
        motorista: /motorista/i.test(hist),
        historico: hist,
      });
    }
  }

  const ordem = (a: { data: string; numero: string }, b: { data: string; numero: string }) =>
    a.data < b.data ? 1 : a.data > b.data ? -1 : Number(b.numero) - Number(a.numero);
  empenhos.sort(ordem);
  diarias.sort(ordem);
  unificarDestinos(diarias);

  const porMes = Array<number>(12).fill(0);
  const porCategoria: Record<Categoria, number> = { folha: 0, encargos: 0, diarias: 0, fornecedores: 0 };
  const cred = new Map<string, Credor>();
  let totalEmpenhado = 0;
  let totalLiquidado = 0;
  let totalPago = 0;
  for (const e of empenhos) {
    totalEmpenhado += e.empenhado;
    totalLiquidado += e.liquidado;
    totalPago += e.pago;
    porCategoria[e.categoria] += e.pago;
    const mes = Number(e.data.slice(5, 7)) - 1;
    if (mes >= 0 && mes < 12) porMes[mes] += e.pago;
    const k = e.cnpj || e.credor;
    const c = cred.get(k) ?? { nome: e.credor, cnpj: e.cnpj, pago: 0, empenhos: 0 };
    c.pago += e.pago;
    c.empenhos += 1;
    cred.set(k, c);
  }
  const credores = [...cred.values()].sort((a, b) => b.pago - a.pago);

  // Diarias
  const mesVer = Array<number>(12).fill(0);
  const mesEqp = Array<number>(12).fill(0);
  const verMap = new Map<string, ResumoVereador>();
  const eqpMap = new Map<string, Credor>();
  const destMap = new Map<string, { nome: string; valor: number; quantidade: number }>();
  let diariasTotal = 0;
  for (const d of diarias) {
    diariasTotal += d.valor;
    const mes = Number(d.data.slice(5, 7)) - 1;
    if (d.vereador) {
      mesVer[mes] += d.valor;
      const r = verMap.get(d.vereador) ?? { slug: d.vereador, total: 0, quantidade: 0, dias: 0, porMes: Array<number>(12).fill(0) };
      r.total += d.valor;
      r.quantidade += 1;
      r.dias += d.dias;
      r.porMes[mes] += d.valor;
      verMap.set(d.vereador, r);
    } else {
      mesEqp[mes] += d.valor;
      const c = eqpMap.get(d.credor) ?? { nome: d.credor, cnpj: '', pago: 0, empenhos: 0 };
      c.pago += d.valor;
      c.empenhos += 1;
      eqpMap.set(d.credor, c);
    }
    const dst = destMap.get(d.destino) ?? { nome: d.destino, valor: 0, quantidade: 0 };
    dst.valor += d.valor;
    dst.quantidade += 1;
    destMap.set(d.destino, dst);
  }

  const diariasPorVereador = VEREADORES.map(
    (v) => verMap.get(v.slug) ?? { slug: v.slug, total: 0, quantidade: 0, dias: 0, porMes: Array<number>(12).fill(0) },
  ).sort((a, b) => b.total - a.total);
  const pessoas = [...eqpMap.values()].sort((a, b) => b.pago - a.pago);

  return {
    ano,
    empenhos,
    totalEmpenhado,
    totalLiquidado,
    totalPago,
    porMes,
    porCategoria,
    credores,
    diarias,
    diariasTotal,
    diariasPorMes: { vereadores: mesVer, equipe: mesEqp },
    diariasPorVereador,
    diariasEquipe: { total: pessoas.reduce((s, p) => s + p.pago, 0), quantidade: pessoas.reduce((s, p) => s + p.empenhos, 0), pessoas },
    destinos: [...destMap.values()].sort((a, b) => b.valor - a.valor),
    semDetalhe,
    atualizadoEm: new Date().toISOString(),
  };
}

/** Calcula o resumo da Camara a partir dos dados brutos e dos detalhes ja guardados. */
export function montarResumoCamara(ano: number, bruto: RawEmpenho[], detalhes: Record<string, Detalhe>): ResumoAno {
  const mapa = new Map<string, Detalhe | null>();
  for (const x of bruto) mapa.set(`${x.ano}/${x.numero_empenho}`, detalhes[`${x.ano}/${x.numero_empenho}`] ?? null);
  return resumir(ano, bruto, mapa);
}

/** Empenhos da Camara que precisam de detalhe (pessoas fisicas, exceto folha). */
export function alvosCamara(bruto: RawEmpenho[]): RawEmpenho[] {
  const vistos = new Set<string>();
  const alvos: RawEmpenho[] = [];
  for (const x of bruto) {
    const key = `${x.ano}/${x.numero_empenho}`;
    if (vistos.has(key)) continue;
    vistos.add(key);
    if ((x.credor_cnpj ?? '').length === 11 && !/FOLHA/i.test(x.credor_nome ?? '')) alvos.push(x);
  }
  return alvos;
}

/* -------------------------------------------------------------------------- */
/* Formatacao                                                                  */
/* -------------------------------------------------------------------------- */

export function brl(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

/** "R$ 3,7 mi" / "R$ 297 mil" para totais grandes. */
export function brlCurto(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  if (v >= 10_000) return `R$ ${Math.round(v / 1000)} mil`;
  return brl(v);
}

export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
