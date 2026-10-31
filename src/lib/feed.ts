/**
 * feed.ts
 * -----------------------------------------------------------------------------
 * Parser de feeds RSS 2.0 / Atom com fast-xml-parser (robusto a CDATA,
 * namespaces e atributos; compativel com Cloudflare Workers).
 */

import { XMLParser } from 'fast-xml-parser';

export interface FeedItem {
  title: string;
  link: string;
  description: string | null;
  pubDate: string | null;
  /** Imagem declarada no feed (enclosure / media:content / media:thumbnail). */
  image: string | null;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  cdataPropName: '#cdata',
  processEntities: true,
  trimValues: true,
});

function text(node: any): string {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node).trim();
  if (Array.isArray(node)) return text(node[0]);
  return String(node['#cdata'] ?? node['#text'] ?? '').trim();
}

function linkOf(node: any): string {
  if (!node) return '';
  const n = Array.isArray(node) ? node.find((x) => !x?.['@_rel'] || x['@_rel'] === 'alternate') ?? node[0] : node;
  if (typeof n === 'string') return n.trim();
  return String(n?.['@_href'] ?? text(n)).trim();
}

function imageOf(item: any): string | null {
  const pick = (n: any): string | null => {
    const one = Array.isArray(n) ? n[0] : n;
    const u = one?.['@_url'] ?? one?.['@_href'];
    return u ? String(u) : null;
  };
  const enc = item.enclosure;
  const encOne = Array.isArray(enc) ? enc[0] : enc;
  if (encOne?.['@_url'] && /image/i.test(String(encOne['@_type'] ?? 'image'))) return String(encOne['@_url']);
  const media = pick(item['media:content']) ?? pick(item['media:thumbnail']);
  if (media) return media;
  // WordPress sem <media>: imagem de destaque dentro do HTML do item (data-orig-file = tamanho original)
  const html = String(item['content:encoded']?.['#cdata'] ?? item['content:encoded'] ?? item.description?.['#cdata'] ?? item.description ?? '');
  const m = html.match(/data-orig-file="([^"]+)"/) ?? html.match(/<img[^>]+src="(https?:[^"]+)"/);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

export function parseFeedItems(xml: string, max = 30): FeedItem[] {
  let doc: any;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }
  const raw = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.['rdf:RDF']?.item ?? [];
  const list: any[] = Array.isArray(raw) ? raw : [raw];

  const items: FeedItem[] = [];
  for (const it of list) {
    if (!it) continue;
    const title = text(it.title);
    const link = linkOf(it.link) || text(it.guid);
    if (!title || !/^https?:\/\//i.test(link)) continue;
    // Feeds WordPress trazem o texto inteiro em content:encoded; usa o maior dos campos
    const desc = [text(it.description), text(it.summary), text(it['content:encoded']), text(it['content_full:encoded']), text(it.content)].sort((a, b) => b.length - a.length)[0];
    items.push({
      title,
      link,
      description: desc || null,
      pubDate: text(it.pubDate) || text(it.published) || text(it.updated) || text(it['dc:date']) || null,
      image: imageOf(it),
    });
    if (items.length >= max) break;
  }
  return items;
}
