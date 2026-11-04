/**
 * Receitas da Prefeitura de Nioaque, lidas do SICONFI (Tesouro Nacional).
 *
 * A API de Dados Abertos do portal da Prefeitura (Quality) so expoe despesas.
 * A receita arrecadada vem do que a propria Prefeitura declara ao Tesouro Nacional:
 *  - RREO Simplificado, Anexo 01 (bimestral): previsao e arrecadacao do ano em curso;
 *  - DCA, Anexo I-C (anual): receita realizada do ano fechado, por fonte (FPM, ICMS...).
 * API publica e sem senha: https://apidatalake.tesouro.gov.br
 */

const TESOURO = 'https://apidatalake.tesouro.gov.br/ords/siconfi/tt';
export const IBGE_NIOAQUE = '5005806';

export interface GrupoReceita {
  /** nome simples, para quem nao e' contador */
  nome: string;
  previsao: number;
  arrecadado: number;
  cor: string;
}

export interface FonteReceita {
  nome: string;
  valor: number;
}

export interface ResumoReceitas {
  ano: number;
  /** ultimo bimestre ja informado ao Tesouro (1 a 6) */
  bimestre: number;
  previsao: number;
  arrecadado: number;
  /** arrecadado em cada bimestre informado */
  porBimestre: number[];
  grupos: GrupoReceita[];
  /** ano da DCA usada em `fontes` (ano fechado), quando existe */
  anoFontes: number | null;
  /** receita bruta do ano fechado (DCA) */
  totalFontes: number;
  /** descontos da DCA (FUNDEB e outros): bruta menos isto = receita liquida do RREO */
  deducoesFontes: number;
  fontes: FonteReceita[];
  atualizadoEm: string;
}

interface Linha {
  cod_conta: string;
  conta: string;
  coluna: string;
  valor: number | null;
}

async function pegar(path: string): Promise<Linha[] | null> {
  try {
    const r = await fetch(`${TESOURO}/${path}`, { headers: { accept: 'application/json' } });
    if (!r.ok) return null;
    const j = (await r.json()) as { items?: Linha[] };
    return j.items ?? [];
  } catch {
    return null;
  }
}

const rreo = (ano: number, bim: number) =>
  pegar(
    `rreo?an_exercicio=${ano}&nr_periodo=${bim}&co_tipo_demonstrativo=${encodeURIComponent('RREO Simplificado')}&no_anexo=${encodeURIComponent('RREO-Anexo 01')}&id_ente=${IBGE_NIOAQUE}`,
  );
const dca = (ano: number) => pegar(`dca?an_exercicio=${ano}&no_anexo=${encodeURIComponent('DCA-Anexo I-C')}&id_ente=${IBGE_NIOAQUE}`);

const pegaValor = (linhas: Linha[], cod: string, coluna: string): number =>
  Number(linhas.find((l) => l.cod_conta === cod && l.coluna === coluna)?.valor ?? 0);

/** Grupos do RREO (cod_conta do Tesouro) com nome simples e cor. */
const GRUPOS: { cod: string; nome: string; cor: string }[] = [
  { cod: 'TransferenciasCorrentesDaUniaoEDeSuasEntidades', nome: 'Repasses da União (FPM, SUS, educação)', cor: '#0D4722' },
  { cod: 'TransferenciasCorrentesDosEstadosEDoDistritoFederalEDeSuasEntidades', nome: 'Repasses do Estado (ICMS, IPVA, convênios)', cor: '#166A34' },
  { cod: 'TransferenciasCorrentesDeOutrasInstituicoesPublicas', nome: 'Repasses de outras instituições públicas', cor: '#6FCB8B' },
  { cod: 'ReceitaTributaria', nome: 'Impostos e taxas do município', cor: '#D97706' },
  { cod: 'ReceitaDeContribuicoes', nome: 'Contribuições (iluminação pública)', cor: '#2B6CB0' },
  { cod: 'ReceitaPatrimonial', nome: 'Rendimentos de aplicações', cor: '#8A6BBE' },
  { cod: 'OutrasReceitasCorrentes', nome: 'Outras receitas correntes', cor: '#8A8F8A' },
  { cod: 'OutrasTransferenciasCorrentes', nome: 'Demais transferências correntes', cor: '#B9B29E' },
  { cod: 'ReceitasDeCapital', nome: 'Receitas de capital (convênios e obras)', cor: '#D92323' },
];

