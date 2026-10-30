// Testa Bing News RSS como fonte alternativa (links diretos, sem redirect)
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const QUERIES = [
  ['Nioaque', 'https://www.bing.com/news/search?q=Nioaque&format=RSS'],
  ['G1 MS', 'https://www.bing.com/news/search?q=site%3Ag1.globo.com%2Fms%2Fmato-grosso-do-sul&format=RSS'],
];

(async () => {
  for (const [label, url] of QUERIES) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        },
      });
      const xml = await res.text();
      const items = (xml.match(/<item>/g) || []).length;
      console.log(`[${label}] status=${res.status} itens=${items} len=${xml.length}`);
      // mostra o primeiro <item>
      const first = xml.match(/<item>([\s\S]*?)<\/item>/)?.[1];
      if (first) {
        const title = first.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
        const link = first.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();
        const desc = first.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim();
        console.log('  title:', title?.slice(0, 70));
        console.log('  link:', link?.slice(0, 110));
        console.log('  desc:', desc?.slice(0, 90));
      }
    } catch (e) {
      console.log(`[${label}] falhou: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
})();
