/**
 * geo.ts - classificacao por LOCAL (escopo) das materias.
 *
 * Hierarquia editorial do portal:
 *   LOCAL  (scope)           onde a materia importa: Nioaque > Regiao > MS > Brasil > Mundo
 *   TEMA   (category_label)  sobre o que e': Politica, Policia, Saude... (lib/categories)
 *   TAGS   (local_tags/tags) cidades, orgaos, pessoas e assuntos citados
 *
 * O local e' decidido pelo ASSUNTO da materia, nunca pela origem da fonte: uma
 * votacao no Senado publicada pelo Midiamax e' "Brasil", nao "Mato Grosso do Sul".
 */

import type { ArticleScope } from './types';
import { norm } from './categories';

/** Locais publicos, do mais proximo ao mais distante. */
export const PUBLIC_SCOPES: ArticleScope[] = ['nioaque', 'regiao', 'ms', 'brasil', 'mundo'];

export const SCOPE_NAMES: Record<string, string> = {
  nioaque: 'Nioaque',
  regiao: 'Região',
  ms: 'Mato Grosso do Sul',
  brasil: 'Brasil',
  mundo: 'Mundo',
};

const SCOPE_ALIASES: Record<string, ArticleScope> = {
  nioaque: 'nioaque',
  regiao: 'regiao',
  'regiao de nioaque': 'regiao',
  ms: 'ms',
  'mato grosso do sul': 'ms',
  estado: 'ms',
  estadual: 'ms',
  brasil: 'brasil',
  nacional: 'brasil',
  mundo: 'mundo',
  internacional: 'mundo',
  exterior: 'mundo',
};

export function normalizeScope(raw: unknown): ArticleScope | null {
  const n = norm(typeof raw === 'string' ? raw : '');
  return SCOPE_ALIASES[n] ?? null;
}

const has = (hay: string, words: string[]) => words.reduce((n, w) => (hay.includes(w) ? n + 1 : n), 0);

const BRASIL_WORDS = [
  'senado', 'camara dos deputados', 'congresso nacional', 'stf', 'supremo tribunal federal', 'stj', 'tse', 'planalto',
  'brasilia', 'governo federal', 'presidente lula', 'lula', 'bolsonaro', 'ministerio da', 'ministro da', 'receita federal',
  'banco central', 'copom', 'selic', 'inss', 'petrobras', 'anvisa', 'ibge', 'enem', 'sus', 'pf deflagra', 'policia federal',
  'em todo o pais', 'em todo o brasil', 'brasileiros', 'nacional',
];
const MUNDO_WORDS = [
  'estados unidos', 'eua', 'trump', 'biden', 'russia', 'putin', 'ucrania', 'china', 'israel', 'gaza', 'hamas', 'ira ', 'europa',
  'uniao europeia', 'onu', 'otan', 'franca', 'alemanha', 'italia', 'reino unido', 'japao', 'india', 'venezuela', 'argentina',
  'paraguai', 'bolivia', 'chile', 'mexico', 'papa ', 'vaticano',
];
const MS_WORDS = [
  'mato grosso do sul', 'campo grande', 'dourados', 'tres lagoas', 'corumba', 'ponta pora', 'navirai', 'coxim', 'paranaiba',
  'governo de ms', 'governo do estado', 'tjms', 'mpms', 'assembleia legislativa', 'alems', 'detran-ms', 'sejusp', 'pantanal',
  ' ms ', '(ms)', '/ms', 'sul-mato-grossense', 'sul mato-grossense', 'eduardo riedel', 'riedel',
];

export interface ScopeInput {
  title: string;
  text: string;
  /** Cidades detectadas no texto (Nioaque + regiao). */
  localTags: string[];
  /** Palpite da IA (opcional). */
  aiScope?: unknown;
  /** Quando nada indica o local: normalmente 'ms' para jornais do estado. */
  fallback?: ArticleScope;
}

/**
 * Decide o local da materia. Ordem de confianca:
 *  1. Cita Nioaque -> nioaque.
 *  2. Palpite da IA (validado: "regiao" exige cidade da regiao no texto).
 *  3. Cidade da regiao -> regiao.
 *  4. Palavras-chave de Mundo / Brasil / MS no titulo (peso 3) e no inicio do texto.
 *  5. fallback.
 */
export function classifyScope(i: ScopeInput): ArticleScope {
  const hasNioaque = i.localTags.some((t) => norm(t) === 'nioaque');
  const regionTags = i.localTags.filter((t) => norm(t) !== 'nioaque');
  if (hasNioaque) return 'nioaque';

  const ai = normalizeScope(i.aiScope);
  if (ai === 'nioaque') {
    // a IA diz "Nioaque" sem o texto citar a cidade: rebaixa
    return regionTags.length ? 'regiao' : 'ms';
  }
  if (ai === 'regiao') return regionTags.length ? 'regiao' : 'ms';
  if (ai) {
    // Rede de seguranca: a IA disse "ms", mas o TITULO e' claramente nacional/internacional e nao cita MS
    if (ai === 'ms') {
      const t = ` ${norm(i.title)} `;
      if (has(t, MS_WORDS) === 0) {
        if (has(t, MUNDO_WORDS) > 0 && has(t, BRASIL_WORDS) === 0) return 'mundo';
        if (has(t, BRASIL_WORDS) > 0) return 'brasil';
      }
    }
    return ai;
  }

  if (regionTags.length) return 'regiao';

  const title = ` ${norm(i.title)} `;
  const body = ` ${norm(i.text.slice(0, 1500))} `;
  const score = (words: string[]) => has(title, words) * 3 + has(body, words);
  const sMundo = score(MUNDO_WORDS);
  const sBrasil = score(BRASIL_WORDS);
  const sMs = score(MS_WORDS);
  const best = Math.max(sMundo, sBrasil, sMs);
  if (best < 2) return i.fallback ?? 'ms';
  // empate favorece o mais local (MS), exceto se o titulo e' claramente nacional
  if (sMs >= sBrasil && sMs >= sMundo) return 'ms';
  return sMundo > sBrasil ? 'mundo' : 'brasil';
}
