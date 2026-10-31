// @ts-nocheck
// Reprocessa o corpo das materias ja captadas com o sanitizador novo.
//   node --experimental-strip-types scripts/repair-articles.mts          (simulacao)
//   node --experimental-strip-types scripts/repair-articles.mts --apply  (grava)
// Materia que continuar reprovada no porteiro volta para rascunho.
import fs from 'node:fs';
import { sanitizeArticleHtml, assessQuality } from '../src/lib/clean-content.ts';

const L = fs.readFileSync('.env', 'utf8').split(/\r?\n/);
const g = (k: string) => L.find((x) => x.startsWith(k + '='))?.slice(k.length + 1).replace(/^"|"$/g, '') ?? '';
const url = g('SUPABASE_URL');
const H = { apikey: g('SUPABASE_SERVICE_ROLE_KEY'), Authorization: 'Bearer ' + g('SUPABASE_SERVICE_ROLE_KEY'), 'Content-Type': 'application/json' };
const apply = process.argv.includes('--apply');

const res0 = await fetch(`${url}/rest/v1/articles?select=*&status=eq.published`, { headers: H }); const rows: any[] = await res0.json(); if (!Array.isArray(rows)) { console.log(rows); process.exit(1); }
let fixed = 0, held = 0, untouched = 0;
for (const a of rows) {
  if (!/class=|<div|<article|data-component|<span/i.test(a.content)) { untouched++; continue; }
  const body = a.content.replace(/^<p>[^<]*<\/p>/, '').replace(/<p>Fonte: [\s\S]*$/, '');
  let clean = sanitizeArticleHtml(body);
  const fonteHref = (a.content.match(/<p>Fonte: <a href="([^"]+)"/) ?? [])[1];
  if (clean.text.length < 400 && fonteHref) {
    // Corpo guardado e' lixo: rebaixa a materia da fonte e reconstroi
    try {
      const page = await (await fetch(fonteHref, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36' } })).text();
      clean = sanitizeArticleHtml(page);
    } catch {}
  }
  const q = assessQuality({ title: a.title, bodyText: clean.text, paragraphs: clean.paragraphs, hasPhoto: true, bullets: (a.summary_bullets?.length ?? 0) >= 2 ? a.summary_bullets : clean.text.split(/(?<=[.!?])\s+/).filter((x: string) => x.length > 30).slice(0, 3) });
  const fonte = (a.content.match(/<p>Fonte: <a [^>]*>[\s\S]*?<\/a>\.<\/p>\s*$/) ?? [''])[0];
  const content = clean.html + fonte;
  const patch: any = q.ok ? { content } : { content, status: 'draft', published_at: null };
  q.ok ? fixed++ : held++;
  console.log((q.ok ? 'OK   ' : 'HOLD ') + a.title.slice(0, 60) + (q.ok ? '' : '  <- ' + q.issues.join('; ')));
  if (apply) await fetch(`${url}/rest/v1/articles?id=eq.${a.id}`, { method: 'PATCH', headers: H, body: JSON.stringify(patch) });
}
console.log({ apply, corrigidas: fixed, para_rascunho: held, intactas: untouched });
