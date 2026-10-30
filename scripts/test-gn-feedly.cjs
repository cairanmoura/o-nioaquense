// Testa o Feedly (API gratuita) como proxy de feeds do Google News
const FEED = 'https://news.google.com/rss/search?q=Nioaque&hl=pt-BR&gl=BR&ceid=BR:pt-419';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

(async () => {
  // 1) Feedly stream contents
  const url = `https://cloud.feedly.com/v3/streams/contents?streamId=${encodeURIComponent('feed/' + FEED)}&count=20`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    const text = await res.text();
    console.log('[feedly] status:', res.status, 'len:', text.length);
    if (res.ok) {
      const j = JSON.parse(text);
      console.log('[feedly] items:', j.items?.length);
      const it = j.items?.[0];
      if (it) {
        console.log('  title:', it.title?.slice(0, 70));
        console.log('  originId:', it.originId?.slice(0, 100));
        console.log('  canonicalUrl:', it.canonicalUrl?.slice(0, 100));
        console.log('  published:', it.published ? new Date(it.published).toISOString() : null);
      }
    } else {
      console.log('  body:', text.slice(0, 200));
    }
  } catch (e) {
    console.log('[feedly] falhou:', e.message);
  }
})();
