/**
 * ai-router.ts - roteador multi-provedor de IA (Google, NVIDIA NIM, Groq, Mistral,
 * Cohere e OpenRouter) com fila de modelos escolhida por LOCAL e TAMANHO da materia.
 *
 * Objetivo: qualidade editorial (so modelos grandes) e redundancia contra 429/4006.
 * Falhou, deu 429/400/5xx ou nao passou na validacao -> passa ao proximo da fila,
 * sem abortar a materia. As chaves vem dos segredos do Worker (nunca do codigo).
 */

/* -------------------------------------------------------------------------- */
/* Medicao do conteudo (pre-IA)                                               */
/* -------------------------------------------------------------------------- */

const FOOTER_PHRASES = [
  /acompanhe o lado b[^.\n]*/gi,
  /receba pelo whats(app)?[^.\n]*/gi,
  /clique aqui para entrar na lista vip[^.\n]*/gi,
  /nos siga no[^.\n]*/gi,
  /siga[- ]nos[^.\n]*/gi,
  /leia tamb[eé]m[^.\n]*/gi,
  /veja tamb[eé]m[^.\n]*/gi,
  /entre no (grupo|canal)[^.\n]*/gi,
  /inscreva-se[^.\n]*/gi,
];

export const MAX_INPUT_CHARS = 12000;

export interface Measured {
  cleanText: string;
  charCount: number;
  /** Teto de tokens de saida para este tamanho de materia. */
  maxOutputTokens: number;
}

