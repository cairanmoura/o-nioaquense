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

export interface AIResult {
  text: string;
  provider: 'cloudflare' | 'gemini';
}

/**
 * Executa um prompt com IA, tentando primeiro o Cloudflare Workers AI e
 * fazendo fallback para o Gemini se o binding não estiver disponível.
 */
export async function runAI(prompt: string, env: unknown): Promise<AIResult> {
  // --- a) Cloudflare Workers AI (prioridade) ---
  const ai = (env as any)?.AI;
  if (ai) {
    try {
      const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt,
        max_tokens: 1000,
      });
      const text = (response as any)?.response ?? '';
      if (text.trim()) return { text, provider: 'cloudflare' };
    } catch {
      // segue para fallback
    }
  }

  // --- b) Gemini fallback ---
  const apiKey =
    (env as any)?.GEMINI_API_KEY ?? (env as any)?.GOOGLE_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Modelo de IA indisponível no momento.');
        }
        throw new Error(`Erro da IA: ${res.status}`);
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (text.trim()) return { text, provider: 'gemini' };
    } catch {
      // segue para erro amigável
    }
  }

  throw new Error(
    'Serviço de IA indisponível. Configure o binding [ai] do Cloudflare ou a chave GEMINI_API_KEY.',
  );
}
