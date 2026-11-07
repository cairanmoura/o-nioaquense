/**
 * camara-vereadores.ts
 * -----------------------------------------------------------------------------
 * Cadastro canonico dos 9 vereadores de Nioaque, unindo o que cada fonte chama de forma diferente:
 *  - Portal da Camara (Instar): nome civil completo, partido, cargo na Mesa, foto e perfil
 *  - Portal da Transparencia (Quality): nome civil do favorecido (folha e diarias)
 *  - Noticias e proposicoes: nomes parlamentares e apelidos ("Nado", "Seco do Esporte"...)
 * A tabela de apelidos vive em `src/data/autoridades.json` (campos `slug_transparencia` e `apelidos`).
 */
import autoridades from '../data/autoridades.json';

export interface VereadorCanonico {
  /** mesmo slug usado na Transparencia (diarias e folha) */
  slug: string;
  /** id no guia de autoridades */
  id: string;
  /** nome civil completo */
  civil: string;
  /** nome curto exibido no site */
  nome: string;
  cargo: string;
  partido: string;
  foto: string;
  perfil: string;
  apelidos: string[];
}

export const semAcentoMin = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

type Bruto = {
  id: string;
  nome: string;
  cargo: string;
  partido: string;
  foto: string;
  perfil?: string;
  slug_transparencia?: string;
  apelidos?: string[];
};

const brutos: Bruto[] = (autoridades as any).grupos.flatMap((g: any) => g.itens).filter((i: Bruto) => i.id.startsWith('vereador-') && i.slug_transparencia);

export const VEREADORES_CANON: VereadorCanonico[] = brutos.map((b) => {
  // "Reinaldo Garcia Andréa (Nado Andréa)" -> civil sem o parenteses; nome curto = o que esta entre parenteses
  const civil = b.nome.replace(/\s*\(.*\)\s*$/, '').trim();
  const curto = /\((.*)\)/.exec(b.nome)?.[1] ?? civil;
  return {
    slug: b.slug_transparencia!,
    id: b.id,
    civil,
    nome: curto.replace(/^Nado Andréa$/, 'Reinaldo Andréa'),
    cargo: b.cargo.replace(' da Câmara', ''),
    partido: b.partido,
    foto: b.foto,
    perfil: b.perfil ?? '',
    apelidos: [civil, ...(b.apelidos ?? [])],
  };
});

export const vereadorPorSlug = (slug: string) => VEREADORES_CANON.find((v) => v.slug === slug) ?? null;

// Todos os apelidos, do mais longo para o mais curto: "Paulo Roberto Meira Simao" vence "Paulo"
const INDICE = VEREADORES_CANON.flatMap((v) => v.apelidos.map((a) => ({ slug: v.slug, a: semAcentoMin(a) })))
  .filter((x) => x.a.length >= 3)
  .sort((x, y) => y.a.length - x.a.length);

/** Acha o vereador citado em um texto (nome civil, parlamentar ou apelido), ou null. */
export function vereadorDoTexto(texto: string): VereadorCanonico | null {
  const t = ` ${semAcentoMin(texto)} `;
  for (const x of INDICE) if (t.includes(` ${x.a} `)) return vereadorPorSlug(x.slug);
  return null;
}
