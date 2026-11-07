/**
 * Historico mensal da folha (so autoridades): competencia -> autoridade -> valores.
 * Fonte: folha de pagamento do Portal da Transparencia (Quality). Nada e' estimado:
 * competencia sem folha fechada simplesmente nao entra.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { lerChave, gravarChave } from './transparencia-store';
import { semAcento, VEREADORES } from './transparencia';
import type { FolhaItem, ServidorCamara } from './folha';

export interface FolhaMes {
  base: number;
  bruto: number;
  descontos: number;
  liquido: number;
}
/** competencia (AAAA-MM) -> slug da autoridade -> valores */
export type FolhaHist = Record<string, Record<string, FolhaMes>>;

export const chaveFolhaHist = (ano: number) => `folha:hist:${ano}`;

export async function lerHist(sb: SupabaseClient, ano: number): Promise<FolhaHist> {
  return (await lerChave<FolhaHist>(sb, chaveFolhaHist(ano)))?.valor ?? {};
}

export async function mesclarHist(sb: SupabaseClient, ano: number, competencia: string, itens: Record<string, FolhaMes>): Promise<void> {
  if (!Object.keys(itens).length) return;
  const h = await lerHist(sb, ano);
  h[competencia] = { ...(h[competencia] ?? {}), ...itens };
  await gravarChave(sb, chaveFolhaHist(ano), h);
}

/** Prefeito, vice e secretarios (itens da folha ja lidos, com linha no mes). */
export function histEscalao(itens: Record<string, FolhaItem>): Record<string, FolhaMes> {
  const out: Record<string, FolhaMes> = {};
  for (const [slug, f] of Object.entries(itens)) if (f.nome) out[slug] = { base: f.base, bruto: f.bruto, descontos: f.descontos, liquido: f.liquido };
  return out;
}

/** Vereadores (cargo eletivo) da folha da Camara; devolve vazio se a folha do mes ainda nao fechou. */
export function histVereadores(servidores: ServidorCamara[]): Record<string, FolhaMes> {
  const out: Record<string, FolhaMes> = {};
  if (servidores.reduce((s, x) => s + x.liquido, 0) <= 0) return out;
  for (const v of VEREADORES) {
    const s = servidores.find((x) => /eletivo/i.test(x.tipo) && v.match.test(semAcento(x.nome).toUpperCase()));
    if (s) out[v.slug] = { base: s.base, bruto: s.bruto, descontos: s.descontos, liquido: s.liquido };
  }
  return out;
}
