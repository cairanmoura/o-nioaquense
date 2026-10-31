/**
 * importance.ts - filtro editorial de violencia.
 *
 * Diretriz do portal: foco em politica, economia, cultura, cidade, lazer,
 * infraestrutura, obras e transparencia. Crime, morte e violencia de OUTRAS
 * cidades so entram quando tem grande destaque (importancia alta). Sobre
 * Nioaque, qualquer pauta e' permitida.
 *
 * Aplicado em duas fases: por palavras-chave (barato, antes da IA) e pelo
 * julgamento da IA (campos "violencia" e "importancia" do JSON de reescrita).
 */

import { norm } from './categories';

const VIOLENCE = [
  'morre', 'morto', 'morta', 'mortos', 'mortes', 'morte ', 'assassin', 'homicid', 'esfaque', 'facada', 'tiro', 'tiros',
  'baleado', 'balead', 'executad', 'roubo', 'roubad', 'furto', 'furtad', 'assalto', 'assaltant', 'trafic', 'traficante',
  'droga', 'preso', 'presa', 'presos', 'prisao', 'detido', 'estupr', 'abuso sexual', 'latrocin', 'feminicid', 'agrid',
  'agress', 'espanc', 'incendi', 'sequestr', 'faccao', 'atropel', 'afog', 'suicid', 'corpo ', 'cadaver', 'violenc',
  'brigou', 'briga ', 'arma ', 'armado', 'foragid', 'apreensao', 'apreend', 'crime', 'criminos', 'delegacia',
  'colisao', 'capotamento', 'acidente grave', 'tentativa de', 'ameac',
];

const MAJOR = [
  'chacina', 'massacre', 'rebeliao', 'tiroteio', 'atentado', 'terror', 'sequestro de', 'lavagem', 'corrupcao',
  'desvio de', 'fraude', 'improbidade', 'gaeco', 'operacao da pf', 'policia federal deflagra', 'organizacao criminosa',
  'milhoes', 'milhao', 'bilhao', 'bilhoes',
];

const POWER = ['deputad', 'senador', 'prefeit', 'vereador', 'governador', 'secretari', 'juiz', 'desembargador', 'promotor', 'ministro', 'empresario'];

const has = (hay: string, words: string[]) => words.some((w) => hay.includes(w));

export interface ViolenceInfo {
  /** Crime/morte/violencia como assunto central. */
  violent: boolean;
  /** Grande destaque (chacina, muitos mortos, autoridade envolvida, valores altos...). */
  major: boolean;
}

export function violenceInfo(title: string, text = ''): ViolenceInfo {
  const t = ` ${norm(title)} `;
  const b = ` ${norm(text.slice(0, 500))} `;
  const violent = has(t, VIOLENCE) || (has(b, VIOLENCE) && has(b, ['policia', 'pm ', 'delegacia', 'boletim de ocorrencia']));
  if (!violent) return { violent: false, major: false };
  const many = /\b([3-9]|\d{2,}) (mortos|mortes|vitimas|presos|feridos)/.test(t) || /\b(tres|quatro|cinco|seis|sete|oito|nove|dez) (mortos|mortes|vitimas)/.test(t);
  const major = has(t, MAJOR) || many || (has(t, POWER) && has(t + b, ['operacao', 'investig', 'denunci', 'preso', 'afastad']));
  return { violent, major };
}

/** Deve ser descartada pela diretriz (violencia fora de Nioaque sem grande destaque)? */
export function blockedByViolencePolicy(opts: { title: string; text?: string; mentionsNioaque: boolean; aiViolence?: boolean | null; aiImportance?: number | null }): string | null {
  if (opts.mentionsNioaque) return null;
  const k = violenceInfo(opts.title, opts.text ?? '');
  const violent = opts.aiViolence ?? k.violent;
  if (!violent) return null;
  const importance = opts.aiImportance ?? (k.major ? 4 : 2);
  if (importance >= 4 || k.major) return null;
  return `diretriz editorial: violencia fora de Nioaque sem grande destaque (importancia ${importance}/5)`;
}
