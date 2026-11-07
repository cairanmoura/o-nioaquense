/**
 * locations-nioaque.ts
 * -----------------------------------------------------------------------------
 * Classificador por palavras-chave: de quais bairros, aldeias, assentamentos e temas
 * cada proposicao fala. Le o titulo e a ementa publicados (e, quando existe, o texto da
 * noticia oficial da Camara sobre a proposicao). So conta o que esta escrito: sem texto,
 * a proposicao nao entra em nenhum local.
 *
 * A pagina so mostra os locais que aparecem em pelo menos uma proposicao real.
 */
import { semAcentoMin, VEREADORES_CANON } from './camara-vereadores';

export type GrupoLocal = 'bairro' | 'aldeia' | 'rural' | 'tema';

export interface Local {
  id: string;
  nome: string;
  grupo: GrupoLocal;
  /** aplicado ao texto sem acento e em minusculas */
  re: RegExp;
}

export const GRUPOS_LOCAL: Record<GrupoLocal, string> = {
  bairro: 'Bairros e Centro',
  aldeia: 'Aldeias e comunidades indígenas',
  rural: 'Assentamentos e zona rural',
  tema: 'Temas',
};

export const LOCAIS: Local[] = [
  // Bairros e Centro
  { id: 'centro', nome: 'Centro', grupo: 'bairro', re: /\b(bairro centro|centro da cidade|centro de nioaque|regiao central)\b/ },
  { id: 'sao-miguel', nome: 'São Miguel', grupo: 'bairro', re: /\bsao miguel\b/ },
  { id: 'monte-alto', nome: 'Monte Alto', grupo: 'bairro', re: /\bmonte alto\b/ },
  { id: 'jardim-aeroporto', nome: 'Jardim Aeroporto', grupo: 'bairro', re: /\bjardim aeroporto\b/ },
  { id: 'jardim-ouro-verde', nome: 'Jardim Ouro Verde', grupo: 'bairro', re: /\bjardim ouro verde\b/ },
  { id: 'bahia', nome: 'Bahia', grupo: 'bairro', re: /\b(bairro|vila|jardim) bahia\b/ },
  { id: 'cohab', nome: 'Cohab', grupo: 'bairro', re: /\bcohab\b/ },
  { id: 'vila-militar', nome: 'Vila Militar', grupo: 'bairro', re: /\bvila militar\b/ },
  // Aldeias
  { id: 'aldeia-brejao', nome: 'Aldeia Brejão', grupo: 'aldeia', re: /\bbrejao\b/ },
  { id: 'aldeia-agua-branca', nome: 'Aldeia Água Branca', grupo: 'aldeia', re: /\bagua branca\b/ },
  { id: 'aldeia-taboquinha', nome: 'Aldeia Taboquinha', grupo: 'aldeia', re: /\btaboquinha\b/ },
  { id: 'aldeia-cabeceira', nome: 'Aldeia Cabeceira', grupo: 'aldeia', re: /\bcabeceira\b/ },
  { id: 'terra-indigena', nome: 'Terra Indígena Nioaque', grupo: 'aldeia', re: /\b(terra indigena|aldeias?|comunidades? indigenas?|povos? indigenas?)\b/ },
  // Assentamentos e zona rural
  { id: 'uirapuru', nome: 'Assentamento Uirapuru', grupo: 'rural', re: /\b(assentamento uirapuru|escola estadual uirapuru|esf uirapuru)\b/ },
  { id: 'santa-amelia', nome: 'Santa Amélia', grupo: 'rural', re: /\bsanta amelia\b/ },
  { id: 'padroeira-do-brasil', nome: 'Padroeira do Brasil', grupo: 'rural', re: /\bpadroeira do brasil\b/ },
  { id: 'conceicao', nome: 'Colônia Conceição', grupo: 'rural', re: /\b(colonia conceicao|conceicao)\b/ },
  { id: 'andalucia', nome: 'Assentamento Andalúcia', grupo: 'rural', re: /\bandalucia\b/ },
  { id: 'palmeira', nome: 'Assentamento Palmeira', grupo: 'rural', re: /\bpalmeiras?\b/ },
  { id: 'zona-rural', nome: 'Zona rural e assentamentos (em geral)', grupo: 'rural', re: /\b(zona rural|assentamentos?|estradas? vicina(l|is)|comunidades? rurais?|produtores? rurais?)\b/ },
  // Temas
  { id: 'energia', nome: 'Energia e iluminação', grupo: 'tema', re: /\b(energia|energisa|poste|postes|iluminacao|rede eletrica|cabos|lampadas?)\b/ },
  { id: 'saude', nome: 'Saúde', grupo: 'tema', re: /\b(saude|hospital|ambulancias?|agentes? de saude|ubs|esf|medicos?|medicamentos?)\b/ },
  { id: 'estradas', nome: 'Estradas e pontes', grupo: 'tema', re: /\b(estradas?|pontes?|vicinais?|patrolamento|asfalto|tapa buracos?|recapeamento|pavimentacao|bueiros?|vala)\b/ },
  { id: 'educacao', nome: 'Educação', grupo: 'tema', re: /\b(escolas?|educacao|creches?|professor(es)?|alfabetizacao|merenda|profuncionario)\b/ },
  { id: 'agua', nome: 'Água e saneamento', grupo: 'tema', re: /\b(caminhao pipa|abastecimento de agua|esgoto|saneamento)\b/ },
];

// Os apelidos dos vereadores citam lugares ("Jorge do Uirapuru", "Neguinho da Santa Amélia"): saem antes de classificar
const NOMES_DE_VEREADORES = VEREADORES_CANON.flatMap((v) => v.apelidos.map(semAcentoMin)).sort((a, b) => b.length - a.length);

/** Ids dos locais citados no texto. */
export function classificarLocais(texto: string): string[] {
  let t = ` ${semAcentoMin(texto)} `;
  for (const n of NOMES_DE_VEREADORES) if (n.length >= 6) t = t.split(` ${n} `).join(' ');
  return LOCAIS.filter((l) => l.re.test(t)).map((l) => l.id);
}

export const localPorId = (id: string) => LOCAIS.find((l) => l.id === id) ?? null;
