/**
 * comments.ts
 * -----------------------------------------------------------------------------
 * Moderacao automatica dos comentarios: baixo calao, spam e links.
 * Resultado: `ok` (publica), `pending` (fica para o admin) ou `reject` (recusa).
 */

/** Palavras de baixo calao (comparadas sem acento, sem repeticao e sem simbolos). */
const PROFANITY = [
  'porra', 'caralho', 'merda', 'bosta', 'puta', 'puto', 'viado', 'veado', 'buceta', 'bucetinha', 'xoxota', 'piroca',
  'pau no cu', 'cuzao', 'cu', 'arrombado', 'arrombada', 'fdp', 'filho da puta', 'filha da puta', 'vagabundo', 'vagabunda',
  'safado', 'safada', 'desgraca', 'desgracado', 'otario', 'otaria', 'babaca', 'imbecil', 'idiota', 'retardado', 'cretino',
  'corno', 'corna', 'cacete', 'foder', 'fodase', 'fode', 'punheta', 'prostituta', 'vadia', 'piranha',
  'macaco', 'crioulo', 'nazista', 'vtnc', 'tnc', 'pqp', 'krl', 'carai', 'cuzinho', 'tarado', 'estuprador',
];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };

/** minusculas, sem acento, leetspeak desfeito, letras repetidas reduzidas a 1. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[0134578@$!]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z\s]/g, '')
    .replace(/(.)\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const RAIZES = PROFANITY.map(normalizar);

export function temBaixoCalao(texto: string): boolean {
  const limpo = normalizar(texto);
  // "p u t a" / "m.e.r.d.a": letras separadas viram uma palavra so
  const colado = limpo.replace(/\b(\w) (?=\w\b)/g, '$1').replace(/\b(\w) (?=\w )/g, '$1');
  return RAIZES.some((raiz) => {
    if (raiz.includes(' ')) return limpo.includes(raiz);
    const re = new RegExp(`(^|\\s)${raiz}${raiz.length <= 3 ? '' : '\\w{0,3}'}(\\s|$)`);
    return re.test(limpo) || re.test(colado);
  });
}

export type Veredito =
  | { acao: 'ok' }
  | { acao: 'pending'; motivo: string }
  | { acao: 'reject'; motivo: string; mensagem: string };

const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|br|info|xyz|ru|top|bet|site|online|link)\b)/i;
const CONTATO = /(\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4})|(@[a-z0-9_.]{3,})|whats(app)?|telegram|t\.me/i;
const SPAM = /(ganhe dinheiro|renda extra|clique aqui|cassino|aposta|bet365|tigrinho|siga[- ]me|sigam|curso gratuito|emagre[cç]a|viagra|bitcoin|cripto|investimento garantido|trabalhe em casa)/i;

export function moderar(nome: string, texto: string): Veredito {
  const corpo = texto.trim();

  if (corpo.length < 3) return { acao: 'reject', motivo: 'curto', mensagem: 'Escreva um comentário um pouco maior.' };
  if (corpo.length > 1000) return { acao: 'reject', motivo: 'longo', mensagem: 'O comentário pode ter até 1.000 caracteres.' };

  if (temBaixoCalao(corpo) || temBaixoCalao(nome)) {
    return { acao: 'reject', motivo: 'baixo calão', mensagem: 'Seu comentário tem palavras ofensivas. Reescreva com respeito e envie de novo.' };
  }
  if (SPAM.test(corpo) || LINK.test(corpo) || CONTATO.test(corpo)) {
    return { acao: 'reject', motivo: 'spam/link', mensagem: 'Não aceitamos links, contatos ou propaganda nos comentários.' };
  }
  if (/(.)\1{7,}/.test(corpo) || /(\b\w+\b)(\s+\1){3,}/i.test(corpo)) {
    return { acao: 'reject', motivo: 'repetição', mensagem: 'Seu comentário parece repetitivo. Reescreva com suas palavras.' };
  }

  const letras = corpo.replace(/[^A-Za-zÀ-ú]/g, '');
  if (letras.length > 20 && letras.replace(/[^A-ZÀ-Ý]/g, '').length / letras.length > 0.7) {
    return { acao: 'pending', motivo: 'tudo em maiúsculas' };
  }
  return { acao: 'ok' };
}

/** Hash do IP (nao guardamos o IP em si). */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}
