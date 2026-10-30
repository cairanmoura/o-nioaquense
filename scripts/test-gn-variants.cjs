// Testa variantes de URL para resolver article ID do Google News
const ID = 'CBMi6gFBVV95cUxPQ2NmY2tCemJVeUMwTlJFQUhiX1YyYUVGd0lsbWZ5UkNTZ08xc1QzLXg1VUJoNVBrbHgtTFhfN0lIVzRucGVIN3BIUHV4ZHd5MzJPbkNQSi1ubXZHNmNrMnJQd3l3QlRUUUpiekNobXdmTk95SVhnQ2lISVh0SkFZRmVwcjF1M0hfWEcwTTVTZlZWYzcyQjc0WUx1RnVHQUdwOVI2MnhBbVJaNFc2Nl9rdnB6eERkN0l6WWZWMF9Cd1F0MGt4cmVhWkI4by04aFh1SEZUWHlMRFE0TDJzdFdEckZFMVN0Qm5jRGd0N19pMDBYcjZYdlhUc216VVlZTFBQa1RKVWowaGNWWm1UcUhSWUZWMVJHZi1KZEt1NzhTQ1BLdzdMQ2JaMmllcGdfRGp5VUczVzhHM1dMdkJCQ0dZamdFSTNpUDNWOW90aFVtRkdPMlFKamVKZkFNd2xkdl81UFh5MzA3SGc';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const urls = [
  ['articles sem query', `https://news.google.com/articles/${ID}`],
  ['rss/articles sem query', `https://news.google.com/rss/articles/${ID}`],
  ['articles c/ ceid', `https://news.google.com/articles/${ID}?hl=pt-BR&gl=BR&ceid=BR:pt-419`],
];

(async () => {
  for (const [label, url] of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
        redirect: 'follow',
      });
      const html = await res.text();
      const au = html.match(/data-n-au=["'](https?:\/\/[^"']+)["']/i);
      const anchor = html.match(/<a[^>]+href=["'](https?:\/\/(?!news\.google|consent\.google|accounts\.google|www\.google)[^"']+)["']/i);
      // procura tambem por "signature" e "timestamp" para batchexecute
      const sig = html.match(/signature\\?":\\?"([A-Za-z0-9_\-=%]+)/);
      const ts = html.match(/timestamp\\?":\\?"?(\d+)/);
      console.log(`[${label}] status=${res.status} final=${res.url.slice(0, 80)}`);
      console.log(`  data-n-au: ${au ? au[1] : 'AUSENTE'} | anchor: ${anchor ? anchor[1] : 'AUSENTE'}`);
      console.log(`  sig: ${sig ? sig[1].slice(0, 20) : '-'} | ts: ${ts ? ts[1] : '-'}`);
      if (!au && !anchor && res.status === 200) {
        // mostra o que tem de interessante
        const cWiz = html.search(/c-wiz|batchexecute|_DR/);
        console.log(`  html len=${html.length} | trecho:`, JSON.stringify(html.slice(0, 400)));
      }
    } catch (e) {
      console.log(`[${label}] falhou: ${e.message}`);
    }
  }
})();
