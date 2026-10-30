// Testa o feed do Google News com os headers EXATOS do BROWSER_HEADERS do Worker
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const FEED = 'https://news.google.com/rss/search?q=Nioaque&hl=pt-BR&gl=BR&ceid=BR:pt-419';

const VARIANTS = [
  ['UA simples', { 'User-Agent': UA }],
  ['BROWSER_HEADERS completos', {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8,en-US;q=0.7',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
  }],
  ['BROWSER_HEADERS sem Sec-Fetch', {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'Upgrade-Insecure-Requests': '1',
  }],
];

(async () => {
  for (const [label, headers] of VARIANTS) {
    try {
      const res = await fetch(FEED, { headers });
      const text = await res.text();
      const items = (text.match(/<item>/g) || []).length;
      console.log(`[${label}] status=${res.status} itens=${items}`);
    } catch (e) {
      console.log(`[${label}] falhou: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
})();
