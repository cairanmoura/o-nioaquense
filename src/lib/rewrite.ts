/**
 * rewrite.ts
 * -----------------------------------------------------------------------------
 * Reescrita jornalistica com IA (Gemini principal, Workers AI de reserva),
 * com retorno estruturado em JSON.
 */

import { runAI } from './ai';
import { sanitizeArticleHtml } from './clean-content';

export interface Rewritten {
  title: string;
  subtitle: string | null;
  summary_bullets: string[];
  content_html: string;
  suggested_category: string | null;
  provider: string;
}

const SYSTEM = `Você é o Editor-Chefe d'O Nioaquense, portal de notícias hiperlocal de Nioaque (MS).
Reescreva a matéria recebida de forma 100% autoral e inédita, otimizada para SEO e Google Discover, com fidelidade estrita aos fatos: nomes, cargos, datas, horários, locais e valores não podem ser alterados nem inventados. Sem sensacionalismo ou clickbait.
Responda SOMENTE com um objeto JSON válido, sem markdown, com as chaves:
"title" (título jornalístico, até 90 caracteres),
"subtitle" (linha fina complementar, até 160 caracteres),
"summary_bullets" (array com EXATAMENTE 3 tópicos curtos, até 15 palavras cada),
"content_html" (corpo em HTML apenas com <p> e <h2>; parágrafos claros, intertítulos quando útil; cite a fonte de forma natural, por exemplo "Segundo informações apuradas pelo portal NOME DA FONTE, ..."),
"suggested_category" (uma entre: Política, Saúde, Educação, Agro, Polícia, Esporte, Cultura, Economia, Cidade, Geral).`;

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

export async function rewriteArticle(
  input: { text: string; sourceName: string; sourceUrl: string; extraInstruction?: string },
  env: unknown,
): Promise<Rewritten> {
  const prompt = `Fonte: ${input.sourceName} (${input.sourceUrl})${input.extraInstruction ? `\n${input.extraInstruction}` : ''}\n\nTexto original:\n${input.text.slice(0, 7000)}`;
  const diag: string[] = [];
  let data: any = null;
  let provider = '';
  // Gemini primeiro; se nao vier JSON valido, tenta o Workers AI
  for (const only of ['gemini', 'cloudflare'] as const) {
    try {
      const res = await runAI(prompt, env, { only, json: true, system: SYSTEM, maxTokens: only === 'gemini' ? 4096 : 2500, diag });
      const parsed = parseJson(res.text);
      if (parsed && typeof parsed.title === 'string') {
        data = parsed;
        provider = res.provider;
        break;
      }
      diag.push(`${only}: resposta sem JSON valido (${res.text.slice(0, 80).replace(/s+/g, ' ')}…)`);
    } catch {
      // motivo ja registrado em diag
    }
  }
  if (!data) throw new Error('A IA não devolveu JSON válido. Detalhes: ' + (diag.join(' | ') || 'sem detalhes'));

  const clean = sanitizeArticleHtml(String(data.content_html ?? ''));
  const bullets = Array.isArray(data.summary_bullets)
    ? data.summary_bullets.map((b: unknown) => String(b).trim()).filter((b: string) => b.length >= 15).slice(0, 3)
    : [];
  if (clean.paragraphs < 2) throw new Error('Texto reescrito curto demais.');

  return {
    title: data.title.trim().slice(0, 200),
    subtitle: data.subtitle ? String(data.subtitle).trim().slice(0, 240) : null,
    summary_bullets: bullets,
    content_html: clean.html,
    suggested_category: data.suggested_category ? String(data.suggested_category).trim() : null,
    provider,
  };
}