/** Fontes da DCA (receita bruta realizada do ano fechado). */
const FONTES: [string, string][] = [
  ['RO1.7.1.1.51.0.0', 'FPM (Fundo de Participação dos Municípios)'],
  ['RO1.7.2.1.50.0.0', 'ICMS (cota-parte do Estado)'],
  ['RO1.7.5.0.00.0.0', 'Outras instituições públicas'],
  ['RO1.7.1.3.00.0.0', 'SUS: repasses da União'],
  ['RO1.7.2.3.00.0.0', 'SUS: repasses do Estado'],
  ['RO1.7.1.1.52.0.0', 'ITR (cota-parte do imposto rural)'],
  ['RO1.1.1.4.51.0.0', 'ISS (imposto sobre serviços)'],
  ['RO1.1.1.3.00.0.0', 'Imposto de renda retido na fonte'],
  ['RO1.1.1.2.53.0.0', 'ITBI (transmissão de imóveis)'],
  ['RO1.1.1.2.50.0.0', 'IPTU (imposto predial e territorial)'],
  ['RO1.7.1.4.00.0.0', 'Educação: FNDE (salário-educação, merenda, transporte)'],
  ['RO1.7.2.4.00.0.0', 'Convênios com o Estado'],
  ['RO1.7.2.1.51.0.0', 'IPVA (cota-parte do Estado)'],
  ['RO1.2.4.0.00.0.0', 'Contribuição de iluminação pública'],
  ['RO2.4.0.0.00.0.0', 'Transferências de capital'],
];

/** Monta o resumo de receitas de um ano. Devolve null se o Tesouro estiver fora do ar. */
export async function buscarReceitas(ano: number): Promise<ResumoReceitas | null> {
  const porBim: Linha[][] = [];
  for (let b = 1; b <= 6; b++) {
    const l = await rreo(ano, b);
    if (l === null) return null;
    if (l.length === 0) break;
    porBim.push(l);
  }

  // DCA: do proprio ano (se ja fechou) ou do anterior
  let anoFontes: number | null = null;
  let linhasDca: Linha[] = [];
  for (const a of [ano, ano - 1]) {
    const l = await dca(a);
    if (l && l.length) {
      anoFontes = a;
      linhasDca = l;
      break;
    }
  }

  if (porBim.length === 0 && linhasDca.length === 0) return null;

  const ultimo = porBim[porBim.length - 1] ?? [];
  const COD_TOTAL = 'ReceitasExcetoIntraOrcamentarias';
  const grupos: GrupoReceita[] = ultimo.length
    ? GRUPOS.map((g) => ({ nome: g.nome, cor: g.cor, previsao: pegaValor(ultimo, g.cod, 'PREVISÃO ATUALIZADA (a)'), arrecadado: pegaValor(ultimo, g.cod, 'Até o Bimestre (c)') }))
        .filter((g) => g.arrecadado > 0 || g.previsao > 0)
        .sort((a, b) => b.arrecadado - a.arrecadado)
    : [];

  const fontes: FonteReceita[] = FONTES.map(([cod, nome]) => ({ nome, valor: pegaValor(linhasDca, cod, 'Receitas Brutas Realizadas') }))
    .filter((f) => f.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  return {
    ano,
    bimestre: porBim.length,
    previsao: pegaValor(ultimo, COD_TOTAL, 'PREVISÃO ATUALIZADA (a)'),
    arrecadado: pegaValor(ultimo, COD_TOTAL, 'Até o Bimestre (c)'),
    porBimestre: porBim.map((l) => pegaValor(l, COD_TOTAL, 'No Bimestre (b)')),
    grupos,
    anoFontes,
    totalFontes: pegaValor(linhasDca, COD_TOTAL, 'Receitas Brutas Realizadas'),
    deducoesFontes: pegaValor(linhasDca, COD_TOTAL, 'Deduções - FUNDEB') + pegaValor(linhasDca, COD_TOTAL, 'Outras Deduções da Receita'),
    fontes,
    atualizadoEm: new Date().toISOString(),
  };
}
