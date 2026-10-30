// Metodo googlenewsdecoder v2: usa os atributos data-n-a-id/sg/ts CRUS
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

(async () => {
  const feedRes = await fetch('https://news.google.com/rss/search?q=Nioaque&hl=pt-BR&gl=BR&ceid=BR:pt-419', {
    headers: { 'User-Agent': UA },
  });
  const xml = await feedRes.text();
  const link = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)][0][1].match(/<link>(.*?)<\/link>/)?.[1]?.trim();

  const res = await fetch(link, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, redirect: 'follow' });
  const html = await res.text();

  const sg = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const ts = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
  const aid = html.match(/data-n-a-id="([^"]+)"/)?.[1];
  console.log('aid (crudo):', aid?.slice(0, 50), '...');
  console.log('sg (crudo):', sg?.slice(0, 40), '...');
  console.log('ts:', ts);

  // Payload com os valores crus (como no googlenewsdecoder)
  const payload = JSON.stringify([
    'garturlreq',
    [
      ['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1],
      'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0,
    ],
    aid,
    parseInt(ts, 10),
    sg,
  ]);
  const freq = JSON.stringify([[['Fbv4je', payload, null, 'generic']]]);
  const bres = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: 'f.req=' + encodeURIComponent(freq),
  });
  const btxt = await bres.text();
  const urlMatch = btxt.match(/https?:\/\/(?!news\.google|consent\.google|www\.google|accounts\.google)[^\\"\s]+/);
  console.log('batchexecute:', bres.status, '| URL real:', urlMatch ? decodeURIComponent(urlMatch[0]) : 'NAO ENCONTRADA');
  if (!urlMatch) console.log('resposta:', btxt.slice(0, 400));
})();
