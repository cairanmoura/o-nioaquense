/**
 * rewrite.ts
 * -----------------------------------------------------------------------------
 * Reescrita jornalistica com IA (Gemini principal, Workers AI de reserva),
 * com retorno estruturado em JSON.
 *
 * CRITERIOS EDITORIAIS (o prompt e a validacao abaixo existem para cumpri-los):
 *  1. Fidelidade: nenhum nome, cargo, numero, data, hora, local ou valor muda
 *     nem e inventado; nada do original e' omitido (inclui servico: horario,
 *     endereco, contato, prazo).
 *  2. Tamanho: a materia reescrita tem de 85% a 115% das palavras do original.
 *     Resposta com menos de 75% e' recusada e refeita uma vez.
 *  3. Titulo concreto: 55-95 caracteres com QUEM + O QUE + ONDE (e numero,
 *     quando houver). Sem "entenda", "veja", "saiba", sem vagueza.
 *  4. Autoral: texto proprio (nao copia frases); aspas de falas podem ficar.
 *  5. Classificacao pelo ASSUNTO: local, tema e tags vem da materia, nunca da
 *     fonte onde ela foi publicada.
 */

import { measureCleanContent, runRouted } from './ai-router';
import { CATEGORY_LABELS, normalizeCategory, sanitizeCategory } from './categories';
import { normalizeScope } from './geo';
import { sanitizeArticleHtml } from './clean-content';

export interface Rewritten {
  title: string;
  subtitle: string | null;
  summary_bullets: string[];
  content_html: string;
  /** Tema (uma das editorias oficiais). */
  suggested_category: string | null;
  /** Local sugerido pela IA: nioaque | regiao | ms | brasil | mundo (ou null). */
  suggested_scope: string | null;
  /** Tags livres: cidades, orgaos, pessoas, assuntos. */
  tags: string[];
  /** Crime/morte/violencia como assunto central (julgamento da IA). */
  violence: boolean | null;
  /** Importancia 1-5 (julgamento da IA). */
  importance: number | null;
  provider: string;
  words_src: number;
  words_out: number;
  /** Avisos de qualidade (ex.: texto curto demais) para a revisao humana. */
  warnings: string[];
}

const wordCount = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