/** Limpa o texto (tags, rodape de portal, espacos) e mede o tamanho real. */
export function measureCleanContent(rawHtmlOrText: string): Measured {
  let t = String(rawHtmlOrText ?? '')
    .replace(/<(script|style|aside|footer|nav|header|form)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  for (const re of FOOTER_PHRASES) t = t.replace(re, ' ');
  t = t.replace(/[ \t\f\v ]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const cleanText = t.slice(0, MAX_INPUT_CHARS);
  const charCount = cleanText.length;
  // Faixas de referencia: >=3500 -> 1800; 1200-3499 -> 1100; <1200 -> 650. O teto sobe junto
  // com o texto (a saida acompanha o tamanho do original), senao materias longas sairiam cortadas.
  const tier = charCount >= 3500 ? 1800 : charCount >= 1200 ? 1100 : 650;
  const needed = Math.ceil(charCount / 2.8) + 500;
  return { cleanText, charCount, maxOutputTokens: Math.max(tier, Math.min(6500, needed)) };
}

/* -------------------------------------------------------------------------- */
/* Matriz de roteamento                                                        */
/* -------------------------------------------------------------------------- */

export type Provider = 'google' | 'nvidia' | 'groq' | 'mistral' | 'cohere' | 'openrouter';
export interface ModelRef {
  provider: Provider;
  model: string;
}
const m = (spec: string): ModelRef => {
  const i = spec.indexOf(':');
  return { provider: spec.slice(0, i) as Provider, model: spec.slice(i + 1) };
};

const TIER1 = [
  'google:gemini-3.8-flash', 'mistral:mistral-large-latest', 'nvidia:meta/llama-3.3-70b-instruct', 'groq:openai/gpt-oss-120b',
  'google:gemini-3.6-flash', 'nvidia:nvidia/llama-3.1-nemotron-70b-instruct', 'google:gemini-2.5-flash', 'cohere:command-a-03-2025',
  'openrouter:openrouter/free',
].map(m);
const TIER2 = [
  'groq:openai/gpt-oss-120b', 'nvidia:meta/llama-3.3-70b-instruct', 'google:gemini-3.5-flash-lite', 'mistral:mistral-small-latest',
  'google:gemini-3.1-flash-lite', 'groq:openai/gpt-oss-20b', 'cohere:command-r-08-2024', 'openrouter:openrouter/free',
].map(m);
const TIER3 = [
  'google:gemma-4-31b-it', 'groq:openai/gpt-oss-20b', 'mistral:mistral-small-latest', 'nvidia:meta/llama-3.3-70b-instruct',
  'google:gemma-4-26b-it', 'google:gemini-3.5-flash-lite',
].map(m);

/**
 * TIER 1 (elite): Nioaque, Regiao ou materia longa (>= 3500 caracteres).
 * TIER 2 (alta precisao): MS/Brasil/Mundo com 1200-3499 caracteres.
 * TIER 3 (notas rapidas): MS/Brasil/Mundo com menos de 1200 caracteres.
 */
export function selectModelPipeline(scope: string | null | undefined, charCount: number): { tier: 1 | 2 | 3; queue: ModelRef[] } {
  if (scope === 'nioaque' || scope === 'regiao' || charCount >= 3500) return { tier: 1, queue: TIER1 };
  if (charCount >= 1200) return { tier: 2, queue: TIER2 };
  return { tier: 3, queue: TIER3 };
}

/* -------------------------------------------------------------------------- */
/* Conectores                                                                  */
/* -------------------------------------------------------------------------- */

const TIMEOUT_MS = 22000;

async function post(url: string, init: RequestInit): Promise<any> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

interface CallInput {
  system: string;
  prompt: string;
  maxTokens: number;
  env: any;
}

const KEYS: Record<Provider, string> = {
  google: 'GEMINI_API_KEY',
  nvidia: 'NVIDIA_API_KEY',
  groq: 'GROQ_API_KEY',
  mistral: 'MISTRAL_API_KEY',
  cohere: 'COHERE_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
};

/** Chat estilo OpenAI (NVIDIA, Groq, Mistral, OpenRouter). */
async function openAiStyle(url: string, key: string, body: Record<string, unknown>, extraHeaders: Record<string, string> = {}): Promise<string> {
  const data = await post(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  });
  return String(data?.choices?.[0]?.message?.content ?? '');
}

export async function callModel(ref: ModelRef, { system, prompt, maxTokens, env }: CallInput): Promise<string> {
  const key = env?.[KEYS[ref.provider]] ?? (ref.provider === 'google' ? env?.GOOGLE_API_KEY : undefined);
  if (!key) throw new Error('chave ausente');
  const messages = [{ role: 'system', content: system }, { role: 'user', content: prompt }];

  switch (ref.provider) {
    case 'google': {
      const isGemma = /^gemma/i.test(ref.model);
      const data = await post(`https://generativelanguage.googleapis.com/v1beta/models/${ref.model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Gemma nao aceita systemInstruction nem JSON mime: instrucoes vao no texto e o JSON e' extraido por regex
          ...(isGemma ? {} : { systemInstruction: { parts: [{ text: system }] } }),
          contents: [{ role: 'user', parts: [{ text: isGemma ? `${system}\n\n${prompt}` : prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: maxTokens,
            ...(isGemma ? {} : { responseMimeType: 'application/json' }),
            ...(/2\.5/.test(ref.model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        }),
      });
      return String(data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('') ?? '');
    }
    case 'nvidia':
      return openAiStyle('https://integrate.api.nvidia.com/v1/chat/completions', key, { model: ref.model, messages, temperature: 0.2, max_tokens: maxTokens });
    case 'groq':
      return openAiStyle('https://api.groq.com/openai/v1/chat/completions', key, {
        model: ref.model, messages, temperature: 0.2, max_tokens: maxTokens, response_format: { type: 'json_object' },
      });
    case 'mistral':
      return openAiStyle('https://api.mistral.ai/v1/chat/completions', key, {
        model: ref.model, messages, temperature: 0.2, max_tokens: maxTokens, response_format: { type: 'json_object' },
      });
    case 'openrouter':
      return openAiStyle('https://openrouter.ai/api/v1/chat/completions', key, { model: ref.model, messages, temperature: 0.2, max_tokens: maxTokens }, {
        'HTTP-Referer': 'https://onioaquense.com.br',
        'X-Title': 'O Nioaquense',
      });
    case 'cohere': {
      const data = await post('https://api.cohere.com/v2/chat', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: ref.model, messages, temperature: 0.2, max_tokens: maxTokens, response_format: { type: 'json_object' } }),
      });
      return String(data?.message?.content?.map((c: any) => c?.text ?? '').join('') ?? '');
    }
  }
}

/** Extrai o objeto JSON da resposta (aceita markdown ao redor). */
export function extractJson(text: string): any | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export interface RoutedResult {
  data: any;
  raw: string;
  provider: string;
  tier: 1 | 2 | 3;
}

/**
 * Percorre a fila do tier; o primeiro modelo que responder E passar na validacao vence.
 * `diag` recebe o motivo de cada falha (aparece no recado da fonte no painel).
 */
export async function runRouted(opts: {
  env: unknown;
  system: string;
  prompt: string;
  scope: string | null | undefined;
  charCount: number;
  maxTokens: number;
  validate: (data: any) => string | null; // null = ok; texto = motivo da rejeicao
  diag: string[];
}): Promise<RoutedResult> {
  const { tier, queue } = selectModelPipeline(opts.scope, opts.charCount);
  for (const ref of queue) {
    const label = `${ref.provider}:${ref.model}`;
    try {
      const raw = await callModel(ref, { system: opts.system, prompt: opts.prompt, maxTokens: opts.maxTokens, env: opts.env });
      const data = extractJson(raw);
      if (!data) {
        opts.diag.push(`${label}: sem JSON`);
        continue;
      }
      const bad = opts.validate(data);
      if (bad) {
        opts.diag.push(`${label}: ${bad}`);
        continue;
      }
      return { data, raw, provider: label, tier };
    } catch (e: any) {
      opts.diag.push(`${label}: ${e?.name === 'AbortError' ? 'timeout 22s' : String(e?.message ?? e).slice(0, 80)}`);
    }
  }
  throw new Error('Nenhum modelo da fila respondeu com resultado valido. ' + opts.diag.slice(-12).join(' | '));
}
