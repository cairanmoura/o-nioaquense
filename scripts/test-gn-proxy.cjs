// Testa proxies publicos para buscar o Google News RSS quando o IP e' bloqueado
const FEED = 'https://news.google.com/rss/search?q=Nioaque&hl=pt-BR&gl=BR&ceid=BR:pt-419';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const PROXIES = [
  ['allorigins raw', `https://api.allorigins.win/raw?url=${encodeURIComponent(FEED)}`],
  ['rss2json', `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED)}`],
  ['codetabs proxy', `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(FEED)}`],
];

(async () => {
  for (const [label, url] of PROXIES) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/xml,text/xml,application/json,text/html,*/*' },
      });
      const text = await res.text();
      const rssItems = (text.match(/<item>/g) || []).length;
      const jsonItems = (() => {
        try {
          const j = JSON.parse(text);
          return j.items ? j.items.length : -1;
        } catch { return -2; }
      })();
      console.log(`[${label}] status=${res.status} rss_itens=${rssItems} json_items=${jsonItems} len=${text.length}`);
      // mostra o primeiro link para conferir formato
      const link = text.match(/<link>(https:\/\/news\.google[^<]+)<\/link>/)?.[1];
      if (link) console.log(`  primeiro link GN: ${link.slice(0, 90)}...`);
    } catch (e) {
      console.log(`[${label}] falhou: ${e.message}`);
    }
  }
})();
