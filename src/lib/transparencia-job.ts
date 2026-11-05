/**
 * Atualizacao dos dados da Transparencia (Camara e Prefeitura).
 *
 * Roda na fila (um passo pequeno por mensagem, que se reenfileira ate acabar),
 * para nao estourar os limites do Worker nem sobrecarregar o portal oficial.
 * O resultado fica na tabela `transparencia_cache`; as paginas so leem de la.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  alvosCamara,
  anoAtual,
  buscarBruto,
  buscarDetalheApi,
  COD_CAMARA,
  emLotes,
  ENTIDADE,
  montarResumoCamara,
  type Detalhe,
  type RawEmpenho,
} from './transparencia';
import { buscarReceitas } from './receitas';
import { buscarFolha, type ResumoFolha } from './folha';
import { buscarEstado, buscarFederal, buscarIbge } from './externas';
import { chaveEmpenho, ENTIDADE_PREFEITURA, montarResumoPref, orgaoDe, ORGAOS_TENTAR } from './prefeitura';
import { CONFIG_PADRAO, dataLocal, devidaHoje, gravarChave, lerChave, type ConfigAtualizacao } from './transparencia-store';

export interface Estado {
  pendentes: string[];
  iniciadoEm?: string;
  passoEm?: string;
  fimEm?: string;
  /** data (AAAA-MM-DD) da ultima rodada iniciada */
  ultimaExecData?: string;
  origem?: 'agenda' | 'manual' | 'primeira';
  erros?: number;
  ultimoErro?: string;
}

const LOTE = 20;
const SIMULTANEAS = 5;
const MAX_ERROS = 6;

export const chaveResumo = (entidade: 'camara' | 'prefeitura' | 'receitas' | 'folha', ano: number) => `resumo:${entidade}:${ano}`;
export const chaveLista = (ano: number) => `lista:prefeitura:${ano}`;
/** fontes de fora (IBGE, Governo de MS, Governo Federal) */
export const chaveIbge = 'ext:ibge';
export const chaveEstado = (ano: number) => `ext:estado:${ano}`;
export const chaveFederal = (ano: number) => `ext:federal:${ano}`;

export function anosCamara(): number[] {
  const atual = anoAtual();
  const out: number[] = [];
  for (let a = atual; a >= Math.max(2023, atual - 4); a--) out.push(a);
  return out;
}
export function anosPrefeitura(): number[] {
  const atual = anoAtual();
  return [atual, atual - 1];
}

export async function lerEstado(sb: SupabaseClient): Promise<Estado> {
  return (await lerChave<Estado>(sb, 'estado'))?.valor ?? { pendentes: [] };
}
export async function lerConfig(sb: SupabaseClient): Promise<ConfigAtualizacao> {
  return { ...CONFIG_PADRAO, ...((await lerChave<Partial<ConfigAtualizacao>>(sb, 'config'))?.valor ?? {}) };
}

/** Comeca uma rodada de atualizacao e enfileira o primeiro passo. */
export async function iniciarRodada(sb: SupabaseClient, queue: any, origem: Estado['origem'], completa = false): Promise<Estado> {
  const atual = anoAtual();
  const alvos: string[] = [`camara:${atual}`, `prefeitura:${atual}`, `receitas:${atual}`, `folha:${atual}`, 'ibge:0', `estado:${atual}`, `federal:${atual}`];
  const existentes = new Set(
    ((await sb.from('transparencia_cache').select('key').like('key', 'resumo:%')).data ?? []).map((r: { key: string }) => r.key),
  );
  for (const a of anosCamara()) if (a !== atual && (completa || !existentes.has(chaveResumo('camara', a)))) alvos.push(`camara:${a}`);
  for (const a of anosPrefeitura()) if (a !== atual && (completa || !existentes.has(chaveResumo('prefeitura', a)))) alvos.push(`prefeitura:${a}`);
  for (const a of anosPrefeitura()) if (a !== atual && (completa || !existentes.has(chaveResumo('receitas', a)))) alvos.push(`receitas:${a}`);
  const extras = new Set(((await sb.from('transparencia_cache').select('key').like('key', 'ext:%')).data ?? []).map((r: { key: string }) => r.key));
  for (const a of anosPrefeitura()) {
    if (a === atual) continue;
    if (completa || !extras.has(chaveEstado(a))) alvos.push(`estado:${a}`);
    if (completa || !extras.has(chaveFederal(a))) alvos.push(`federal:${a}`);
  }
  const prev = await lerEstado(sb);
  const est: Estado = {
    pendentes: alvos,
    iniciadoEm: new Date().toISOString(),
    passoEm: new Date().toISOString(),
    ultimaExecData: dataLocal().iso,
    origem,
    erros: 0,
    fimEm: undefined,
    ultimoErro: undefined,
  };
  void prev;
  await gravarChave(sb, 'estado', est);
  if (queue) await queue.send({ type: 'transparencia' });
  return est;
}

