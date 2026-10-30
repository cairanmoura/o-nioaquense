// Procura a URL real da materia no HTML da pagina de redirect do Google News
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

(async () => {
  const feedRes = await fetch('https://news.google.com/rss/search?q=Nioaque&hl=pt-BR&gl=BR&ceid=BR:pt-419', {
    headers: { 'User-Agent': UA },
  });
  const xml = await feedRes.text();
  const link = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)][0][1].match(/<link>(.*?)<\/link>/)?.[1]?.trim();

  const res = await fetch(link, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, redirect: 'follow' });
  const html = await res.text();

  // 1) procura qualquer URL http(s) que NAO seja do google em atributos/strings
  const allUrls = [...html.matchAll(/https?:\/\/[^\s"'<>\\]+/g)].map((m) => m[0]);
  const nonGoogle = [...new Set(allUrls.filter((u) => !/google|gstatic|schema\.org|w3\.org|googleapis/.test(u)))];
  console.log('URLs nao-google no HTML:', nonGoogle.length);
  nonGoogle.slice(0, 15).forEach((u) => console.log('  ', u.slice(0, 150)));

  // 2) procura padroes especificos do redirect
  const patterns = [
    /"url":"(https?:\/\/[^"]+)"/,
    /jslog="[^"]*u1;([^;"]+)/,
    /data-url="([^"]+)"/,
    /<meta http-equiv="refresh" content="[^"]*url=([^"]+)"/,
    /window\.location\s*=\s*["']([^"']+)["']/,
    /"targetUrl":"([^"]+)"/,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    console.log(`padrao ${p.source.slice(0, 30)}:`, m ? m[1].slice(0, 120) : 'AUSENTE');
  }

  // 3) procura por "AU_yqL" no HTML (a pagina pode embutir o dado)
  const auIdx = html.indexOf('AU_yqLOCcfckBzbUyC0NREAHb');
  console.log('token AU no HTML:', auIdx > 0 ? 'SIM' : 'NAO');

  // 4) procura por padrions de /_gh/ ou consent
  const consent = html.includes('consent.google.com');
  console.log('contem consent.google:', consent);

  // 5) procura por "c-wiz" com data
  const cWizIdx = html.search(/data-n-au|data-cthref|data-href/);
  console.log('idx data-n-au/cthref/href:', cWizIdx);
  if (cWizIdx > 0) console.log('contexto:', JSON.stringify(html.slice(cWizIdx - 100, cWizIdx + 300)));
})();