const SYSTEM = `Você é o Editor-Chefe d'O Nioaquense, portal de notícias hiperlocal de Nioaque (MS).
Reescreva a matéria recebida com texto 100% autoral, otimizado para SEO e Google Discover, SEM perder informação.

REGRAS DE CONTEÚDO
- Fidelidade estrita: nomes, cargos, idades, números, valores, datas, horários e locais não podem ser alterados nem inventados. Não acrescente fatos que não estejam no original.
- Não omita nada relevante: mantenha todos os fatos, as falas (pode manter aspas, sempre atribuídas a quem falou), o contexto e as informações de serviço (horário, endereço, contato, prazo, como participar).
- TAMANHO: o texto novo deve ter entre 85% e 115% das palavras do original (a contagem vem no pedido). Matéria curta fica curta, mas nunca resuma matéria longa.
- Estrutura: primeiro parágrafo responde quem, o quê, quando, onde e por quê; depois detalhes em ordem decrescente de importância; parágrafos de 2 a 4 frases; use <h2> só em matérias longas (mais de 300 palavras).
- Cite a fonte de forma natural uma vez (ex.: "segundo o portal NOME DA FONTE").
- Sem sensacionalismo, sem clickbait, sem opinião.
- UM ASSUNTO SÓ: escreva apenas sobre o fato do título. O texto original pode trazer, por engano, trechos de outras notícias ("leia também", "outras notícias", chamadas, menus, rodapé): IGNORE-os por completo e nunca os resuma nem os cite.

AGENDA / LISTA DE EVENTOS: quando a matéria listar 3 ou mais eventos (shows, cinema, teatro, feiras, cursos, jogos), escreva um parágrafo de abertura e depois UM parágrafo <p> por evento, neste formato exato (campos separados por " | "; use "-" para o que não houver):
<p>[EVENTO] Atração ou nome do evento | Data (ex.: sáb., 1º/11) | Horário | Cidade | Local ou endereço | Valor ou observação (ex.: gratuito)</p>
Eventos nunca ficam em texto corrido. Mantenha os eventos agrupados em sequência, ordenados por data.

TÍTULO: de 55 a 95 caracteres, CONCRETO: quem + o quê + onde (e o número principal, se houver). Proibido título vago ou de curiosidade ("Entenda...", "Veja...", "Saiba...", "O que se sabe"). Exemplos:
  ruim: "MPF denuncia 11 por tráfico"  ->  bom: "MPF denuncia 11 investigados por tráfico de drogas na fronteira de MS com o Paraguai"
  ruim: "Homem é preso em Campo Grande"  ->  bom: "Trabalhador é preso por incendiar chácara após discussão sobre dívida em Campo Grande"
SUBTÍTULO: até 160 caracteres, traz um dado novo (não repete o título).
RESUMO (summary_bullets): EXATAMENTE 3 tópicos de até 18 palavras, cada um com um fato diferente.

CLASSIFICAÇÃO (decida pelo ASSUNTO da matéria, nunca pelo jornal onde foi publicada)
- "suggested_scope" (local onde a matéria importa), um entre:
  "nioaque" = cita a cidade de Nioaque ou seus moradores/órgãos;
  "regiao" = cita Jardim, Guia Lopes da Laguna, Bonito, Anastácio, Aquidauana, Sidrolândia, Maracaju, Miranda, Bodoquena, Porto Murtinho ou BR-060/BR-419 (sem Nioaque);
  "ms" = fato do estado de Mato Grosso do Sul ou de outra cidade sul-mato-grossense (Campo Grande, Dourados...), governo estadual, TJMS, Assembleia;
  "brasil" = fato nacional ou de instituição federal (Senado, Câmara dos Deputados, STF, Planalto, ministérios, PF, Receita, Banco Central), mesmo que publicado por jornal de MS;
  "mundo" = fato ocorrido fora do Brasil.
- "suggested_category" (tema): EXATAMENTE uma destas: ${CATEGORY_LABELS.join(', ')}. "Política" para prefeitura, Câmara, governos e eleições; "Cidade" só para serviços e vida comunitária de Nioaque; "Geral" apenas se nenhuma servir.
- "tags": de 3 a 8 etiquetas curtas (cidades, órgãos, pessoas e assuntos centrais citados), sem repetir o tema.
- "violencia": true se o assunto central é crime, morte, agressão, assalto, tráfico, acidente com vítima ou outra violência; senão false.
- "importancia": inteiro de 1 a 5 (1 = fato corriqueiro de bairro, 3 = relevante para a cidade, 4 = grande repercussão no estado, 5 = nacional ou de enorme impacto). Casos policiais comuns valem 1 ou 2; só dê 4 ou 5 a violência com muitas vítimas, autoridades envolvidas ou repercussão estadual/nacional.
- Foco editorial do portal: política, economia, cultura, cidade, lazer, infraestrutura, obras e transparência.
- REGRA DO TEMA "Transparência": use SOMENTE quando o assunto central é fiscalização, auditoria, licitação, contrato, prestação de contas ou gasto de dinheiro PÚBLICO por órgão do governo (ex.: TCE aponta irregularidade em contrato da prefeitura). NÃO use para: mercado financeiro, bolsa, fundos, empresas privadas, loterias e apostas, esporte e clubes, decisões judiciais comuns, cursos e programas de treinamento, ou qualquer assunto privado. Nesses casos escolha o tema real (Economia, Esporte, Justiça, Educação, Tecnologia...).

Responda SOMENTE com um objeto JSON válido, sem markdown, com as chaves:
"title", "subtitle", "summary_bullets" (array de 3), "content_html" (apenas <p> e <h2>), "suggested_scope", "suggested_category", "tags" (array), "violencia" (boolean), "importancia" (inteiro 1-5).`;

