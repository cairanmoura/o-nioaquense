// Testa alternativas de resolucao de link do Google News (formato novo AU_yqL)
const ID = 'CBMi6gFBVV95cUxPQ2NmY2tCemJVeUMwTlJFQUhiX1YyYUVGd0lsbWZ5UkNTZ08xc1QzLXg1VUJoNVBrbHgtTFhfN0lIVzRucGVIN3BIUHV4ZHd5MzJPbkNQSi1ubXZHNmNrMnJQd3l3QlRUUUpiekNobXdmTk95SVhnQ2lISVh0SkFZRmVwcjF1M0hfWEcwTTVTZlZWYzcyQjc0WUx1RnVHQUdwOVI2MnhBbVJaNFc2Nl9rdnB6eERkN0l6WWZWMF9Cd1F0MGt4cmVhWkI4by04aFh1SEZUWHlMRFE0TDJzdFdEckZFMVN0Qm5jRGd0N19pMDBYcjZYdlhUc216VVlZTFBQa1RKVWowaGNWWm1UcUhSWUZWMVJHZi1KZEt1NzhTQ1BLdzdMQ2JaMmllcGdfRGp5VUczVzhHM1dMdkJCQ0dZamdFSTNpUDNWOW90aFVtRkdPMlFKamVKZkFNd2xkdl81UFh5MzA3SGc';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

(async () => {
  // --- Teste A: metodo batchexecute (conhecido por funcionar com AU_yqL) ---
  // Passo 1: extrai o AU_yqL do base64
  let b = ID.replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4 !== 0) b += '=';
  const bin = Buffer.from(b, 'base64').toString('latin1');
  const auMatch = bin.match(/AU_yqL[A-Za-z0-9_\-]+/);
  console.log('A) token AU:', auMatch ? auMatch[0].slice(0, 40) + '...' : 'AUSENTE');
  if (!auMatch) return;

  // Passo 2: batchexecute
  const inner = JSON.stringify(['garturlreq', [['X', 'X', ['X', 'X'], null, null, 1, 1, 'US:en', null, 1, null, null, null, null, null, 0, 1], 'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0], auMatch[0], 1, null, null, null, null, null, 0]);
  const freq = JSON.stringify([[['Fbv4je', inner, null, 'generic']]]);
  const body = 'f.req=' + encodeURIComponent(freq);

  try {
    const res = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body,
    });
    const txt = await res.text();
    console.log('A) batchexecute status:', res.status);
    // A resposta contem a URL real em JSON escapado
    const urlMatch = txt.match(/https?:\/\/(?!news\.google|consent\.google|www\.google|accounts\.google)[^\\"\s]+/);
    console.log('A) URL real:', urlMatch ? urlMatch[0] : 'NAO ENCONTRADA');
    if (!urlMatch) console.log('A) resposta (200 chars):', txt.slice(0, 300));
  } catch (e) {
    console.log('A) falhou:', e.message);
  }
})();
