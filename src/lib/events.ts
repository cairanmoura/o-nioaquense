/**
 * events.ts - cards de eventos dentro da materia.
 *
 * DIRETRIZ: matéria de agenda (3+ eventos) não lista tudo em texto corrido.
 * A IA escreve cada evento em um parágrafo no formato
 *   [EVENTO] Atração | Data | Horário | Cidade | Local | Valor/observação
 * e este módulo troca grupos consecutivos desses parágrafos por uma grade de
 * cards (atração, quando, onde, cidade). Campos "-" somem.
 */

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LINE = /<p>\s*\[EVENTO\]\s*([\s\S]*?)<\/p>/gi;

function card(raw: string): string {
  const f = raw.split('|').map((x) => x.replace(/<[^>]+>/g, '').trim());
  const [nome = '', data = '', hora = '', cidade = '', local = '', obs = ''] = f;
  const ok = (v: string) => v && v !== '-' && v !== '—';
  const row = (label: string, v: string) =>
    ok(v) ? `<div class="flex gap-2 text-sm"><dt class="w-14 shrink-0 font-sans text-[11px] font-bold uppercase tracking-wider text-ink-muted">${label}</dt><dd class="min-w-0 font-sans font-medium text-ink">${esc(v)}</dd></div>` : '';
  return `<article class="not-prose flex flex-col gap-2 rounded-[6px] border border-pedra bg-white p-4">
    <div class="flex flex-wrap items-center gap-2">
      ${ok(data) ? `<span class="rounded-[4px] bg-nioaque-green px-2 py-0.5 font-sans text-xs font-bold text-white">${esc(data)}</span>` : ''}
      ${ok(hora) ? `<span class="font-sans text-xs font-bold text-nioaque-red-dark">${esc(hora)}</span>` : ''}
      ${ok(cidade) ? `<span class="ml-auto rounded-full bg-nioaque-green-50 px-2 py-0.5 font-sans text-[11px] font-bold text-nioaque-green-dark">${esc(cidade)}</span>` : ''}
    </div>
    <h3 class="font-sans text-base font-extrabold leading-snug text-ink">${esc(nome)}</h3>
    <dl class="space-y-1">${row('Onde', local)}${row('Info', obs)}</dl>
  </article>`;
}

/** Troca blocos de linhas [EVENTO] por grades de cards; o resto do HTML fica intacto. */
export function renderEventCards(html: string): string {
  if (!html || !/\[EVENTO\]/i.test(html)) return html;
  // Junta linhas [EVENTO] consecutivas (separadas so por espaco) num unico grupo
  const grouped = html.replace(/(?:<p>\s*\[EVENTO\][\s\S]*?<\/p>\s*)+/gi, (block) => {
    const cards = [...block.matchAll(LINE)].map((m) => card(m[1])).join('');
    return `<div class="not-prose my-6 grid gap-3 sm:grid-cols-2" data-eventos>${cards}</div>`;
  });
  return grouped;
}
