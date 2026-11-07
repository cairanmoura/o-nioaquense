/**
 * camara-rascunho.ts
 * -----------------------------------------------------------------------------
 * "Esta semana na Camara": cria, no maximo uma vez por sessao, um RASCUNHO de materia (status 'draft')
 * com o que a Camara registrou desde a sessao anterior: projetos de lei, requerimentos, indicacoes,
 * mocoes e leis/decretos novos.
 *
 * A IA (roteador multi-provedor, tier 1) escreve so o titulo, o subtitulo e a abertura. A lista de
 * proposicoes, os autores, as situacoes e os links oficiais sao montados pelo codigo a partir dos dados:
 * a IA nao decide fato nenhum. A redacao revisa e publica no painel Admin.
 */
import { runRouted } from './ai-router';
import { PORTAL_CAMARA, lerSessoes, proposicoesDaSessao, tipoDaSessao } from './camara-sessoes';
import { CHAVE_INSTAR, lerProposicoesNormalizadas, type DadosInstar, type PropNormalizada } from './camara-dados';
import { vereadorDoTexto, vereadorPorSlug } from './camara-vereadores';
import { dataLocal, gravarChave, lerChave } from './transparencia-store';

const DEFAULT_AUTHOR_ID = '10000000-0000-4000-8000-000000000001';
const chaveRascunho = (data: string) => `camara:rascunho:${data}`;

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtBr = (iso: string) => iso.split('-').reverse().join('/');
const slugify = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);

function autoresTxt(p: PropNormalizada): string {
  const ver = p.vereadores.map((s) => vereadorPorSlug(s)).filter(Boolean).map((v) => `${v!.nome} (${v!.partido})`);
  return [...ver, ...p.outrosAutores].join(', ') || 'autor não informado';
}

/** Titulo sem o nome do vereador no fim ("... - SERGIO MARQUES") e sem caixa alta toda. */
function tituloLimpo(p: PropNormalizada): string {
  const partes = p.titulo.split(' - ');
  let t = partes.length > 1 && vereadorDoTexto(partes.slice(1).join(' - ')) ? partes.slice(0, -1).join(' - ') : p.titulo;
  if (t === t.toUpperCase()) t = t.charAt(0) + t.slice(1).toLowerCase();
  return t.trim();
}

