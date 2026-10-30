// Testa resolucao de links do Google News (mesma logica do rss.ts)
const id = 'CBMi6gFBVV95cUxPQ2NmY2tCemJVeUMwTlJFQUhiX1YyYUVGd0lsbWZ5UkNTZ08xc1QzLXg1VUJoNVBrbHgtTFhfN0lIVzRucGVIN3BIUHV4ZHd5MzJPbkNQSi1ubXZHNmNrMnJQd3l3QlRUUUpiekNobXdmTk95SVhnQ2lISVh0SkFZRmVwcjF1M0hfWEcwTTVTZlZWYzcyQjc0WUx1RnVHQUdwOVI2MnhBbVJaNFc2Nl9rdnB6eERkN0l6WWZWMF9Cd1F0MGt4cmVhWkI4by04aFh1SEZUWHlMRFE0TDJzdFdEckZFMVN0Qm5jRGd0N19pMDBYcjZYdlhUc216VVlZTFBQa1RKVWowaGNWWm1UcUhSWUZWMVJHZi1KZEt1NzhTQ1BLdzdMQ2JaMmllcGdfRGp5VUczVzhHM1dMdkJCQ0dZamdFSTNpUDNWOW90aFVtRkdPMlFKamVKZkFNd2xkdl81UFh5MzA3SGc';

// Estrategia 1: base64
let b = id.replace(/-/g, '+').replace(/_/g, '/');
while (b.length % 4 !== 0) b += '=';
try {
  const bin = Buffer.from(b, 'base64').toString('latin1');
  console.log('ESTRATEGIA 1 (base64) binario:', JSON.stringify(bin.slice(0, 120)));
  const m = bin.match(/https?:\/\/[^\s"'<>\\]+/);
  console.log('ESTRATEGIA 1 URL:', m ? m[0] : 'NAO ENCONTRADA');
} catch (e) {
  console.log('ESTRATEGIA 1 falhou:', e.message);
}

// Estrategia 2: fetch da pagina de redirect
(async () => {
  const gnUrl = 'https://news.google.com/rss/articles/' + id + '?oc=5';
  try {
    const res = await fetch(gnUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      redirect: 'follow',
    });
    console.log('ESTRATEGIA 2 status:', res.status, '| final URL:', res.url);
    const html = await res.text();
    const au = html.match(/data-n-au=["'](https?:\/\/[^"']+)["']/i);
    console.log('ESTRATEGIA 2 data-n-au:', au ? au[1] : 'AUSENTE');
    const anchor = html.match(/<a[^>]+href=["'](https?:\/\/(?!news\.google|consent\.google|accounts\.google|www\.google)[^"']+)["']/i);
    console.log('ESTRATEGIA 2 anchor:', anchor ? anchor[1] : 'AUSENTE');
    // mostra trecho interessante do HTML para debug
    const idx = html.indexOf('data-n-au');
    if (idx > 0) console.log('CONTEXTO data-n-au:', JSON.stringify(html.slice(idx - 50, idx + 150)));
    const aIdx = html.search(/<a [^>]*href="http/);
    if (aIdx > 0) console.log('CONTEXTO <a>:', JSON.stringify(html.slice(aIdx, aIdx + 200)));
    if (html.length < 3000) console.log('HTML COMPLETO:', html.slice(0, 2500));
  } catch (e) {
    console.log('ESTRATEGIA 2 falhou:', e.message);
  }
})();
