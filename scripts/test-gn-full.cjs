// Fluxo completo: busca feed do Google News, pega um link e tenta resolver
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

(async () => {
  // 1) Feed
  const feedRes = await fetch('https://news.google.com/rss/search?q=Nioaque&hl=pt-BR&gl=BR&ceid=BR:pt-419', {
    headers: { 'User-Agent': UA },
  });
  const xml = await feedRes.text();
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  console.log('itens no feed:', items.length);

  const block = items[0][1];
  const link = block.match(/<link>(.*?)<\/link>/)?.[1]?.trim();
  console.log('link[0]:', link);

  // 2) Fetch direto do link com redirect follow
  const res = await fetch(link, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' }, redirect: 'follow' });
  console.log('fetch status:', res.status, '| final:', res.url.slice(0, 100));
  const html = await res.text();
  console.log('html len:', html.length);

  const au = html.match(/data-n-au=["'](https?:\/\/[^"']+)["']/i);
  const anchor = html.match(/<a[^>]+href=["'](https?:\/\/(?!news\.google|consent\.google|accounts\.google|www\.google)[^"']+)["']/i);
  console.log('data-n-au:', au ? au[1] : 'AUSENTE');
  console.log('anchor:', anchor ? anchor[1] : 'AUSENTE');

  // procura assinatura/timestamp para batchexecute
  const sig = html.match(/"signature":"([A-Za-z0-9_\-=%]+)"/);
  const ts = html.match(/"timestamp":"?(\d{13})/);
  console.log('signature:', sig ? sig[1].slice(0, 30) : 'AUSENTE', '| timestamp:', ts ? ts[1] : 'AUSENTE');

  // extrai token AU do link
  const idMatch = link.match(/\/articles\/([A-Za-z0-9_-]+)/);
  let b = idMatch[1].replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4 !== 0) b += '=';
  const bin = Buffer.from(b, 'base64').toString('latin1');
  const auTok = bin.match(/AU_yqL[A-Za-z0-9_\-]+/);
  console.log('token AU no ID:', auTok ? auTok[0].slice(0, 25) + '...' : 'AUSENTE');

  // 3) batchexecute com signature+timestamp se encontrou
  if (auTok && sig && ts) {
    const payload = JSON.stringify([
      'garturlreq',
      [
        ['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1],
        'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0,
      ],
      auTok[0],
      parseInt(ts[1], 10),
      sig[1],
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
  } else if (auTok) {
    // 3b) tenta com timestamp atual (metodo alternativo)
    const now = Date.now();
    const payload = JSON.stringify([
      'garturlreq',
      [
        ['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1],
        'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0,
      ],
      auTok[0],
      now,
    ]);
    const freq = JSON.stringify([[['Fbv4je', JSON.stringify(payload), null, 'generic']]]);
    const bres = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: 'f.req=' + encodeURIComponent(freq),
    });
    const btxt = await bres.text();
    const urlMatch = btxt.match(/https?:\/\/(?!news\.google|consent\.google|www\.google|accounts\.google)[^\\"\s]+/);
    console.log('batchexecute (sem sig):', bres.status, '| URL real:', urlMatch ? decodeURIComponent(urlMatch[0]) : 'NAO ENCONTRADA');
    if (!urlMatch) console.log('resposta:', btxt.slice(0, 300));
  }
})();
