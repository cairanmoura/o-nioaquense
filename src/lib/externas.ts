/**
 * Dados de fora da Prefeitura sobre Nioaque: IBGE, Governo de MS (dados.ms.gov.br)
 * e Governo Federal (Portal da Transparencia da CGU).
 *
 * Tudo roda no job da Transparencia (fila) e fica em `transparencia_cache`; as
 * paginas so leem de la. Cada funcao devolve `null` quando a fonte esta fora do ar,
 * para o job tentar de novo depois sem apagar o ultimo resumo bom.
 */

export const IBGE_MUNICIPIO = '5005806';
/** CNPJ da Prefeitura Municipal de Nioaque (Tesouro Nacional / Receita Federal). */
export const CNPJ_PREFEITURA = '03073699000108';

const UA = 'Mozilla/5.0 (compatible; ONioaquense/1.0; +https://onioaquense.com)';

async function getJson<T>(url: string, headers: Record<string, string> = {}, tentativas = 3): Promise<T | null> {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json', ...headers } });
      if (r.status === 429 || r.status >= 500) {
        await new Promise((ok) => setTimeout(ok, 1500 * (i + 1)));
        continue;
      }
      if (!r.ok) return null;
      return (await r.json()) as T;
    } catch {
      await new Promise((ok) => setTimeout(ok, 800 * (i + 1)));
    }
  }
  return null;
}

