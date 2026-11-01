/**
 * cover.ts
 * -----------------------------------------------------------------------------
 * Regra da CAPA (home e paginas de editoria).
 *
 *  1) Capa manual com validade: materia marcada como Urgente/Destaque fica
 *     na capa ate `featured_until`. Materias antigas (sem validade) valem por
 *     24 h a partir da publicacao. Depois disso a capa volta ao automatico.
 *  2) Modo automatico: ver `coverTier` e `pickLead` (prioridade Nioaque > Regiao politica > Brasil politica/economia > Mundo politica > resto; prazos 24h/12h/1h).
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

/** Normaliza o tema (sem acento, minusculo). */
const themeOf = (a: Article): string =>
  String(a.category_label ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Prioridade da capa (1 = mais forte) e quanto tempo a materia segura a capa:
 *  1 Nioaque (qualquer tema)         -> 24 h
 *  2 Regiao + politica               -> 12 h
 *  3 Brasil + politica/economia      -> 1 h
 *  4 Mundo + politica                -> 1 h
 *  5 todo o resto                    -> 1 h
 */
export function coverTier(a: Article): { tier: number; holdHours: number } {
  const theme = themeOf(a);
  const politica = theme.includes('politic');
  const economia = theme.includes('econom');
  if (a.scope === 'nioaque') return { tier: 1, holdHours: 24 };
  if (a.scope === 'regiao' && politica) return { tier: 2, holdHours: 12 };
  if (a.scope === 'brasil' && (politica || economia)) return { tier: 3, holdHours: 1 };
  if (a.scope === 'mundo' && politica) return { tier: 4, holdHours: 1 };
  return { tier: 5, holdHours: 1 };
}

/**
 * Escolhe a materia de capa.
 *  - Pin manual valido (Urgente/Destaque com prazo) vence.
 *  - Senao: entre as materias que ainda estao dentro do prazo de fixacao, vence
 *    a de maior prioridade; empatando, a mais recente (materia nova do mesmo
 *    nivel ou mais forte assume a capa).
 *  - Se todas ja passaram do prazo, a capa nunca fica vazia: vale a mais
 *    prioritaria/recente por pontuacao.
 */
export function pickLead(list: Article[], now = Date.now()): Article | null {
  if (list.length === 0) return null;

  const pins = list.filter((a) => isPinLive(a, now));
  if (pins.length) {
    return [...pins].sort(
      (x, y) => Number(y.is_breaking) - Number(x.is_breaking) || timeOf(y) - timeOf(x),
    )[0]!;
  }

  const live = list.filter((a) => {
    const age = now - timeOf(a);
    return age >= 0 && age < coverTier(a).holdHours * HOUR;
  });
  if (live.length) {
    return [...live].sort(
      (x, y) => coverTier(x).tier - coverTier(y).tier || timeOf(y) - timeOf(x),
    )[0]!;
  }

  return [...list].sort((x, y) => autoScore(y, now) - autoScore(x, now))[0]!;
}
