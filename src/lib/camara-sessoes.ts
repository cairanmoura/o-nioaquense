/**
 * camara-sessoes.ts
 * -----------------------------------------------------------------------------
 * Sessoes da Camara Municipal de Nioaque, reunidas de fontes oficiais:
 *
 *  - Canal oficial no YouTube (@nioaqueimprensa), pela YouTube Data API v3:
 *    transmissao ao vivo e gravacao de cada sessao (titulo, inicio, fim,
 *    duracao, visualizacoes).
 *  - Portal da Camara (Instar): numero da sessao e ata em PDF (a ata e'
 *    manuscrita e digitalizada: so linkamos o PDF, nunca transcrevemos).
 *  - Proposicoes de 2026 (portal da Camara): autor, tipo, situacao e data.
 *
 * Tudo vai para `transparencia_cache` (chaves abaixo). Nada e' inventado: o que
 * a fonte nao informa fica vazio e a pagina diz isso.
 */
import { dataLocal, gravarChave, lerChave } from './transparencia-store';

export const PORTAL_CAMARA = 'https://www.cmnioaque.ms.gov.br';
export const CANAL_YOUTUBE = 'https://www.youtube.com/@nioaqueimprensa';
/** Playlist "uploads" do canal (UU + id do canal sem o prefixo UC). */
const PLAYLIST_UPLOADS = 'UULlcbQ6bphI0cHpSt8UCEZA';

export const CHAVE_YOUTUBE = 'camara:sessoes:youtube';
export const CHAVE_PORTAL = 'camara:sessoes:portal';
export const chaveProposicoes = (ano: number) => `camara:proposicoes:${ano}`;

const UA = 'Mozilla/5.0 (compatible; ONioaquenseBot/1.0; +https://onioaquense.com)';

/* -------------------------------------------------------------------------- */
/* Tipos                                                                       */
/* -------------------------------------------------------------------------- */

export interface VideoSessao {
  id: string;
  titulo: string;
  /** ISO (UTC) do inicio real (ou agendado, se ainda nao comecou) */
  inicio: string | null;
  fim: string | null;
  duracaoSeg: number | null;
  views: number | null;
  estado: 'ao-vivo' | 'agendada' | 'encerrada';
}

export interface EstadoYoutube {
  atualizadoEm: string;
  videos: VideoSessao[];
}

export interface SessaoPortal {
  portalId: number;
  /** yyyy-mm-dd */
  data: string;
  tipo: string;
  titulo: string;
  numero: string | null;
  inicio: string | null;
  fim: string | null;
  ataUrl: string | null;
  ataTamanho: string | null;
}

export interface EstadoPortal {
  atualizadoEm: string;
  sessoes: SessaoPortal[];
}

export interface Proposicao {
  id: number;
  tipo: string;
  titulo: string;
  descricao: string;
  /** yyyy-mm-dd (data de registro na Camara) */
  data: string | null;
  numero: string;
  situacao: string;
  autores: string[];
}

export interface EstadoProposicoes {
  atualizadoEm: string;
  ano: number;
  total: number;
  itens: Proposicao[];
}

export interface SessaoCamara {
  /** yyyy-mm-dd (dia da sessao em Campo Grande) */
  data: string;
  videos: VideoSessao[];
  portal: SessaoPortal | null;
}

/* -------------------------------------------------------------------------- */
/* Utilitarios                                                                 */
/* -------------------------------------------------------------------------- */

const MESES_NOME = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

