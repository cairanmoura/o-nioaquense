/**
 * cover.ts
 * -----------------------------------------------------------------------------
 * Regra da CAPA (home e paginas de editoria).
 *
 *  1) Capa manual com validade: materia marcada como Urgente/Destaque fica
 *     na capa ate `featured_until`. Materias antigas (sem validade) valem por
 *     24 h a partir da publicacao. Depois disso a capa volta ao automatico.
 *  2) Modo automatico: a melhor materia recente, priorizando Nioaque, depois
 *     Regiao, MS e Brasil; foto real conta ponto; quanto mais nova, melhor.
 */

import { isPhotoCover } from './rss';
import type { Article } from './types';

const HOUR = 3_600_000;
const LEGACY_PIN_HOURS = 24;

const SCOPE_WEIGHT: Record<string, number> = {
  nioaque: 60,
  regiao: 36,
  ms: 18,
  brasil: 6,
  coluna: 0,
  radar_oficial: 12,
};

const timeOf = (a: Article): number =>
  new Date(a.published_at ?? a.created_at ?? 0).getTime() || 0;

/** A marcacao manual (Urgente/Destaque) ainda vale? */
export function isPinLive(a: Article, now = Date.now()): boolean {
  if (!a.is_featured && !a.is_breaking) return false;
  if (a.featured_until) return new Date(a.featured_until).getTime() > now;
  return now - timeOf(a) < LEGACY_PIN_HOURS * HOUR;
}

export function autoScore(a: Article, now = Date.now()): number {
  const ageH = Math.max(0, (now - timeOf(a)) / HOUR);
  const recency = Math.max(-40, 40 - ageH * 0.8); // 40 -> ~ -40 em 100 h
  const photo = isPhotoCover(a.cover_image_url) ? 25 : 0;
  return (SCOPE_WEIGHT[a.scope] ?? 0) + photo + recency;
}

/** Escolhe a materia de capa: pin manual valido primeiro; senao o melhor score. */
export function pickLead(list: Article[], now = Date.now()): Article | null {
  if (list.length === 0) return null;

  const pins = list.filter((a) => isPinLive(a, now));
  if (pins.length) {
    // Urgente vence destaque; depois a mais recente
    return [...pins].sort(
      (x, y) => Number(y.is_breaking) - Number(x.is_breaking) || timeOf(y) - timeOf(x),
    )[0]!;
  }
  return [...list].sort((x, y) => autoScore(y, now) - autoScore(x, now))[0]!;
}
