// Testa decodificacao do redirect do Bing News (apiclick.aspx?url=...)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const FEED = 'https://www.bing.com/news/search?q=Nioaque&format=RSS';

(async () => {
  const res = await fetch(FEED, {
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml;q=0.9' },
  });
  const xml = await res.text();

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  console.log('itens:', items.length);

  for (const [, block] of items.slice(0, 5)) {
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();
    if (!link) continue;

    // Desescapa XML e extrai a URL real do parametro url=
    const decodedLink = link
      .replace(/&amp;/g, '&')
      .replace(/&#160;/g, ' ')
      .replace(/&quot;/g, '"');
    let realUrl = decodedLink;
    const u = new URL(decodedLink);
    const inner = u.searchParams.get('url');
    if (inner) realUrl = inner;

    console.log('-', (title || '').slice(0, 60));
    console.log('  real:', realUrl.slice(0, 110));
  }
})();
