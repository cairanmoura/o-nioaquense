/**
 * Reclassifica materias marcadas como "Transparência" que NAO tratam de fiscalizacao/gasto publico
 * (ex.: mercado financeiro, loterias, esporte). Usa a mesma guarda do pipeline (src/lib/categories.ts).
 *
 *   node scripts/reclassify-transparencia.mjs          # so mostra o que mudaria
 *   node scripts/reclassify-transparencia.mjs --apply  # grava no banco
 *
 * Precisa de SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]),
);
const { sanitizeCategory } = await import('../src/lib/categories.ts').catch(async () => {
  console.error('Rode com: npx tsx scripts/reclassify-transparencia.mjs');
  process.exit(1);
});

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const apply = process.argv.includes('--apply');

const { data, error } = await sb
  .from('articles')
  .select('id,title,subtitle,summary_bullets,category_label')
  .eq('category_label', 'Transparência');
if (error) throw error;

let n = 0;
for (const a of data ?? []) {
  const text = `${a.subtitle ?? ''} ${(a.summary_bullets ?? []).join(' ')}`;
  const novo = sanitizeCategory('Transparência', a.title, text);
  if (novo === 'Transparência') continue;
  n++;
  console.log(`${apply ? 'ALTERA' : 'alteraria'}: [${novo}] ${a.title.slice(0, 90)}`);
  if (apply) await sb.from('articles').update({ category_label: novo }).eq('id', a.id);
}
console.log(`${n} de ${(data ?? []).length} materia(s) ${apply ? 'reclassificada(s)' : 'seriam reclassificadas'}.`);