/** Chamado a cada varredura do cron: inicia a rodada semanal ou retoma uma travada. */
export async function transparenciaCron(sb: SupabaseClient, queue: any): Promise<string> {
  const est = await lerEstado(sb);
  const cfg = await lerConfig(sb);
  if (est.pendentes.length) {
    const parado = Date.now() - Date.parse(est.passoEm ?? est.iniciadoEm ?? '1970-01-01');
    if (parado > 10 * 60_000) {
      await queue.send({ type: 'transparencia' });
      return 'retomada';
    }
    return 'em andamento';
  }
  const hoje = dataLocal();
  const atual = anoAtual();
  const temResumo = new Set(
    ((await sb.from('transparencia_cache').select('key').in('key', [chaveResumo('camara', atual), chaveResumo('prefeitura', atual)])).data ?? []).map(
      (r: { key: string }) => r.key,
    ),
  );
  const primeira = temResumo.size < 2;
  const agenda = devidaHoje(cfg, hoje).devida && hoje.hora >= 3 && est.ultimaExecData !== hoje.iso;
  // sem dados ainda: tenta no maximo a cada 2 horas, para nao insistir se o portal estiver fora do ar
  const recente = est.fimEm || est.passoEm ? Date.now() - Date.parse(est.passoEm ?? est.fimEm ?? '1970-01-01') < 2 * 3600_000 : false;
  if (agenda || (primeira && !recente)) {
    await iniciarRodada(sb, queue, agenda ? 'agenda' : 'primeira');
    return 'iniciada';
  }
  return 'nada a fazer';
}

/* -------------------------------------------------------------------------- */
/* Um passo                                                                    */
/* -------------------------------------------------------------------------- */

type Guardado = Detalhe | 'x';

function compactar(d: Detalhe, guardarHistorico: boolean): Detalhe {
  return {
    natureza: d.natureza,
    historico: guardarHistorico || /di[aá]ria/i.test(d.natureza) ? d.historico : '',
    unidade: d.unidade,
    funcao: d.funcao,
    licitacao: d.licitacao,
    contrato: d.contrato,
  };
}

