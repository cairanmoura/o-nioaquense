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
export async function runAI(prompt: string, env: unknown): Promise<AIResult> {
  // --- a) Cloudflare Workers AI (prioridade), com modelos alternativos se o primeiro der 404 ---
  const ai = (env as any)?.AI;
  if (ai) {
    for (const model of CF_MODELS) {
      try {
        const response = await ai.run(model, { prompt, max_tokens: 1000 });
        const text = (response as any)?.response ?? '';
        if (text.trim()) return { text, provider: 'cloudflare' };
      } catch {
        // 404/indisponivel: tenta o proximo modelo
      }
    }
  }

  // --- b) Gemini fallback, tambem com modelos alternativos ---
  const apiKey = (env as any)?.GEMINI_API_KEY ?? (env as any)?.GOOGLE_API_KEY;
  if (apiKey) {
    for (const model of GEMINI_MODELS) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          },
        );
        if (!res.ok) continue; // 404/429: proximo modelo
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (text.trim()) return { text, provider: 'gemini' };
      } catch {
        // proximo modelo
      }
    }
  }

  throw new Error(
    'Serviço de IA indisponível. Configure o binding [ai] do Cloudflare ou a chave GEMINI_API_KEY.',
  );
}
