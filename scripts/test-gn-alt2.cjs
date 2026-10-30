// 1) rss2json local (confirma que 429 e' por IP de datacenter)
// 2) r.jina.ai como proxy alternativo do Google News
const FEED = 'https://news.google.com/rss/search?q=Nioaque&hl=pt-BR&gl=BR&ceid=BR:pt-419';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

(async () => {
  // 1) rss2json local
  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED)}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    });
    const text = await res.text();
    let items = -1;
    try { items = JSON.parse(text).items?.length ?? -1; } catch {}
    console.log('[rss2json local] status:', res.status, 'items:', items);
  } catch (e) {
    console.log('[rss2json local] falhou:', e.message);
  }

  // 2) r.jina.ai
  try {
    const res = await fetch(`https://r.jina.ai/${FEED}`, {
      headers: { 'User-Agent': UA, Accept: 'text/plain' },
    });
    const text = await res.text();
    const items = (text.match(/<item>/g) || []).length;
    console.log('[jina] status:', res.status, 'rss_itens:', items, 'len:', text.length);
    if (!items) console.log('  body:', text.slice(0, 250));
  } catch (e) {
    console.log('[jina] falhou:', e.message);
  }
})();
