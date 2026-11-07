/**
 * Salarios do primeiro escalao (prefeito, vice e secretarios), lidos da pagina
 * "Folha de pagamento" do Portal da Transparencia da Prefeitura (Quality Sistemas).
 *
 * A API de Dados Abertos nao traz folha. A pagina publica do portal usa uma rota interna que
 * responde a quem abriu a pagina (o portal entrega um cookie de visita, sem login), e e' essa
 * mesma consulta que fazemos: uma visita por semana, so para as autoridades. Nao guardamos CPF.
 * O portal costuma ser lento (20 s por consulta): poucas por vez, com tentativas e retomada.
 */
import { ESCALAO } from './prefeitura';
import { semAcento } from './transparencia';

const PORTAL = 'https://web.qualitysistemas.com.br';
const ENTIDADE_LINK = '265';
/** consultas por passo da fila */
const POR_PASSO = 6;

export interface FolhaItem {
  slug: string;
  /** nome como aparece na folha (vazio = sem linha na folha do mes) */
  nome: string;
  cargo: string;
  situacao: string;
  admissao: string;
  base: number;
  /** proventos: liquido mais descontos (fecha com o portal) */
  bruto: number;
  descontos: number;
  liquido: number;
}

export interface ResumoFolha {
  /** mes da folha (AAAA-MM) */
  ref: string;
  itens: Record<string, FolhaItem>;
  /** autoridades ainda nao consultadas nesta rodada */
  faltam: number;
  atualizadoEm: string;
}

interface Servidor {
  nome: string;
  tipoCargo?: string;
  cargo: string;
  situacao: string;
  dataAdmissao: string;
  salarioBase: number;
  descontos: number;
  salarioLiquido: number;
}
type Busca = { grupos: { servidores: Servidor[] }[] }[];

async function abrirSessao(): Promise<string | null> {
  try {
    const r = await fetch(`${PORTAL}/folha-de-pagamento/${ENTIDADE_LINK}`, { signal: AbortSignal.timeout(20_000) });
    return r.headers.get('set-cookie')?.split(';')[0] ?? null;
  } catch {
    return null;
  }
}

/** Busca por nome; tenta duas vezes porque o portal as vezes demora mais que o limite. */
async function buscar(cookie: string, ano: number, mes: number, termo: string): Promise<Servidor[] | null> {
  for (let t = 0; t < 2; t++) {
    try {
      const r = await fetch(`${PORTAL}/api/v1/folha-de-pagamento/${ENTIDADE_LINK}/cargos/busca?ano=${ano}&mes=${mes}&termo=${encodeURIComponent(termo)}`, {
        headers: { cookie, accept: 'application/json' },
        signal: AbortSignal.timeout(45_000),
      });
      if (!r.ok) continue;
      const j = (await r.json()) as Busca;
      return j.flatMap((o) => o.grupos.flatMap((g) => g.servidores));
    } catch {
      /* tenta de novo */
    }
  }
  return null;
}

const PARTICULAS = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
const palavras = (t: string) => semAcento(t).split(/[^a-z0-9]+/).filter(Boolean);
const anterior = (ano: number, mes: number): [number, number] => (mes === 1 ? [ano - 1, 12] : [ano, mes - 1]);
const cent = (v: number) => Math.round(v * 100) / 100;

/**
 * Consulta ate POR_PASSO autoridades que ainda faltam. `parcial` e' o resultado de um passo anterior
 * da mesma rodada (mantem o mes de referencia e os itens ja lidos). Devolve null se o portal nao respondeu.
 */