function decodeHtml(t: string): string {
  return t
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Data (yyyy-mm-dd) escrita no titulo de uma ata ("... em 27 de Outubro de 2026", "07-10-2025"). */
export function dataDoTitulo(titulo: string): string | null {
  const t = semAcento(titulo).toLowerCase();
  const a = /(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/.exec(t);
  if (a) {
    const m = MESES_NOME.indexOf(a[2]) + 1;
    if (m > 0) return `${a[3]}-${String(m).padStart(2, '0')}-${a[1].padStart(2, '0')}`;
  }
  const b = /(\d{2})[-/.](\d{2})[-/.](\d{4})/.exec(t);
  return b ? `${b[3]}-${b[2]}-${b[1]}` : null;
}

function brParaIso(br: string | undefined): string | null {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(br ?? '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function isoDuracao(iso: string | undefined): number | null {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? '');
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

async function pegarHtml(url: string): Promise<string> {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR' }, signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`${url}: http ${r.status}`);
  return r.text();
}

/* -------------------------------------------------------------------------- */
/* YouTube                                                                     */
/* -------------------------------------------------------------------------- */

/** Le as ultimas transmissoes do canal (2 chamadas a API, 2 unidades de cota). */
export async function buscarYoutube(apiKey: string): Promise<VideoSessao[]> {
  const base = 'https://www.googleapis.com/youtube/v3';
  const lista = await fetch(`${base}/playlistItems?part=contentDetails&maxResults=50&playlistId=${PLAYLIST_UPLOADS}&key=${apiKey}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!lista.ok) throw new Error(`YouTube playlistItems: http ${lista.status}`);
  const ids: string[] = ((await lista.json()) as any).items?.map((i: any) => i.contentDetails?.videoId).filter(Boolean) ?? [];
  if (!ids.length) return [];

  const det = await fetch(`${base}/videos?part=snippet,liveStreamingDetails,contentDetails,statistics&id=${ids.join(',')}&key=${apiKey}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!det.ok) throw new Error(`YouTube videos: http ${det.status}`);
  const itens: any[] = ((await det.json()) as any).items ?? [];

  const out: VideoSessao[] = [];
  for (const v of itens) {
    const titulo = String(v.snippet?.title ?? '').trim();
    if (!titulo || /\bteste\b/i.test(titulo)) continue; // transmissoes de teste nao entram
    const live = v.liveStreamingDetails ?? {};
    const estadoApi = String(v.snippet?.liveBroadcastContent ?? 'none');
    out.push({
      id: String(v.id),
      titulo,
      inicio: live.actualStartTime ?? live.scheduledStartTime ?? v.snippet?.publishedAt ?? null,
      fim: live.actualEndTime ?? null,
      duracaoSeg: isoDuracao(v.contentDetails?.duration),
      views: v.statistics?.viewCount != null ? Number(v.statistics.viewCount) : null,
      estado: estadoApi === 'live' ? 'ao-vivo' : estadoApi === 'upcoming' ? 'agendada' : 'encerrada',
    });
  }
  return out.sort((a, b) => String(b.inicio).localeCompare(String(a.inicio)));
}

/* -------------------------------------------------------------------------- */
/* Portal da Camara: sessoes e atas                                            */
/* -------------------------------------------------------------------------- */

/** Lista as sessoes plenarias do portal (uma pagina traz todas). Ata em PDF fica vazia ate o detalhe ser lido. */
export function lerListaSessoes(html: string): SessaoPortal[] {
  const out: SessaoPortal[] = [];
  const partes = html.split('<a href="/portal/sessaoplenaria/0/').slice(1);
  for (const p of partes) {
    const id = /^(\d+)\/?"/.exec(p)?.[1];
    if (!id) continue;
    const bloco = p.slice(0, 2500);
    const tipo = decodeHtml(/sp_tipo_sessao[^>]*>([\s\S]*?)<\/div>/.exec(bloco)?.[1] ?? '');
    const titulo = decodeHtml(/sp_titulo_sessao[^>]*>([\s\S]*?)<\/div>/.exec(bloco)?.[1] ?? '');
    const numero = decodeHtml(/Número:\s*<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/.exec(bloco)?.[1] ?? '') || null;
    const inicioTxt = /Início:\s*<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/.exec(bloco)?.[1] ?? '';
    const fimTxt = /Encerramento:\s*<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/.exec(bloco)?.[1] ?? '';
    // O titulo da ata e' a data mais confiavel (o portal ja trouxe "Inicio" errado em uma ata)
    const data = dataDoTitulo(titulo) ?? brParaIso(inicioTxt);
    if (!data) continue;
    out.push({ portalId: Number(id), data, tipo, titulo, numero, inicio: decodeHtml(inicioTxt) || null, fim: decodeHtml(fimTxt) || null, ataUrl: null, ataTamanho: null });
  }
  return out;
}

/** Le a pagina da sessao e devolve o link do PDF da ata (e o tamanho). */
export function lerAta(html: string): { ataUrl: string | null; ataTamanho: string | null } {
  const href = /href="(\/portal\/download\/sessao-plenaria-ata\/[^"]+)"/.exec(html)?.[1] ?? null;
  const tam = /pdf\s*-\s*([\d.,]+\s*(?:KB|MB|GB))/i.exec(decodeHtml(html))?.[1] ?? null;
  return { ataUrl: href ? PORTAL_CAMARA + href : null, ataTamanho: tam };
}

/**
 * Atualiza a lista de sessoes do portal. Le o detalhe (link da ata) so das sessoes
 * que ainda nao tem link, no maximo `limiteDetalhes` por passo (o plano gratis limita as subchamadas).
 */
export async function buscarPortal(anterior: EstadoPortal | null, limiteDetalhes = 15): Promise<SessaoPortal[]> {
  const lista = lerListaSessoes(await pegarHtml(`${PORTAL_CAMARA}/portal/sessaoplenaria`));
  const antigas = new Map((anterior?.sessoes ?? []).map((s) => [s.portalId, s]));
  for (const s of lista) {
    const velha = antigas.get(s.portalId);
    if (velha?.ataUrl) {
      s.ataUrl = velha.ataUrl;
      s.ataTamanho = velha.ataTamanho;
    }
  }
  const faltam = lista.filter((s) => !s.ataUrl).sort((a, b) => b.data.localeCompare(a.data)).slice(0, limiteDetalhes);
  for (const s of faltam) {
    try {
      const a = lerAta(await pegarHtml(`${PORTAL_CAMARA}/portal/sessaoplenaria/0/${s.portalId}`));
      s.ataUrl = a.ataUrl;
      s.ataTamanho = a.ataTamanho;
    } catch {
      /* tenta de novo no proximo passo */
    }
  }
  return lista.sort((a, b) => b.data.localeCompare(a.data));
}

/* -------------------------------------------------------------------------- */
/* Portal da Camara: proposicoes                                               */
/* -------------------------------------------------------------------------- */

export function lerProposicoes(html: string): { total: number; itens: Proposicao[] } {
  const total = Number(/([\d.]+)\s+proposições encontradas/.exec(decodeHtml(html))?.[1]?.replace(/\./g, '') ?? 0);
  const itens: Proposicao[] = [];
  const partes = html.split('<div class="prop_proposicao" data-id="').slice(1);
  for (const p of partes) {
    const id = Number(/^(\d+)"/.exec(p)?.[1]);
    if (!id) continue;
    const tipo = decodeHtml(/prop_tipo_proposicao[^>]*>([\s\S]*?)<\/div>/.exec(p)?.[1] ?? '');
    const titulo = decodeHtml(/prop_titulo_proposicao[^>]*>([\s\S]*?)<\/div>/.exec(p)?.[1] ?? '');
    const descricao = decodeHtml(/prop_descricao_proposicao[^>]*>([\s\S]*?)<\/div>/.exec(p)?.[1] ?? '');
    const campo = (rotulo: string) => {
      const m = new RegExp(`${rotulo}:\\s*</div>\\s*<div[^>]*>([\\s\\S]*?)</div>`).exec(p);
      return m ? decodeHtml(m[1]) : '';
    };
    const autoresHtml = /prop_info_autor[\s\S]*?prop_descricao_info_proposicao[^>]*>([\s\S]*?)<\/div>/.exec(p)?.[1] ?? '';
    const autores = decodeHtml(autoresHtml.replace(/<span[^>]*>\(Autor\)<\/span>/g, '|'))
      .split('|')
      .map((a) => a.replace(/^[,\s]+|[,\s]+$/g, '').trim())
      .filter(Boolean);
    itens.push({
      id,
      tipo,
      titulo,
      descricao: descricao.slice(0, 600),
      data: brParaIso(campo('Data')),
      numero: campo('Número'),
      situacao: campo('Situação'),
      autores,
    });
  }
  return { total, itens };
}

/** Le todas as paginas (50 por pagina) de um ano. */
export async function buscarProposicoes(ano: number): Promise<EstadoProposicoes> {
  const url = (pg: number) => `${PORTAL_CAMARA}/portal/proposicoes/${pg}/0/0/0/0/0/0/0/0/0/0/0/${ano}`;
  const primeira = lerProposicoes(await pegarHtml(url(1)));
  const itens = [...primeira.itens];
  const paginas = Math.min(Math.ceil(primeira.total / 50), 12);
  for (let pg = 2; pg <= paginas; pg++) itens.push(...lerProposicoes(await pegarHtml(url(pg))).itens);
  return { atualizadoEm: new Date().toISOString(), ano, total: primeira.total, itens };
}

/* -------------------------------------------------------------------------- */
/* Montagem                                                                    */
/* -------------------------------------------------------------------------- */

/** O video e' a gravacao de uma sessao (e nao um recorte avulso)? */
export const ehVideoDeSessao = (v: VideoSessao) => /^sess[ãa]o/i.test(v.titulo.trim());

const diasEntre = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;

/**
 * Junta YouTube e portal por dia (um dia pode ter mais de um video, como as duas partes de 15/09).
 * Quando a data da ata e a do video diferem em 1 dia (acontece nas fontes), os dois sao unidos.
 */
export function montarSessoes(youtube: EstadoYoutube | null, portal: EstadoPortal | null): SessaoCamara[] {
  const mapa = new Map<string, SessaoCamara>();
  const pegar = (data: string) => {
    let s = mapa.get(data);
    if (!s) mapa.set(data, (s = { data, videos: [], portal: null }));
    return s;
  };
  for (const v of youtube?.videos ?? []) {
    if (!ehVideoDeSessao(v)) continue;
    const data = v.inicio ? dataLocal(new Date(v.inicio)).iso : dataDoTitulo(v.titulo);
    if (data) pegar(data).videos.push(v);
  }
  for (const s of portal?.sessoes ?? []) {
    const atual = pegar(s.data);
    // duas atas no mesmo dia: fica a de maior numero de portal (a mais recente)
    if (!atual.portal || s.portalId > atual.portal.portalId) atual.portal = s;
  }
  // ata sem video e video sem ata, com 1 dia de diferenca: e' a mesma sessao
  const soAta = [...mapa.values()].filter((s) => s.portal && !s.videos.length);
  const soVideo = [...mapa.values()].filter((s) => !s.portal && s.videos.length);
  for (const a of soAta) {
    const v = soVideo.find((x) => mapa.has(x.data) && diasEntre(x.data, a.data) <= 1);
    if (v) {
      a.videos = v.videos;
      mapa.delete(v.data);
    }
  }
  for (const s of mapa.values()) s.videos.sort((a, b) => String(a.inicio).localeCompare(String(b.inicio)));
  return [...mapa.values()].sort((a, b) => b.data.localeCompare(a.data));
}

export async function lerSessoes(sb: any): Promise<{ sessoes: SessaoCamara[]; youtube: EstadoYoutube | null; portal: EstadoPortal | null }> {
  const [y, p] = await Promise.all([lerChave<EstadoYoutube>(sb, CHAVE_YOUTUBE), lerChave<EstadoPortal>(sb, CHAVE_PORTAL)]);
  const youtube = y?.valor ?? null;
  const portal = p?.valor ?? null;
  return { sessoes: montarSessoes(youtube, portal), youtube, portal };
}

const maisDias = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Proposicoes da sessao. A Camara registra no portal, no DIA SEGUINTE a sessao, o que foi apresentado e votado nela
 * (padrao confirmado pela redacao: o que foi votado em 27/10 aparece registrado em 28/10). Entao a proposicao pertence a
 * sessao mais recente que aconteceu na data do registro ou antes: `data da sessao <= registro < proxima sessao`.
 * Registro no proprio dia da sessao (acontece com projetos do Executivo) tambem fica nela.
 */
export function proposicoesDaSessao<T extends { data: string | null }>(todas: T[], data: string, proxima: string | null): T[] {
  return todas.filter((p) => p.data && p.data >= data && (!proxima || p.data < proxima));
}

/** Janela de registro da sessao, para mostrar na pagina: do dia da sessao ate o dia anterior a proxima. */
export const janelaDaSessao = (data: string, proxima: string | null) => ({ de: data, ate: proxima ? maisDias(proxima, -1) : null });

/** Pagina oficial de uma proposicao no portal da Camara (traz o PDF do documento). */
export const urlProposicao = (id: number) => `${PORTAL_CAMARA}/portal/proposicao/${id}`;

/** Producao de cada vereador (quantas proposicoes de cada tipo ele assinou). */
export function producaoPorAutor(itens: Proposicao[]): Array<{ autor: string; total: number; porTipo: Record<string, number> }> {
  const m = new Map<string, { autor: string; total: number; porTipo: Record<string, number> }>();
  for (const p of itens) {
    const sigla = p.tipo.split(' - ')[0] || p.tipo;
    for (const a of p.autores) {
      const e = m.get(a) ?? { autor: a, total: 0, porTipo: {} };
      e.total++;
      e.porTipo[sigla] = (e.porTipo[sigla] ?? 0) + 1;
      m.set(a, e);
    }
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

/* -------------------------------------------------------------------------- */
/* Passos do job                                                               */
/* -------------------------------------------------------------------------- */

export type ModoCamara = 'youtube' | 'portal' | 'dados' | 'noticias' | 'rascunho';

export async function passoCamara(sb: any, env: Record<string, any>, modo: 'youtube' | 'portal'): Promise<string> {
  if (modo === 'youtube') {
    const key = env?.YOUTUBE_API_KEY;
    if (!key) return 'YOUTUBE_API_KEY nao configurada';
    const videos = await buscarYoutube(String(key).trim());
    await gravarChave(sb, CHAVE_YOUTUBE, { atualizadoEm: new Date().toISOString(), videos } satisfies EstadoYoutube);
    const vivo = videos.filter((v) => v.estado === 'ao-vivo').length;
    return `youtube: ${videos.length} video(s), ${vivo} ao vivo`;
  }
  const anterior = (await lerChave<EstadoPortal>(sb, CHAVE_PORTAL))?.valor ?? null;
  const sessoes = await buscarPortal(anterior);
  await gravarChave(sb, CHAVE_PORTAL, { atualizadoEm: new Date().toISOString(), sessoes } satisfies EstadoPortal);
  const ano = dataLocal().y;
  const props = await buscarProposicoes(ano);
  await gravarChave(sb, chaveProposicoes(ano), props);
  return `portal: ${sessoes.length} sessao(oes), ${sessoes.filter((s) => s.ataUrl).length} com ata; ${props.itens.length}/${props.total} proposicao(oes) de ${ano}`;
}

/** Em qual momento rodar cada modo? (hora e dia no fuso de Campo Grande) */
export function modosDaVarredura(agora = new Date(), minutoUtc = agora.getUTCMinutes()): ModoCamara[] {
  const l = dataLocal(agora);
  const modos: ModoCamara[] = [];
  const noite = l.hora >= 18 && l.hora <= 22; // sessoes comecam as 19h
  const diaDeSessao = l.dow === 2 || l.dow === 3; // terca (e quarta, quando a sessao muda)
  if ((noite && diaDeSessao) || minutoUtc < 10) modos.push('youtube'); // ao vivo: a cada varredura; resto do tempo: 1x por hora
  if (minutoUtc < 10 && (l.hora === 7 || l.hora === 13 || (diaDeSessao && l.hora === 23))) modos.push('portal'); // portal: 3x por dia
  if (minutoUtc < 10 && l.hora === 6) modos.push('dados', 'noticias'); // dados abertos da Instar e noticias oficiais: 1x por dia
  if (minutoUtc < 10 && l.hora === 14) modos.push('rascunho'); // rascunho "Esta semana na Camara" (so cria se houver novidade e ainda nao existir)
  return modos;
}

/* -------------------------------------------------------------------------- */
/* Ao vivo                                                                     */
/* -------------------------------------------------------------------------- */

export interface AoVivo {
  /** transmissao no ar agora */
  vivo: VideoSessao | null;
  /** transmissao agendada para as proximas 12 h */
  agendada: VideoSessao | null;
}

/** Estado da transmissao para os avisos do site. Dado velho (mais de 2 h sem atualizar) nao conta como "ao vivo". */
export async function estadoAoVivo(sb: any): Promise<AoVivo> {
  const vazio: AoVivo = { vivo: null, agendada: null };
  if (!sb) return vazio;
  try {
    const y = (await lerChave<EstadoYoutube>(sb, CHAVE_YOUTUBE))?.valor;
    if (!y) return vazio;
    const idade = Date.now() - Date.parse(y.atualizadoEm);
    const agora = Date.now();
    const vivo = idade < 2 * 3_600_000 ? (y.videos.find((v) => v.estado === 'ao-vivo') ?? null) : null;
    const agendada =
      idade < 2 * 3_600_000
        ? (y.videos.find((v) => v.estado === 'agendada' && v.inicio && Date.parse(v.inicio) - agora < 12 * 3_600_000 && Date.parse(v.inicio) - agora > -3_600_000) ?? null)
        : null;
    return { vivo, agendada };
  } catch {
    return vazio;
  }
}

/** "Ordinária", "Extraordinária", "Solene"...: do portal ou, se a ata ainda nao saiu, do titulo do video. */
export function tipoDaSessao(s: SessaoCamara): string {
  if (s.portal?.tipo) return s.portal.tipo;
  for (const v of s.videos) {
    const m = /sess[ãa]o\s+(ordin[áa]ria|extraordin[áa]ria|solene|especial)/i.exec(v.titulo);
    if (m) return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
  }
  return 'Sessão';
}

const TIPOS: Record<string, [string, string]> = {
  PL: ['projeto de lei', 'projetos de lei'],
  PLC: ['projeto de lei complementar', 'projetos de lei complementar'],
  PDL: ['projeto de decreto legislativo', 'projetos de decreto legislativo'],
  REQ: ['requerimento', 'requerimentos'],
  IND: ['indicação', 'indicações'],
  MOC: ['moção', 'moções'],
  PRC: ['parecer', 'pareceres'],
  PRE: ['projeto de resolução', 'projetos de resolução'],
  RSL: ['resolução', 'resoluções'],
};

/** "1 requerimento", "3 projetos de lei". */
export function contarTipo(tipo: string, n: number): string {
  const sigla = tipo.split(' - ')[0].trim();
  const t = TIPOS[sigla];
  return `${n} ${t ? t[n === 1 ? 0 : 1] : (tipo.split(' - ')[1] ?? tipo).toLowerCase()}`;
}
