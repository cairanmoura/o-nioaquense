// Script temporario: verifica articles duplicados por slug e lista os ultimos
const fs = require('fs');
const lines = fs.readFileSync('.env', 'utf8').split(/\r?\n/);
const g = (k) => {
  const l = lines.find((x) => x.startsWith(k + '='));
  return l ? l.slice(k.length + 1).replace(/^"|"$/g, '') : '';
};
const url = g('SUPABASE_URL');
const key = g('SUPABASE_SERVICE_ROLE_KEY');
const H = { apikey: key, Authorization: 'Bearer ' + key };

async function main() {
  const res = await fetch(url + '/rest/v1/articles?select=id,title,slug,created_at&order=created_at.desc&limit=25', { headers: H });
  const rows = await res.json();
  if (!Array.isArray(rows)) { console.log('ERRO:', JSON.stringify(rows)); return; }
  const counts = {};
  rows.forEach((r) => { counts[r.slug] = (counts[r.slug] ?? 0) + 1; });
  rows.forEach((r) => {
    const dup = counts[r.slug] > 1 ? ' [DUP x' + counts[r.slug] + ']' : '';
    console.log(`${r.created_at} | ${r.source_name ?? '-'} | ${r.title.slice(0, 70)}${dup}`);
  });
}
main();
