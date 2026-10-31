/**
 * linkify.ts - hiperlinks pelas palavras do texto da materia.
 *
 * Liga a PRIMEIRA ocorrencia de cada termo conhecido a uma listagem do portal:
 *   - cidades (Nioaque, Jardim, Bonito...)  -> /materias?tag=<cidade> (Nioaque -> local=nioaque)
 *   - Mato Grosso do Sul                    -> /materias?local=ms
 *   - tags da materia (definidas pela IA)   -> /materias?tag=<tag>
 * Nunca mexe em texto que ja esta dentro de <a>, nem nos titulos <h2>.
 */

import { REGION_CITIES } from './rss';

const CLASS = 'text-nioaque-green-dark underline decoration-nioaque-green/40 underline-offset-2 hover:decoration-nioaque-green';
const MAX_LINKS = 6;

const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const attr = (t: string) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function linkifyArticle(html: string, opts: { tags?: string[]; localTags?: string[] } = {}): string {
  if (!html) return html;

  // termo -> destino (a ordem define a prioridade)
  const targets = new Map<string, string>();
  targets.set('Nioaque', '/materias?local=nioaque');
  targets.set('Mato Grosso do Sul', '/materias?local=ms');
  for (const c of [...(opts.localTags ?? []), ...REGION_CITIES]) {
    if (c.length >= 4 && !/^BR-/i.test(c) && !targets.has(c)) targets.set(c, `/materias?tag=${encodeURIComponent(c)}`);
  }
  for (const t of opts.tags ?? []) {
    if (t.length >= 4 && !targets.has(t)) targets.set(t, `/materias?tag=${encodeURIComponent(t)}`);
  }

  const done = new Set<string>();
  let count = 0;
  let inAnchor = 0;
  let inHeading = 0;

  const parts = html.split(/(<[^>]+>)/g);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.startsWith('<')) {
      if (/^<a[\s>]/i.test(part)) inAnchor++;
      else if (/^<\/a>/i.test(part)) inAnchor = Math.max(0, inAnchor - 1);
      else if (/^<h[1-6][\s>]/i.test(part)) inHeading++;
      else if (/^<\/h[1-6]>/i.test(part)) inHeading = Math.max(0, inHeading - 1);
      continue;
    }
    if (inAnchor || inHeading || count >= MAX_LINKS || !part.trim()) continue;
    // Linha de credito da fonte nao recebe links
    if (/^\s*Fonte:/i.test(part)) continue;

    let text = part;
    for (const [term, href] of targets) {
      if (count >= MAX_LINKS) break;
      if (done.has(term.toLowerCase())) continue;
      const re = new RegExp(`(?<![\\p{L}\\p{N}-])(${esc(term)})(?![\\p{L}\\p{N}-])`, 'u');
      const m = re.exec(text);
      if (!m) continue;
      const link = `<a href="${attr(href)}" class="${CLASS}" title="Mais matérias sobre ${attr(term)}">${m[1]}</a>`;
      // Preserva o que ja foi ligado neste trecho: so substitui fora de tags <a ...>…</a>
      if (/<a[\s>]/.test(text)) {
        const segs = text.split(/(<a[\s>][\s\S]*?<\/a>)/g);
        let replaced = false;
        text = segs
          .map((sg) => {
            if (replaced || sg.startsWith('<a')) return sg;
            const mm = re.exec(sg);
            if (!mm) return sg;
            replaced = true;
            return sg.slice(0, mm.index) + link + sg.slice(mm.index + mm[0].length);
          })
          .join('');
        if (!replaced) continue;
      } else {
        text = text.slice(0, m.index) + link + text.slice(m.index + m[0].length);
      }
      done.add(term.toLowerCase());
      count++;
    }
    parts[i] = text;
  }
  return parts.join('');
}
