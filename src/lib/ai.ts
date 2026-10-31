/**
 * src/lib/ai.ts
 * -----------------------------------------------------------------------------
 * Arquitetura dupla à prova de falhas para geração de texto com IA:
 *
 *   a) Cloudflare Workers AI (modelos em CF_MODELS)
 *      via env.AI.run(...) - funciona em dev e produção sem chave externa.
 *   b) Google Gemini (modelo flash mais novo, descoberto via ListModels).
 *
 * Nunca estoura erro 404 cru na tela: qualquer falha retorna uma mensagem
 * amigável em português.
 */

/* Modelos mudam/saem do ar: o llama-3.1-8b-instruct foi desligado em 30/05/2026.
 * Ordem de tentativa; cada falha vira uma linha de diagnostico. */
const CF_MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@cf/google/gemma-3-12b-it',
];
/* Se a lista dinamica falhar, tenta estes. */
const GEMINI_FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-flash'];

/** Descobre os modelos Gemini "flash" ativos (1 chamada, guardada na instancia). */
let geminiModelCache: { at: number; list: string[] } | null = null;
async function listGeminiModels(apiKey: string, o: RunAIOptions): Promise<string[]> {
  if (geminiModelCache && Date.now() - geminiModelCache.at < 6 * 3600_000) return geminiModelCache.list;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${apiKey}`);
    if (!res.ok) {
      o.diag?.push(`gemini listModels: HTTP ${res.status}`);
      return GEMINI_FALLBACK_MODELS;
    }
    const data: any = await res.json();
    const names: string[] = (data?.models ?? [])
      .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m: any) => String(m.name).replace(/^models\//, ''))
      .filter((n: string) => /flash/.test(n) && !/image|tts|live|audio|embed|thinking|robotics|computer|lite/.test(n));
    const score = (n: string) => {
      const v = parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? '0');
      const stable = /preview|exp/.test(n) ? 0 : 1;
      return stable * 100 + v;
    };
    const list = [...new Set(names)].sort((a, b) => score(b) - score(a)).slice(0, 3);
    if (list.length === 0) return GEMINI_FALLBACK_MODELS;
    geminiModelCache = { at: Date.now(), list };
    return list;
  } catch {
    return GEMINI_FALLBACK_MODELS;
  }
}

export interface AIResult {
  text: string;
  provider: 'cloudflare' | 'gemini';
}

/**
 * Executa um prompt com IA, tentando primeiro o Cloudflare Workers AI e
 * fazendo fallback para o Gemini se o binding não estiver disponível.
 */
export interface RunAIOptions {
  /** Provedor tentado primeiro (padrao: cloudflare). */
  prefer?: 'gemini' | 'cloudflare';
  /** Pede resposta em JSON (Gemini: responseMimeType). */
  json?: boolean;
  maxTokens?: number;
  system?: string;
  /** Recebe o motivo de cada falha (provedor: erro), para diagnostico. */
  diag?: string[];
  /** Restringe a um unico provedor. */
  only?: 'gemini' | 'cloudflare';
}

async function viaCloudflare(prompt: string, env: unknown, o: RunAIOptions): Promise<AIResult | null> {
  const ai = (env as any)?.AI;
  if (!ai) {
    o.diag?.push('cloudflare: binding AI ausente');
    return null;
  }
  for (const model of CF_MODELS) {
    try {
      const response = await ai.run(model, {
        messages: [
          ...(o.system ? [{ role: 'system', content: o.system }] : []),
          { role: 'user', content: prompt },
        ],
        max_tokens: o.maxTokens ?? 1000,
      });
      const raw = (response as any)?.response ?? '';
      const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
      if (text.trim()) return { text, provider: 'cloudflare' };
      o.diag?.push(`cloudflare ${model}: resposta vazia`);
    } catch (e: any) {
      const m = String(e?.message ?? e);
      o.diag?.push(`cloudflare ${model}: ${m.slice(0, 120)}`);
      // Cota diaria de neuronios esgotada: os outros modelos falham igual, nao insiste
      if (/4006|daily free allocation/i.test(m)) break;
    }
  }
  return null;
}

async function viaGemini(prompt: string, env: unknown, o: RunAIOptions): Promise<AIResult | null> {
  const apiKey = (env as any)?.GEMINI_API_KEY ?? (env as any)?.GOOGLE_API_KEY;
  if (!apiKey) {
    o.diag?.push('gemini: GEMINI_API_KEY ausente');
    return null;
  }
  const models = await listGeminiModels(apiKey, o);
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(o.system ? { systemInstruction: { parts: [{ text: o.system }] } } : {}),
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: o.maxTokens ?? 4096,
              // Gemini 2.5: o 'pensamento' consome o limite de saida e trunca o JSON
              ...(/2.5/.test(model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
              ...(o.json ? { responseMimeType: 'application/json' } : {}),
            },
          }),
        },
      );
      if (!res.ok) {
        o.diag?.push(`gemini ${model}: HTTP ${res.status}`);
        continue; // 404/429: proximo modelo
      }
      const data: any = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (String(text).trim()) return { text: String(text), provider: 'gemini' };
    } catch (e: any) {
      o.diag?.push(`gemini ${model}: ${String(e?.message ?? e).slice(0, 120)}`);
    }
  }
  return null;
}

export async function runAI(prompt: string, env: unknown, opts: RunAIOptions = {}): Promise<AIResult> {
  let order = opts.prefer === 'gemini' ? [viaGemini, viaCloudflare] : [viaCloudflare, viaGemini];
  if (opts.only) order = [opts.only === 'gemini' ? viaGemini : viaCloudflare];
  for (const run of order) {
    const r = await run(prompt, env, opts);
    if (r) return r;
  }
  throw new Error(
    'Serviço de IA indisponível. Configure o binding [ai] do Cloudflare ou a chave GEMINI_API_KEY.',
  );
}