export async function buscarFolha(ano: number, mesAtual: number, parcial?: ResumoFolha | null): Promise<ResumoFolha | null> {
  const cookie = await abrirSessao();
  if (!cookie) return null;

  let a = ano;
  let m = mesAtual;
  const itens: Record<string, FolhaItem> = { ...(parcial?.itens ?? {}) };

  if (parcial) {
    [a, m] = parcial.ref.split('-').map(Number) as [number, number];
  } else {
    // O mes corrente costuma ainda nao ter folha: tenta ate 3 meses para tras
    const prefeito = ESCALAO.find((x) => x.grupo === 'prefeito');
    let achou = false;
    for (let i = 0; i < 4 && prefeito; i++) {
      const r = await buscar(cookie, a, m, prefeito.ultimo);
      if (r === null) return null;
      if (r.some((s) => palavras(s.nome).includes(prefeito.primeiro))) {
        achou = true;
        break;
      }
      [a, m] = anterior(a, m);
    }
    if (!achou) return null;
  }

  const uma = async (aut: (typeof ESCALAO)[number]) => {
    // todos os nomes (sem particulas) da autoridade precisam estar no nome da folha; busca pelo mais longo
    const tokens = palavras(aut.nome).filter((t) => t.length > 1 && !PARTICULAS.has(t));
    const termo = [...tokens].sort((x, y) => y.length - x.length)[0];
    const lista = await buscar(cookie, a, m, termo);
    if (lista === null) return;
    const candidatos = lista.filter((x) => {
      const p = new Set(palavras(x.nome));
      return tokens.every((t) => p.has(t));
    });
    // a mesma pessoa pode ter varias linhas (ex.: cargo de carreira afastado + cargo eleito/comissionado):
    // vale a de cargo de autoridade, ativa e de maior remuneracao
    const nota = (x: Servidor) => (/secret|prefeit|vice|eleit/i.test([x.tipoCargo ?? '', x.cargo].join(' ')) ? 4 : 0) + (/ativo/i.test(x.situacao) ? 2 : 0);
    const s = candidatos.sort((x, y) => nota(y) - nota(x) || y.salarioLiquido + y.descontos - (x.salarioLiquido + x.descontos))[0];
    // sem linha na folha do mes: registra como consultada (vazia) para nao repetir
    itens[aut.slug] = s
      ? { slug: aut.slug, nome: s.nome, cargo: s.cargo, situacao: s.situacao, admissao: s.dataAdmissao, base: s.salarioBase, bruto: cent(s.salarioLiquido + s.descontos), descontos: s.descontos, liquido: s.salarioLiquido }
      : { slug: aut.slug, nome: '', cargo: '', situacao: '', admissao: '', base: 0, bruto: 0, descontos: 0, liquido: 0 };
  };

  const pendentes = ESCALAO.filter((x) => !itens[x.slug]).slice(0, POR_PASSO);
  // poucas consultas por vez: o portal e lento e nao queremos sobrecarregar
  for (let k = 0; k < pendentes.length; k += 3) await Promise.all(pendentes.slice(k, k + 3).map(uma));

  return {
    ref: `${a}-${String(m).padStart(2, '0')}`,
    itens,
    faltam: ESCALAO.filter((x) => !itens[x.slug]).length,
    atualizadoEm: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Camara Municipal (entidade 164): quadro de servidores                       */
/* -------------------------------------------------------------------------- */

export interface ServidorCamara {
  nome: string;
  cargo: string;
  /** Cargo Eletivo, Cargo Comissionado, Cargo Efetivo, Contrato Temporario */
  tipo: string;
  situacao: string;
  admissao: string;
  base: number;
  bruto: number;
  descontos: number;
  liquido: number;
}

export interface ResumoFolhaCamara {
  /** mes da folha (AAAA-MM) */
  ref: string;
  servidores: ServidorCamara[];
  atualizadoEm: string;
}

/**
 * Quadro de servidores da Camara, lido da pagina "Folha de pagamento" do portal oficial (a mesma consulta
 * que o portal faz para quem abre a pagina). A busca exige 3 letras; "camara" casa com a unidade gestora
 * de todos os servidores. Procura o mes mais recente cuja folha ja foi fechada (soma dos liquidos > 0).
 * Nao guardamos CPF. Devolve null se o portal nao respondeu.
 */
export async function buscarFolhaCamara(ano: number, mesAtual: number): Promise<ResumoFolhaCamara | null> {
  const cookie = await (async () => {
    try {
      const r = await fetch(`${PORTAL}/folha-de-pagamento/164`, { signal: AbortSignal.timeout(20_000) });
      return r.headers.get('set-cookie')?.split(';')[0] ?? null;
    } catch {
      return null;
    }
  })();
  if (!cookie) return null;

  let a = ano;
  let m = mesAtual;
  for (let i = 0; i < 4; i++) {
    let lista: Servidor[] | null = null;
    for (let t = 0; t < 2 && lista === null; t++) {
      try {
        const r = await fetch(`${PORTAL}/api/v1/folha-de-pagamento/164/cargos/busca?ano=${a}&mes=${m}&termo=camara`, {
          headers: { cookie, accept: 'application/json' },
          signal: AbortSignal.timeout(45_000),
        });
        if (r.ok) lista = ((await r.json()) as Busca).flatMap((o) => o.grupos.flatMap((g) => g.servidores));
      } catch {
        /* tenta de novo */
      }
    }
    if (lista === null) return null;
    if (lista.reduce((s, x) => s + x.salarioLiquido, 0) > 0) {
      return {
        ref: `${a}-${String(m).padStart(2, '0')}`,
        servidores: lista.map((x) => ({
          nome: x.nome,
          cargo: x.cargo,
          tipo: x.tipoCargo ?? '',
          situacao: x.situacao,
          admissao: x.dataAdmissao,
          base: x.salarioBase,
          bruto: cent(x.salarioLiquido + x.descontos),
          descontos: x.descontos,
          liquido: x.salarioLiquido,
        })),
        atualizadoEm: new Date().toISOString(),
      };
    }
    [a, m] = anterior(a, m);
  }
  return null;
}
