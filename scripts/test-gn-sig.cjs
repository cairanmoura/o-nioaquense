// Procura atributos data-n-a-* (signature/timestamp) na pagina do Google News
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

(async () => {
  const feedRes = await fetch('https://news.google.com/rss/search?q=Nioaque&hl=pt-BR&gl=BR&ceid=BR:pt-419', {
    headers: { 'User-Agent': UA },
  });
  const xml = await feedRes.text();
  const link = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)][0][1].match(/<link>(.*?)<\/link>/)?.[1]?.trim();

  const res = await fetch(link, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, redirect: 'follow' });
  const html = await res.text();

  const sg = html.match(/data-n-a-sg="([^"]+)"/);
  const ts = html.match(/data-n-a-ts="([^"]+)"/);
  const aid = html.match(/data-n-a-id="([^"]+)"/);
  console.log('data-n-a-sg:', sg ? sg[1].slice(0, 30) + '...' : 'AUSENTE');
  console.log('data-n-a-ts:', ts ? ts[1] : 'AUSENTE');
  console.log('data-n-a-id:', aid ? aid[1].slice(0, 30) + '...' : 'AUSENTE');

  // token AU do link
  const idMatch = link.match(/\/articles\/([A-Za-z0-9_-]+)/);
  let b = idMatch[1].replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4 !== 0) b += '=';
  const bin = Buffer.from(b, 'base64').toString('latin1');
  const auTok = bin.match(/AU_yqL[A-Za-z0-9_\-]+/);
  console.log('token AU:', auTok ? 'SIM' : 'NAO');

  if (auTok && sg && ts) {
    const payload = JSON.stringify([
      'garturlreq',
      [
        ['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1],
        'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0,
      ],
      auTok[0],
      parseInt(ts[1], 10),
      sg[1],
    ]);
    const freq = JSON.stringify([[['Fbv4je', JSON.stringify(payload), null, 'generic']]]);
    const bres = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: 'f.req=' + encodeURIComponent(freq),
    });
    const btxt = await bres.text();
    const urlMatch = btxt.match(/https?:\/\/(?!news\.google|consent\.google|www\.google|accounts\.google)[^\\"\s]+/);
    console.log('batchexecute:', bres.status, '| URL real:', urlMatch ? decodeURIComponent(urlMatch[0]) : 'NAO ENCONTRADA');
    if (!urlMatch) console.log('resposta:', btxt.slice(0, 300));
  }
})();
