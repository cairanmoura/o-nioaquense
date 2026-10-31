/**
 * xsync.ts - sincroniza os posts dos colunistas pela API OFICIAL do X (v2).
 *
 * Requer o segredo X_BEARER_TOKEN (Bearer Token do app no developer.x.com,
 * plano pay-per-use). A cobranca e' por post devolvido; usamos `since_id` para
 * buscar so o que e' novo (chamada sem novidade nao devolve post, logo nao cobra).
 * Respostas e retweets ficam de fora: so posts proprios do colunista.
 */

const API = 'https://api.x.com/2';

async function xGet(path: string, token: string): Promise<any> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'o-nioaquense' } });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.detail || body?.title || body?.errors?.[0]?.message || `HTTP ${res.status}`;
    throw new Error(`X API: ${msg}${res.status === 402 ? ' (sem creditos na conta do X)' : ''}`);
  }
  return body;
}

export interface SyncResult {
  inserted: number;
  errors: string[];
}

export async function syncXColumnists(supabase: any, token: string, perUser = 10): Promise<SyncResult> {
  const out: SyncResult = { inserted: 0, errors: [] };
  const { data: columnists, error } = await supabase.from('x_columnists').select('*').eq('active', true);
  if (error) {
    out.errors.push(error.message + ' (rode a migracao 019)');
    return out;
  }

  for (const c of columnists ?? []) {
    try {
      let userId: string | null = c.x_user_id ?? null;
      if (!userId) {
        const u = await xGet(`/users/by/username/${encodeURIComponent(c.handle)}`, token);
        userId = u?.data?.id ?? null;
        if (!userId) throw new Error(`usuario @${c.handle} nao encontrado`);
        await supabase.from('x_columnists').update({ x_user_id: userId }).eq('id', c.id);
      }

      const q = new URLSearchParams({
        max_results: String(Math.max(5, perUser)),
        exclude: 'retweets,replies',
        'tweet.fields': 'created_at,note_tweet,attachments',
        expansions: 'attachments.media_keys',
        'media.fields': 'url,type,preview_image_url',
      });
      if (c.last_tweet_id) q.set('since_id', String(c.last_tweet_id));
      const body = await xGet(`/users/${userId}/tweets?${q}`, token);

      const media = new Map<string, any>((body?.includes?.media ?? []).map((m: any) => [m.media_key, m]));
      const tweets: any[] = body?.data ?? [];
      if (!tweets.length) continue;

      const rows = tweets.map((t) => {
        const key = t.attachments?.media_keys?.find((k: string) => media.get(k)?.type === 'photo');
        return {
          columnist_id: c.id,
          tweet_id: String(t.id),
          url: `https://x.com/${c.handle}/status/${t.id}`,
          // posts longos: o texto inteiro vem em note_tweet
          text: String(t.note_tweet?.text ?? t.text ?? ''),
          media_url: key ? media.get(key)?.url ?? null : null,
          posted_at: t.created_at ? new Date(t.created_at).toISOString() : new Date().toISOString(),
        };
      });
      const { error: upErr } = await supabase.from('x_posts').upsert(rows, { onConflict: 'tweet_id' });
      if (upErr) throw new Error(upErr.message);
      out.inserted += rows.length;

      const newest = tweets.map((t) => BigInt(t.id)).reduce((a, b) => (a > b ? a : b));
      await supabase.from('x_columnists').update({ last_tweet_id: String(newest) }).eq('id', c.id);
    } catch (e: any) {
      out.errors.push(`@${c.handle}: ${String(e?.message ?? e).slice(0, 200)}`);
    }
  }
  return out;
}
