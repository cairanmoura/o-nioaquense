import fs from 'node:fs';

const xml = fs.readFileSync(process.argv[2], 'utf8');

const decode = (value) =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');

const pick = (block, tag) => {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? decode(match[1]).trim() : '';
};

const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);

console.log('total de itens no feed:', items.length);
console.log('titulo do canal:', pick(xml.slice(0, xml.indexOf('<item>')), 'title'));
console.log('');

const limit = Number(process.argv[3] ?? 24);

items.slice(0, limit).forEach((item, index) => {
  console.log(`--- ${index + 1} ---`);
  console.log('titulo:    ' + pick(item, 'title'));
  console.log('categoria: ' + pick(item, 'category'));
  console.log('data:      ' + pick(item, 'pubDate'));
  console.log('link:      ' + pick(item, 'link'));
  const summary = pick(item, 'description').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log('resumo:    ' + summary.slice(0, 300));
  console.log('');
});