/** "397562,24" ou "R$ 100.000,00" -> numero. */
export function numeroBr(v: unknown): number {
  if (typeof v === 'number') return v;
  const s = String(v ?? '')
    .replace(/R\$|\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/* -------------------------------------------------------------------------- */
/* IBGE                                                                        */
/* -------------------------------------------------------------------------- */

export interface SerieIbge {
  ano: number;
  valor: number;
}
export interface ResumoIbge {
  geradoEm: string;
  populacaoCenso: SerieIbge | null;
  densidade: number | null;
  area: number | null;
  estimativas: SerieIbge[];
  pibMilReais: SerieIbge | null;
  bovinos: SerieIbge | null;
  lavouras: { nome: string; ano: number; toneladas: number }[];
  pessoalOcupado: SerieIbge | null;
  pessoalAssalariado: SerieIbge | null;
}

type Agregado = {
  id: string;
  variavel: string;
  unidade: string;
  resultados: { classificacoes: { categoria: Record<string, string> }[]; series: { serie: Record<string, string> }[] }[];
}[];

const IBGE = 'https://servicodados.ibge.gov.br/api/v3/agregados';
const loc = `localidades=N6[${IBGE_MUNICIPIO}]`;

/** Ultimo valor numerico de uma serie ("-", ".." e "..." viram vazio). */
function ultimo(serie: Record<string, string> | undefined): SerieIbge | null {
  if (!serie) return null;
  const anos = Object.keys(serie).sort();
  for (let i = anos.length - 1; i >= 0; i--) {
    const n = Number(serie[anos[i]]);
    if (serie[anos[i]] && /^-?\d+(\.\d+)?$/.test(serie[anos[i]]) && Number.isFinite(n)) return { ano: Number(anos[i]), valor: n };
  }
  return null;
}
const porVariavel = (a: Agregado | null, id: string) => a?.find((v) => v.id === id)?.resultados[0]?.series[0]?.serie;

export async function buscarIbge(): Promise<ResumoIbge | null> {
  const [censo, estim, pib, rebanho, lavoura, ocup, area] = await Promise.all([
    getJson<Agregado>(`${IBGE}/4714/periodos/2022/variaveis/93|614?${loc}`),
    getJson<Agregado>(`${IBGE}/6579/periodos/-3/variaveis/9324?${loc}`),
    getJson<Agregado>(`${IBGE}/5938/periodos/-1/variaveis/37?${loc}`),
    getJson<Agregado>(`${IBGE}/3939/periodos/-1/variaveis/105?${loc}&classificacao=79[2670]`),
    getJson<Agregado>(`${IBGE}/1612/periodos/-1/variaveis/214?${loc}&classificacao=81[2713,2711,2696]`),
    getJson<Agregado>(`${IBGE}/1685/periodos/-1/variaveis/707|708?${loc}`),
    getJson<Agregado>(`${IBGE}/1301/periodos/-1/variaveis/615?${loc}`),
  ]);
  // sem o censo e a estimativa nao ha o que mostrar: trata como fora do ar
  if (!censo && !estim) return null;

  const estimativas: SerieIbge[] = [];
  const s = porVariavel(estim, '9324');
  if (s) for (const [ano, v] of Object.entries(s)) if (Number.isFinite(Number(v))) estimativas.push({ ano: Number(ano), valor: Number(v) });
  estimativas.sort((a, b) => a.ano - b.ano);

  const lavouras: ResumoIbge['lavouras'] = [];
  for (const r of lavoura?.[0]?.resultados ?? []) {
    const nome = Object.values(r.classificacoes[0]?.categoria ?? {})[0];
    const u = ultimo(r.series[0]?.serie);
    if (nome && u && u.valor > 0) lavouras.push({ nome, ano: u.ano, toneladas: u.valor });
  }

  return {
    geradoEm: new Date().toISOString(),
    populacaoCenso: ultimo(porVariavel(censo, '93')),
    densidade: ultimo(porVariavel(censo, '614'))?.valor ?? null,
    area: ultimo(porVariavel(area, '615'))?.valor ?? null,
    estimativas,
    pibMilReais: ultimo(porVariavel(pib, '37')),
    bovinos: ultimo(porVariavel(rebanho, '105')),
    lavouras,
    pessoalOcupado: ultimo(porVariavel(ocup, '707')),
    pessoalAssalariado: ultimo(porVariavel(ocup, '708')),
  };
}

/* -------------------------------------------------------------------------- */
/* Governo de MS (CKAN)                                                        */
/* -------------------------------------------------------------------------- */

const CKAN = 'https://www.dados.ms.gov.br/api/3/action';

export interface EmendaEstadual {
  numero: string;
  beneficiario: string;
  objeto: string;
  orgao: string;
  valor: number;
  deputado: string;
  status: string;
  atualizadoEm: string;
}
export interface ResumoEstado {
  ano: number;
  geradoEm: string;
  repasses: {
    total: number;
    /** soma por mes (indice 0 = janeiro) */
    porMes: number[];
    porTipo: { tipo: string; total: number }[];
    ultimoMes: number;
    /** meses (0 = janeiro) em que a fonte nao trouxe o ICMS: o valor do mes esta incompleto */
    mesesSemIcms: number[];
  };
  emendas: { total: number; quantidade: number; lista: EmendaEstadual[] };
}

type Ckan<T> = { success: boolean; result: T };

/** CSV com ';' e aspas duplas. */
export function lerCsv(txt: string): string[][] {
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (aspas) {
      if (c === '"') {
        if (txt[i + 1] === '"') {
          campo += '"';
          i++;
        } else aspas = false;
      } else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ';') {
      linha.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && txt[i + 1] === '\n') i++;
      linha.push(campo);
      campo = '';
      if (linha.some((x) => x.trim())) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  if (campo || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

async function repassesDoAno(ano: number): Promise<ResumoEstado['repasses'] | null> {
  const pkg = await getJson<Ckan<{ resources: { name: string; url: string }[] }>>(`${CKAN}/package_show?id=repasses-dos-municipios`);
  if (!pkg?.success) return null;
  // o nome do recurso termina em "MM/AAAA"; o id do datastore e' o final da URL do dump
  const meses = pkg.result.resources
    .map((r) => {
      const m = r.name.match(/(\d{2})\/(\d{4})\s*$/);
      const id = r.url.match(/dump\/([^/?#]+)/)?.[1];
      return m && id && Number(m[2]) === ano ? { mes: Number(m[1]), id } : null;
    })
    .filter((x): x is { mes: number; id: string } => !!x);

  const porMes = Array<number>(12).fill(0);
  const porTipo = new Map<string, number>();
  let ultimoMes = -1;
  let falhou = 0;
  const comIcms = new Set<number>();
  for (const { mes, id } of meses) {
    const r = await getJson<Ckan<{ records: Record<string, string>[] }>>(`${CKAN}/datastore_search?resource_id=${encodeURIComponent(id)}&q=NIOAQUE&limit=100`);
    if (!r?.success) {
      falhou++;
      continue;
    }
    for (const x of r.result.records) {
      if (!semAcento(x.Municipio ?? '').includes('NIOAQUE')) continue;
      const v = numeroBr(x.Valor_Total);
      porMes[mes - 1] += v;
      const tipo = (x.Tipo_Repasse ?? 'OUTROS').replace(/^REPASSE (DE |DO |DA )?/i, '').trim();
      porTipo.set(tipo, (porTipo.get(tipo) ?? 0) + v);
      if (/ICMS/i.test(tipo)) comIcms.add(mes - 1);
      ultimoMes = Math.max(ultimoMes, mes - 1);
    }
  }
  if (meses.length && falhou === meses.length) return null;
  const lista = [...porTipo].map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total);
  const mesesSemIcms = Array.from({ length: ultimoMes + 1 }, (_, i) => i).filter((i) => !comIcms.has(i));
  return { total: porMes.reduce((s, v) => s + v, 0), porMes, porTipo: lista, ultimoMes, mesesSemIcms };
}

async function emendasDoAno(ano: number): Promise<ResumoEstado['emendas'] | null> {
  const pkg = await getJson<Ckan<{ resources: { name: string; format: string; url: string }[] }>>(`${CKAN}/package_show?id=emendas-parlamentares`);
  if (!pkg?.success) return null;
  const rec = pkg.result.resources.find((r) => r.format.toUpperCase() === 'CSV' && r.name.includes(String(ano)));
  // ano sem planilha publicada ainda: sem emendas, nao e' erro
  if (!rec) return { total: 0, quantidade: 0, lista: [] };
  let txt = '';
  try {
    const r = await fetch(rec.url, { headers: { 'user-agent': UA } });
    if (!r.ok) return null;
    txt = await r.text();
  } catch {
    return null;
  }
  const linhas = lerCsv(txt.replace(/^﻿/, ''));
  const cab = linhas[0]?.map((h) => semAcento(h.trim()));
  if (!cab) return null;
  const col = (nome: string) => cab.findIndex((h) => h.startsWith(nome));
  const iNum = col('N');
  const iBen = col('BENEFICIARIO(A)');
  const iMun = col('MUNICIPIO');
  const iObj = col('OBJETO');
  const iOrg = col('ORGAO');
  const iVal = col('VALOR');
  const iDep = col('NOMES(S) POLITICO');
  const iDep2 = col('DEPUTADO');
  const iSta = col('STATUS');
  const iAtu = col('ULTIMA');
  const lista: EmendaEstadual[] = [];
  for (const l of linhas.slice(1)) {
    if (!semAcento(l[iMun] ?? '').includes('NIOAQUE')) continue;
    lista.push({
      numero: l[iNum] ?? '',
      beneficiario: (l[iBen] ?? '').trim(),
      objeto: (l[iObj] ?? '').trim(),
      orgao: (l[iOrg] ?? '').trim(),
      valor: numeroBr(l[iVal]),
      deputado: ((l[iDep] || l[iDep2]) ?? '').trim(),
      status: (l[iSta] ?? '').trim(),
      atualizadoEm: (l[iAtu] ?? '').trim(),
    });
  }
  lista.sort((a, b) => b.valor - a.valor);
  return { total: lista.reduce((s, x) => s + x.valor, 0), quantidade: lista.length, lista };
}

export async function buscarEstado(ano: number): Promise<ResumoEstado | null> {
  const repasses = await repassesDoAno(ano);
  if (!repasses) return null;
  const emendas = await emendasDoAno(ano);
  if (!emendas) return null;
  return { ano, geradoEm: new Date().toISOString(), repasses, emendas };
}

/* -------------------------------------------------------------------------- */
/* Governo Federal (Portal da Transparencia / CGU)                             */
/* -------------------------------------------------------------------------- */

const CGU = 'https://api.portaldatransparencia.gov.br/api-de-dados';

export interface ResumoFederal {
  ano: number;
  geradoEm: string;
  /** dinheiro que saiu dos ministerios para a Prefeitura (pagamentos por orgao) */
  transferencias: {
    total: number;
    porMes: number[];
    porMinisterio: { nome: string; total: number; orgaos: { nome: string; total: number }[] }[];
    ultimoMes: number;
  };
  /** programas pagos direto as familias de Nioaque, por mes */
  programas: { nome: string; porMes: { mes: number; valor: number; beneficiarios: number }[]; ultimo: { mes: number; valor: number; beneficiarios: number } | null; totalAno: number }[];
}

type RecursoRecebido = { anoMes: number; nomeOrgaoSuperior: string; nomeOrgao: string; valor: number };
type ProgramaMes = { dataReferencia: string; valor: number; quantidadeBeneficiados: number };

async function transferencias(ano: number, chave: string): Promise<ResumoFederal['transferencias'] | null> {
  const h = { 'chave-api-dados': chave };
  const todos: RecursoRecebido[] = [];
  for (let pagina = 1; pagina <= 60; pagina++) {
    const r = await getJson<RecursoRecebido[]>(
      `${CGU}/despesas/recursos-recebidos?mesAnoInicio=01/${ano}&mesAnoFim=12/${ano}&codigoFavorecido=${CNPJ_PREFEITURA}&pagina=${pagina}`,
      h,
    );
    if (r === null) return null;
    if (!r.length) break;
    todos.push(...r);
    await new Promise((ok) => setTimeout(ok, 700)); // limite da API: 90 chamadas por minuto
  }
  const porMes = Array<number>(12).fill(0);
  const min = new Map<string, { total: number; orgaos: Map<string, number> }>();
  let ultimoMes = -1;
  for (const x of todos) {
    if (!x.valor) continue;
    const mes = (x.anoMes % 100) - 1;
    if (mes < 0 || mes > 11) continue;
    porMes[mes] += x.valor;
    ultimoMes = Math.max(ultimoMes, mes);
    const m = min.get(x.nomeOrgaoSuperior) ?? { total: 0, orgaos: new Map() };
    m.total += x.valor;
    m.orgaos.set(x.nomeOrgao, (m.orgaos.get(x.nomeOrgao) ?? 0) + x.valor);
    min.set(x.nomeOrgaoSuperior, m);
  }
  const porMinisterio = [...min]
    .map(([nome, m]) => ({
      nome,
      total: m.total,
      orgaos: [...m.orgaos].map(([n, total]) => ({ nome: n, total })).sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);
  return { total: porMes.reduce((s, v) => s + v, 0), porMes, porMinisterio, ultimoMes };
}

async function programa(nome: string, rota: string, ano: number, chave: string): Promise<ResumoFederal['programas'][number] | null> {
  const h = { 'chave-api-dados': chave };
  const porMes: { mes: number; valor: number; beneficiarios: number }[] = [];
  const hoje = new Date();
  const ultimoMesAno = ano === hoje.getUTCFullYear() ? hoje.getUTCMonth() + 1 : 12;
  let falhas = 0;
  for (let mes = 1; mes <= ultimoMesAno; mes++) {
    const r = await getJson<ProgramaMes[]>(`${CGU}/${rota}?mesAno=${ano}${String(mes).padStart(2, '0')}&codigoIbge=${IBGE_MUNICIPIO}&pagina=1`, h);
    if (r === null) {
      falhas++;
      continue;
    }
    const valor = r.reduce((s, x) => s + x.valor, 0);
    const benef = r.reduce((s, x) => s + x.quantidadeBeneficiados, 0);
    if (valor > 0 || benef > 0) porMes.push({ mes, valor, beneficiarios: benef });
    await new Promise((ok) => setTimeout(ok, 700));
  }
  if (falhas === ultimoMesAno) return null;
  return { nome, porMes, ultimo: porMes[porMes.length - 1] ?? null, totalAno: porMes.reduce((s, x) => s + x.valor, 0) };
}

export async function buscarFederal(ano: number, chave: string | undefined): Promise<ResumoFederal | null> {
  if (!chave) return null;
  const trf = await transferencias(ano, chave);
  if (!trf) return null;
  const programas: ResumoFederal['programas'] = [];
  for (const [nome, rota] of [
    ['Bolsa Família', 'novo-bolsa-familia-por-municipio'],
    ['Benefício de Prestação Continuada (BPC)', 'bpc-por-municipio'],
  ] as const) {
    const p = await programa(nome, rota, ano, chave);
    if (p) programas.push(p);
  }
  return { ano, geradoEm: new Date().toISOString(), transferencias: trf, programas };
}