/** Tira o preambulo padrao ("O Vereador que este subscreve, na forma regimental...") e deixa o pedido. */
function ementaLimpa(d: string): string {
  const m = /\b(solicita|requer|indica|prop[õo]e|autoriza|institui|disp[õo]e|cria|altera|estima)\b/i.exec(d);
  const t = (/^(0|o)\s+vereador/i.test(d) && m ? d.slice(m.index) : d).trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** `ia` e `simular` existem so para teste: `simular` monta a materia sem gravar nada. */
export async function gerarRascunhoSemana(
  sb: any,
  env: Record<string, any>,
  opts: { forcar?: boolean; simular?: boolean; ia?: (o: Parameters<typeof runRouted>[0]) => ReturnType<typeof runRouted> } = {},
): Promise<string> {
  const hoje = dataLocal();
  const { sessoes } = await lerSessoes(sb);
  // sessao ja encerrada (de dia anterior) mais recente
  const idx = sessoes.findIndex((s) => s.data < hoje.iso);
  if (idx < 0) return 'rascunho: nenhuma sessao encerrada';
  const alvo = sessoes[idx];
  const proxima = idx > 0 ? sessoes[idx - 1] : null; // lista em ordem decrescente; a mais recente nao tem proxima
  const dias = (Date.parse(`${hoje.iso}T12:00:00Z`) - Date.parse(`${alvo.data}T12:00:00Z`)) / 86_400_000;
  if (dias > 9 && !opts.forcar) return `rascunho: sessao de ${alvo.data} e' antiga demais`;

  if (!opts.forcar && (await lerChave(sb, chaveRascunho(alvo.data)))) return `rascunho: ja tratado para ${alvo.data}`;

  const norm = await lerProposicoesNormalizadas(sb, Number(alvo.data.slice(0, 4)));
  const props = norm ? proposicoesDaSessao(norm.itens, alvo.data, proxima?.data ?? null).filter((p) => p.categoria !== 'parecer') : [];
  const instar = (await lerChave<DadosInstar>(sb, CHAVE_INSTAR(Number(alvo.data.slice(0, 4)))))?.valor ?? null;
  const leis = (instar?.legislacao ?? []).filter(
    (l) => /^(lei|decreto legislativo|resolu)/i.test(l.categoria) && l.data && l.data > alvo.data && (!proxima || l.data <= proxima.data),
  );

  if (props.length === 0 && leis.length === 0) {
    await gravarChave(sb, chaveRascunho(alvo.data), { vazio: true, em: new Date().toISOString() });
    return `rascunho: nada novo para ${alvo.data}`;
  }

  // ordem: leis e projetos primeiro
  const ordemCat = { leis: 0, fiscalizacao: 1, zeladoria: 2, 'sem-ementa': 2, parecer: 3 } as const;
  const ordenadas = [...props].sort((a, b) => ordemCat[a.categoria] - ordemCat[b.categoria]).slice(0, 40);
  const numerosValidos = new Set<string>([...props.map((p) => p.numeroReal), ...leis.map((l) => (l.numero ? `${l.numero}` : null))].filter(Boolean) as string[]);
  props.forEach((p) => p.numeroReal && numerosValidos.add(p.numeroReal));

  const tipoTxt = tipoDaSessao(alvo).toLowerCase();
  const numeroSessao = alvo.portal?.numero ? `nº ${alvo.portal.numero}` : '';
  const fatos = [
    `SESSÃO: ${tipoTxt} ${numeroSessao} da Câmara Municipal de Nioaque, ${fmtBr(alvo.data)} (terça-feira, 19h).`,
    `PROPOSIÇÕES REGISTRADAS NO PERÍODO (${props.length}):`,
    ...ordenadas.map((p) => `- ${tituloLimpo(p)} | autor: ${autoresTxt(p)} | situação: ${p.situacao || 'não informada'}${p.descricao ? ` | ementa: ${ementaLimpa(p.descricao).slice(0, 220)}` : ''}`),
    leis.length ? `LEIS E ATOS NOVOS (${leis.length}):` : '',
    ...leis.slice(0, 15).map((l) => `- ${l.categoria} nº ${l.numero ?? 's/n'} (${l.data ? fmtBr(l.data) : 's/d'}): ${l.ementa.slice(0, 220)}`),
  ]
    .filter(Boolean)
    .join('\n');

  const system =
    'Você é jornalista de um portal de notícias de Nioaque (MS). Escreva em português do Brasil, tom direto, manchete em frase corrente ' +
    '(maiúscula só na primeira palavra e em nomes próprios). Use SOMENTE os fatos fornecidos: não invente números, nomes, valores, datas ou resultados de votação. ' +
    'Não opine. Responda apenas com JSON.';
  const prompt =
    `${fatos}\n\nEscreva: {"title": manchete (até 110 caracteres), "subtitle": linha fina (até 160), "bullets": [3 a 5 frases curtas com os destaques, só com fatos acima], ` +
    `"intro": [2 parágrafos curtos de abertura que resumem o período, sem repetir a lista]}. Se não houver destaque, seja genérico e honesto.`;

  const diag: string[] = [];
  const nums = (t: string) => [...t.matchAll(/\b\d{1,3}\/20\d{2}\b/g)].map((m) => m[0].replace(/^0+/, ''));
  const permitido = new Set([...numerosValidos].map((n) => String(n)));
  const rr = await (opts.ia ?? runRouted)({
    env,
    system,
    prompt,
    scope: 'nioaque', // tier 1 (elite)
    charCount: prompt.length,
    maxTokens: 1500,
    diag,
    validate: (d) => {
      if (typeof d?.title !== 'string' || d.title.length < 15 || d.title.length > 160) return 'titulo invalido';
      if (!Array.isArray(d?.intro) || d.intro.length < 1) return 'sem abertura';
      if (!Array.isArray(d?.bullets) || d.bullets.length < 2) return 'sem destaques';
      const todo = [d.title, d.subtitle ?? '', ...d.intro, ...d.bullets].join(' ');
      const inventado = nums(todo).filter((n) => !permitido.has(n) && !permitido.has(n.replace(/^0+/, '')));
      if (inventado.length) return `numero fora dos fatos: ${inventado[0]}`;
      if (/https?:\/\//.test(todo)) return 'link inventado';
      return null;
    },
  });
  const d = rr.data;

  // Lista fiel (montada pelo codigo): proposicoes e leis com autor, situacao e link oficial
  const grupos: Array<[string, PropNormalizada[]]> = [
    ['Projetos de lei, decretos e resoluções', ordenadas.filter((p) => p.categoria === 'leis')],
    ['Requerimentos', ordenadas.filter((p) => p.sigla === 'REQ')],
    ['Indicações e moções', ordenadas.filter((p) => p.sigla === 'IND' || p.sigla === 'MOC')],
  ];
  const li = (p: PropNormalizada) =>
    `<li><strong>${esc(tituloLimpo(p))}</strong>${p.descricao ? `: ${esc(ementaLimpa(p.descricao).slice(0, 240))}${ementaLimpa(p.descricao).length > 240 ? '…' : ''}` : ''} Autor: ${esc(autoresTxt(p))}${p.divergencia ? ` (o título no portal cita ${esc(vereadorPorSlug(p.divergencia)?.nome ?? '')}, mas vale o campo Autor, que confere com o PDF)` : ''}. Situação: ${esc(p.situacao || 'não informada')}. <a href="${p.fonteUrl}" target="_blank" rel="noopener noreferrer">Fonte oficial</a></li>`;
  const secoes = grupos.filter(([, l]) => l.length).map(([t, l]) => `<h3>${t}</h3><ul>${l.map(li).join('')}</ul>`);
  if (leis.length) {
    secoes.push(
      `<h3>Leis e atos novos</h3><ul>${leis
        .slice(0, 15)
        .map((l) => `<li><strong>${esc(l.categoria)} nº ${l.numero ?? 's/n'}</strong>${l.data ? ` (${fmtBr(l.data)})` : ''}: ${esc(l.ementa)} <a href="${PORTAL_CAMARA}/portal/leis_decretos" target="_blank" rel="noopener noreferrer">Fonte oficial</a></li>`)
        .join('')}</ul>`,
    );
  }
  const fontes = [
    alvo.portal?.ataUrl ? `<a href="${alvo.portal.ataUrl}" target="_blank" rel="noopener noreferrer">ata da sessão (PDF manuscrito, não pesquisável)</a>` : '',
    alvo.videos[0] ? `<a href="https://www.youtube.com/watch?v=${alvo.videos[0].id}" target="_blank" rel="noopener noreferrer">vídeo da sessão</a>` : '',
    `<a href="https://onioaquense.com/camara/sessoes/${alvo.data}">página da sessão no O Nioaquense</a>`,
  ].filter(Boolean);
  const content =
    d.intro.map((t: string) => `<p>${esc(String(t))}</p>`).join('') +
    secoes.join('') +
    `<p>Fontes: portal da Câmara Municipal de Nioaque, ${fontes.join('; ')}.</p>`;

  const sourceUrl = alvo.portal ? `${PORTAL_CAMARA}/portal/sessaoplenaria/0/${alvo.portal.portalId}` : `https://www.youtube.com/watch?v=${alvo.videos[0]?.id ?? alvo.data}`;
  const { data: ja } = await sb.from('articles').select('id').eq('source_url', sourceUrl).limit(1);
  if (ja?.length) {
    await gravarChave(sb, chaveRascunho(alvo.data), { artigo: ja[0].id, em: new Date().toISOString() });
    return `rascunho: ja existe materia para ${alvo.data}`;
  }

  const agora = new Date().toISOString();
  const { data: autor } = await sb.from('profiles').select('id').eq('id', DEFAULT_AUTHOR_ID).maybeSingle();
  let payload: Record<string, unknown> = {
    title: String(d.title).slice(0, 200),
    subtitle: d.subtitle ? String(d.subtitle).slice(0, 220) : null,
    slug: `${slugify(d.title)}-${alvo.data}`,
    summary_bullets: (d.bullets as string[]).slice(0, 5).map(String),
    content,
    cover_image_url: null,
    scope: 'radar_oficial',
    category_label: 'Câmara',
    tags: ['câmara', 'sessão', 'vereadores'],
    is_breaking: false,
    is_featured: false,
    author_id: autor ? DEFAULT_AUTHOR_ID : null,
    status: 'draft',
    views_count: 0,
    published_at: null,
    source_name: 'Câmara Municipal de Nioaque',
    author_name: 'Redação',
    source_url: sourceUrl,
    created_at: agora,
    updated_at: agora,
  };
  if (opts.simular) return JSON.stringify(payload, null, 1);
  let erro: { message: string } | null = null;
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const r = await sb.from('articles').insert(payload).select('id').maybeSingle();
    erro = r.error;
    if (!erro) {
      await gravarChave(sb, chaveRascunho(alvo.data), { artigo: r.data?.id ?? null, em: agora, modelo: rr.provider });
      return `rascunho: criado para ${alvo.data} (${props.length} proposicao(oes), ${leis.length} lei(s)) via ${rr.provider}`;
    }
    const col = erro.message.match(/Could not find the '([^']+)' column/);
    if (col) {
      delete payload[col[1]];
      continue;
    }
    if (/scope|enum/.test(erro.message) && payload.scope !== 'ms') {
      payload = { ...payload, scope: 'ms' };
      continue;
    }
    break;
  }
  throw new Error(`rascunho: falha ao gravar (${erro?.message})`);
}
