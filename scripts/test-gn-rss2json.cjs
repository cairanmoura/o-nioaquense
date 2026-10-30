// Inspeciona o formato do rss2json para o Google News
const FEED = 'https://news.google.com/rss/search?q=Nioaque&hl=pt-BR&gl=BR&ceid=BR:pt-419';

(async () => {
  const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
  });
  const j = await res.json();
  console.log('status:', j.status, '| items:', j.items?.length);
  const it = j.items?.[0];
  if (it) {
    console.log('item[0]:');
    console.log('  title:', it.title?.slice(0, 80));
    console.log('  link:', it.link?.slice(0, 120));
    console.log('  pubDate:', it.pubDate);
    console.log('  guid:', it.guid?.slice(0, 80));
    console.log('  thumb:', it.thumbnail?.slice(0, 80));
  }
})();