function parseJson(raw: string): any | null {
  const t = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

/** Uma chamada completa (Gemini, depois Workers AI) que devolve o JSON bruto. */
/** Validacao de cada resposta: se reprovar, o roteador passa ao proximo modelo da fila. */
function validateRewrite(d: any): string | null {
  const title = typeof d?.title === 'string' ? d.title.trim() : '';
  if (title.length < 15) return 'titulo ausente/curto';
  if (/t[ií]tulo reescrito\s*:/i.test(title)) return 'titulo com "Titulo reescrito:"';
  if (/(\d{1,2}\/\d{1,2}\/\d{2,4}.*){3,}/.test(title)) return 'titulo com datas repetidas';
  const bullets = d.summary_bullets ?? d.bullets;
  if (!Array.isArray(bullets) || bullets.filter((b: unknown) => typeof b === 'string' && b.trim().length >= 10).length < 3) return 'menos de 3 bullets';
  const html = String(d.content_html ?? d.content ?? '');
  if (!/<p[\s>]/i.test(html)) return 'conteudo sem <p>';
  return null;
}

async function callOnce(
  prompt: string,
  env: unknown,
  diag: string[],
  route: { scope?: string | null; charCount: number; maxTokens: number },
): Promise<{ data: any; provider: string } | null> {
  try {
    const r = await runRouted({ env, system: SYSTEM, prompt, scope: route.scope, charCount: route.charCount, maxTokens: route.maxTokens, validate: validateRewrite, diag });
    const d = r.data;
    if (!d.content_html && d.content) d.content_html = d.content;
    if (!d.summary_bullets && d.bullets) d.summary_bullets = d.bullets;
    return { data: d, provider: r.provider };
  } catch {
    return null; // motivos ja estao em diag
  }
}

export async function rewriteArticle(
  input: { text: string; sourceName: string; sourceUrl: string; extraInstruction?: string; scope?: string | null },
  env: unknown,
): Promise<Rewritten> {
  const measured = measureCleanContent(input.text);
  const source = measured.cleanText;
  const route = { scope: input.scope, charCount: measured.charCount, maxTokens: measured.maxOutputTokens };
  const wordsSrc = wordCount(source);
  const lo = Math.round(wordsSrc * 0.85);
  const hi = Math.round(wordsSrc * 1.15);

  const base = `Fonte: ${input.sourceName} (${input.sourceUrl})${input.extraInstruction ? `\n${input.extraInstruction}` : ''}\n\nO texto original tem ${wordsSrc} palavras. Escreva a matéria com ${lo} a ${hi} palavras.\n\nTexto original:\n${source}`;

  const diag: string[] = [];
  let attempt = await callOnce(base, env, diag, route);
  if (!attempt) throw new Error('A IA não devolveu JSON válido. Detalhes: ' + (diag.join(' | ') || 'sem detalhes'));

  let clean = sanitizeArticleHtml(String(attempt.data.content_html ?? ''));
  let wordsOut = wordCount(clean.text);

  // Curta demais: refaz uma vez dizendo exatamente o que faltou
  if (wordsSrc >= 120 && wordsOut < wordsSrc * 0.75) {
    const retryPrompt = `${base}\n\nATENÇÃO: sua versão anterior ficou curta (${wordsOut} de ${wordsSrc} palavras) e perdeu informações. Reescreva COMPLETA, cobrindo todos os parágrafos do original, com ${lo} a ${hi} palavras.`;
    const second = await callOnce(retryPrompt, env, diag, route);
    if (second) {
      const clean2 = sanitizeArticleHtml(String(second.data.content_html ?? ''));
      if (wordCount(clean2.text) > wordsOut) {
        attempt = second;
        clean = clean2;
        wordsOut = wordCount(clean2.text);
      }
    }
  }

  const data = attempt.data;
  const bullets = Array.isArray(data.summary_bullets)
    ? data.summary_bullets.map((b: unknown) => String(b).trim()).filter((b: string) => b.length >= 15).slice(0, 3)
    : [];
  if (clean.paragraphs < 2 && wordsSrc >= 120) throw new Error('Texto reescrito curto demais.');

  const warnings: string[] = [];
  if (wordsSrc >= 120 && wordsOut < wordsSrc * 0.75) warnings.push(`texto curto: ${wordsOut} de ${wordsSrc} palavras do original`);
  if (String(data.title ?? '').trim().length < 40) warnings.push('título curto/vago');

  const tags = Array.isArray(data.tags)
    ? [...new Set(data.tags.map((t: unknown) => String(t).trim()).filter((t: string) => t.length >= 2 && t.length <= 40))].slice(0, 8) as string[]
    : [];

  return {
    title: data.title.trim().slice(0, 200),
    subtitle: data.subtitle ? String(data.subtitle).trim().slice(0, 240) : null,
    summary_bullets: bullets,
    content_html: clean.html,
    suggested_category: sanitizeCategory(normalizeCategory(data.suggested_category), data.title, clean.text),
    suggested_scope: normalizeScope(data.suggested_scope),
    tags,
    violence: typeof data.violencia === 'boolean' ? data.violencia : null,
    importance: Number.isFinite(Number(data.importancia)) ? Math.min(5, Math.max(1, Math.round(Number(data.importancia)))) : null,
    provider: attempt.provider,
    words_src: wordsSrc,
    words_out: wordsOut,
    warnings,
  };
}