/** Faz um lote de trabalho. Devolve se ainda ha o que fazer e em quantos segundos reenfileirar. */
export async function passoTransparencia(sb: SupabaseClient, chaveFederalApi?: string): Promise<{ continua: boolean; atraso: number; info: string }> {
  const est = await lerEstado(sb);
  if (!est.pendentes.length) return { continua: false, atraso: 0, info: 'nada pendente' };

  const [nome, anoTxt] = est.pendentes[0].split(':');
  const camara = nome === 'camara';
  const ano = Number(anoTxt);
  const idEnt = camara ? ENTIDADE : ENTIDADE_PREFEITURA;
  est.passoEm = new Date().toISOString();

  const falhar = async (msg: string) => {
    est.erros = (est.erros ?? 0) + 1;
    est.ultimoErro = `${est.pendentes[0]}: ${msg}`;
    if (est.erros >= MAX_ERROS) {
      est.pendentes.shift();
      est.erros = 0;
      if (!est.pendentes.length) est.fimEm = new Date().toISOString();
    }
    await gravarChave(sb, 'estado', est);
    return { continua: est.pendentes.length > 0, atraso: 300, info: msg };
  };

  // Folha do primeiro escalao: portal lento, poucas consultas por passo; continua ate completar
  if (nome === 'folha') {
    const chave = chaveResumo('folha', ano);
    const prev = (await lerChave<ResumoFolha>(sb, chave))?.valor;
    const emCurso = prev && prev.faltam > 0 && Date.now() - Date.parse(prev.atualizadoEm) < 3 * 3600_000 ? prev : null;
    const antes = emCurso ? Object.keys(emCurso.itens).length : 0;
    const f = await buscarFolha(ano, dataLocal().m, emCurso);
    if (!f) return falhar('folha de pagamento: portal sem resposta');
    await gravarChave(sb, chave, f);
    if (f.faltam > 0) {
      if (Object.keys(f.itens).length <= antes) return falhar('folha de pagamento: consultas sem resposta');
      est.erros = 0;
      await gravarChave(sb, 'estado', est);
      return { continua: true, atraso: 2, info: 'folha ' + ano + ': faltam ' + f.faltam };
    }
    est.pendentes.shift();
    est.erros = 0;
    est.ultimoErro = undefined;
    if (!est.pendentes.length) est.fimEm = new Date().toISOString();
    await gravarChave(sb, 'estado', est);
    return { continua: est.pendentes.length > 0, atraso: 1, info: 'folha ' + ano + ': pronta' };
  }
  // Receitas: vem do Tesouro Nacional (SICONFI), sem detalhes por empenho: um passo so
  if (nome === 'receitas') {
    const rec = await buscarReceitas(ano);
    if (!rec) return falhar('Tesouro Nacional fora do ar');
    await gravarChave(sb, chaveResumo('receitas', ano), rec);
    est.pendentes.shift();
    est.erros = 0;
    est.ultimoErro = undefined;
    if (!est.pendentes.length) est.fimEm = new Date().toISOString();
    await gravarChave(sb, 'estado', est);
    return { continua: est.pendentes.length > 0, atraso: 1, info: `receitas ${ano}: pronto` };
  }

  // Fontes de fora: IBGE, Governo de MS e Governo Federal (um passo cada)
  if (nome === 'ibge' || nome === 'estado' || nome === 'federal') {
    if (nome === 'federal' && !chaveFederalApi) {
      est.pendentes.shift();
      if (!est.pendentes.length) est.fimEm = new Date().toISOString();
      await gravarChave(sb, 'estado', est);
      return { continua: est.pendentes.length > 0, atraso: 1, info: 'federal: sem chave da API (CGU_API_KEY), pulado' };
    }
    const dado = nome === 'ibge' ? await buscarIbge() : nome === 'estado' ? await buscarEstado(ano) : await buscarFederal(ano, chaveFederalApi);
    if (!dado) return falhar(`${nome}: fonte fora do ar`);
    await gravarChave(sb, nome === 'ibge' ? chaveIbge : nome === 'estado' ? chaveEstado(ano) : chaveFederal(ano), dado);
    est.pendentes.shift();
    est.erros = 0;
    est.ultimoErro = undefined;
    if (!est.pendentes.length) est.fimEm = new Date().toISOString();
    await gravarChave(sb, 'estado', est);
    return { continua: est.pendentes.length > 0, atraso: 1, info: `${nome} ${ano}: pronto` };
  }

  const bruto = await buscarBruto(idEnt, ano);
  if (!bruto) return falhar('portal fora do ar');

  const chaveDet = `det:${idEnt}:${ano}`;
  const det = (await lerChave<Record<string, Guardado>>(sb, chaveDet))?.valor ?? {};

  type Item = { chave: string; x: RawEmpenho };
  const pendentes: Item[] = [];
  if (camara) {
    for (const x of alvosCamara(bruto)) {
      const chave = `${x.ano}/${x.numero_empenho}`;
      if (!(chave in det)) pendentes.push({ chave, x });
    }
  } else {
    const vistos = new Set<string>();
    for (const x of bruto) {
      const chave = chaveEmpenho(x);
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      if (!(chave in det)) pendentes.push({ chave, x });
    }
  }

  let feitos = 0;
  const lote = pendentes.slice(0, LOTE);
  if (lote.length) {
    await emLotes(lote, SIMULTANEAS, async ({ chave, x }) => {
      let r: Detalhe | null | 'nada';
      if (camara) {
        r = await buscarDetalheApi(idEnt, x.ano, x.numero_empenho, COD_CAMARA);
      } else {
        const conhecido = orgaoDe(x.nome_unidade_gestora ?? '');
        if (conhecido) r = await buscarDetalheApi(idEnt, x.ano, x.numero_empenho, conhecido);
        else {
          r = 'nada';
          for (const o of ORGAOS_TENTAR) {
            const t = await buscarDetalheApi(idEnt, x.ano, x.numero_empenho, o);
            if (t === null) {
              r = null;
              break;
            }
            if (t !== 'nada' && t.cnpj === x.credor_cnpj) {
              r = t;
              break;
            }
          }
        }
      }
      if (r === null) return;
      det[chave] = r === 'nada' ? 'x' : compactar(r, camara);
      feitos += 1;
    });
    if (feitos > 0) await gravarChave(sb, chaveDet, det);
  }

  const faltam = pendentes.length - feitos;
  if (faltam > 0) {
    if (feitos === 0) return falhar('nenhum detalhe lido neste lote');
    est.erros = 0;
    await gravarChave(sb, 'estado', est);
    return { continua: true, atraso: 2, info: `${nome} ${ano}: faltam ${faltam}` };
  }

  // Tudo lido: calcula e guarda o resumo
  if (camara) {
    const limpo: Record<string, Detalhe> = {};
    for (const [k, v] of Object.entries(det)) if (v !== 'x') limpo[k] = v;
    await gravarChave(sb, chaveResumo('camara', ano), montarResumoCamara(ano, bruto, limpo));
  } else {
    const { resumo, lista } = montarResumoPref(ano, bruto, det);
    await gravarChave(sb, chaveResumo('prefeitura', ano), resumo);
    await gravarChave(sb, chaveLista(ano), lista);
  }
  est.pendentes.shift();
  est.erros = 0;
  est.ultimoErro = undefined;
  if (!est.pendentes.length) est.fimEm = new Date().toISOString();
  await gravarChave(sb, 'estado', est);
  return { continua: est.pendentes.length > 0, atraso: 1, info: `${nome} ${ano}: pronto` };
}
