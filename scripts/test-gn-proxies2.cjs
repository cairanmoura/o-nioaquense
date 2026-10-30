// Testa varios proxies publicos para buscar o Google News RSS (cascata de fallback)
const FEED = 'https://news.google.com/rss/search?q=Nioaque&hl=pt-BR&gl=BR&ceid=BR:pt-419';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const PROXIES = [
  ['allorigins raw', `https://api.allorigins.win/raw?url=${encodeURIComponent(FEED)}`],
  ['codetabs', `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(FEED)}`],
  ['corsproxy.io', `https://corsproxy.io/?url=${encodeURIComponent(FEED)}`],
  ['cors.lol', `https://api.cors.lol/?url=${encodeURIComponent(FEED)}`],
  ['thingproxy', `https://thingproxy.freeboard.io/fetch/${FEED}`],
];

(async () => {
  for (const [label, url] of PROXIES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/xml,text/xml,*/*' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      const text = await res.text();
      const items = (text.match(/<item>/g) || []).length;
      const isHtml = /<html/i.test(text.slice(0, 500));
      console.log(`[${label}] status=${res.status} itens=${items} html=${isHtml} len=${text.length}`);
    } catch (e) {
      console.log(`[${label}] falhou: ${e.message}`);
    }
  }
})();
