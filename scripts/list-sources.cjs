// Script temporario: lista news_sources no Supabase (service role)
const fs = require('fs');
const lines = fs.readFileSync('.env', 'utf8').split(/\r?\n/);
const g = (k) => {
  const l = lines.find((x) => x.startsWith(k + '='));
  return l ? l.slice(k.length + 1).replace(/^"|"$/g, '') : '';
};
const url = g('SUPABASE_URL');
const key = g('SUPABASE_SERVICE_ROLE_KEY');
fetch(url + '/rest/v1/news_sources?select=name,rss_url,source_type,is_active', {
  headers: { apikey: key, Authorization: 'Bearer ' + key },
})
  .then((r) => r.json())
  .then((d) => {
    if (Array.isArray(d)) d.forEach((s) => console.log(`${s.name} | type:${s.source_type} | active:${s.is_active} | ${s.rss_url}`));
    else console.log('ERRO:', JSON.stringify(d));
  })
  .catch((e) => console.log('FETCH ERRO:', e.message));
