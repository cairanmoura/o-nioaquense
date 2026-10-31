/**
 * src/lib/ai.ts
 * -----------------------------------------------------------------------------
 * Arquitetura dupla à prova de falhas para geração de texto com IA:
 *
 *   a) Prioridade: Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct)
 *      via env.AI.run(...) - funciona em dev e produção sem chave externa.
 *   b) Fallback: Google Gemini (gemini-2.5-flash) via GEMINI_API_KEY.
 *
 * Nunca estoura erro 404 cru na tela: qualquer falha retorna uma mensagem
 * amigável em português.
 */

const CF_MODELS = ['@cf/meta/llama-3.1-8b-instruct', '@cf/meta/llama-3.1-8b-instruct-fast', '@cf/meta/llama-3.2-3b-instruct'];
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];

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
}

async function viaCloudflare(prompt: string, env: unknown, o: RunAIOptions): Promise<AIResult | null> {
  const ai = (env as any)?.AI;
  if (!ai) return null;
  for (const model of CF_MODELS) {
    try {
      const response = await ai.run(model, {
        messages: [
          ...(o.system ? [{ role: 'system', content: o.system }] : []),
          { role: 'user', content: prompt },
        ],
        max_tokens: o.maxTokens ?? 1000,
      });
      const text = (response as any)?.response ?? '';
      if (String(text).trim()) return { text: String(text), provider: 'cloudflare' };
    } catch {
      // 404/indisponivel: tenta o proximo modelo
    }
  }
  return null;
}

async function viaGemini(prompt: string, env: unknown, o: RunAIOptions): Promise<AIResult | null> {
  const apiKey = (env as any)?.GEMINI_API_KEY ?? (env as any)?.GOOGLE_API_KEY;
  if (!apiKey) return null;
  for (const model of GEMINI_MODELS) {
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
              maxOutputTokens: o.maxTokens ?? 2048,
              ...(o.json ? { responseMimeType: 'application/json' } : {}),
            },
          }),
        },
      );
      if (!res.ok) continue; // 404/429: proximo modelo
      const data: any = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (String(text).trim()) return { text: String(text), provider: 'gemini' };
    } catch {
      // proximo modelo
    }
  }
  return null;
}

export async function runAI(prompt: string, env: unknown, opts: RunAIOptions = {}): Promise<AIResult> {
  const order = opts.prefer === 'gemini' ? [viaGemini, viaCloudflare] : [viaCloudflare, viaGemini];
  for (const run of order) {
    const r = await run(prompt, env, opts);
    if (r) return r;
  }
  throw new Error(
    'Serviço de IA indisponível. Configure o binding [ai] do Cloudflare ou a chave GEMINI_API_KEY.',
  );
}
