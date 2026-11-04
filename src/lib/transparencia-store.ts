/**
 * Armazenamento duravel (tabela `transparencia_cache` do Supabase) dos dados da
 * Transparencia: detalhes de empenhos, resumos prontos, estado e agenda das
 * atualizacoes. So o service role acessa (RLS ligado, sem politicas).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export async function lerChave<T>(sb: SupabaseClient, key: string): Promise<{ valor: T; atualizadoEm: string } | null> {
  const { data, error } = await sb.from('transparencia_cache').select('value, updated_at').eq('key', key).maybeSingle();
  if (error || !data) return null;
  return { valor: data.value as T, atualizadoEm: data.updated_at as string };
}

export async function gravarChave(sb: SupabaseClient, key: string, valor: unknown): Promise<void> {
  const { error } = await sb.from('transparencia_cache').upsert({ key, value: valor as never, updated_at: new Date().toISOString() });
  if (error) throw new Error(`transparencia_cache: ${error.message}`);
}

/* -------------------------------------------------------------------------- */
/* Agenda das atualizacoes                                                     */
/* -------------------------------------------------------------------------- */

export interface ConfigAtualizacao {
  /** domingo: sempre atualiza no domingo */
  domingo: boolean;
  /** auto = um dia sorteado (terca a sexta) que muda toda semana; fixo = sempre o mesmo dia */
  modo: 'auto' | 'fixo';
  /** 2 (terca) a 5 (sexta), usado quando modo = fixo */
  diaFixo: number;
  /** liga/desliga as atualizacoes automaticas */
  ativo: boolean;
}

export const CONFIG_PADRAO: ConfigAtualizacao = { domingo: true, modo: 'auto', diaFixo: 3, ativo: true };

export const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Data (ano, mes, dia, dia da semana) em Campo Grande para um instante. */
export function dataLocal(d = new Date()): { y: number; m: number; d: number; dow: number; hora: number; iso: string } {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Campo_Grande',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, x) => ((acc[x.type] = x.value), acc), {});
  const y = Number(p.year);
  const m = Number(p.month);
  const dd = Number(p.day);
  const dow = new Date(Date.UTC(y, m - 1, dd)).getUTCDay();
  return { y, m, d: dd, dow, hora: Number(p.hour), iso: `${p.year}-${p.month}-${p.day}` };
}

/** Numero da semana ISO (segunda a domingo) de uma data. */
function semanaIso(y: number, m: number, d: number): { ano: number; semana: number } {
  const data = new Date(Date.UTC(y, m - 1, d));
  const dia = data.getUTCDay() || 7;
  data.setUTCDate(data.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(data.getUTCFullYear(), 0, 1));
  return { ano: data.getUTCFullYear(), semana: Math.ceil(((data.getTime() - inicio.getTime()) / 86400000 + 1) / 7) };
}

/** Dia da semana (2 a 5) sorteado para a semana da data: muda toda semana, igual para todos. */
export function diaExtraDaSemana(y: number, m: number, d: number): number {
  const { ano, semana } = semanaIso(y, m, d);
  let h = ano * 100 + semana;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return 2 + (Math.abs(h) % 4);
}

/** A atualizacao semanal deve rodar hoje? */
export function devidaHoje(cfg: ConfigAtualizacao, hoje = dataLocal()): { devida: boolean; extra: number } {
  const extra = cfg.modo === 'fixo' ? Math.min(5, Math.max(2, cfg.diaFixo)) : diaExtraDaSemana(hoje.y, hoje.m, hoje.d);
  const devida = cfg.ativo && ((cfg.domingo && hoje.dow === 0) || hoje.dow === extra);
  return { devida, extra };
}

/** Proximas datas de atualizacao (a partir de hoje), para mostrar no painel. */
export function proximasAtualizacoes(cfg: ConfigAtualizacao, quantas = 4): { iso: string; dia: string }[] {
  const out: { iso: string; dia: string }[] = [];
  const base = Date.now();
  for (let i = 0; i < 21 && out.length < quantas; i++) {
    const h = dataLocal(new Date(base + i * 86400000));
    if (devidaHoje(cfg, h).devida) out.push({ iso: h.iso, dia: DIAS_SEMANA[h.dow] });
  }
  return out;
}
