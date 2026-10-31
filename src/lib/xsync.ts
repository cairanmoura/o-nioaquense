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

/**
 * Apify (actor kaitoeasyapi/twitter-x-data-tweet-scraper-pay-per-result-cheapest):
 * ~US$ 0,00025 por tweet no plano gratis (US$ 5/mes de credito), 98% de sucesso nos
 * ultimos 30 dias. 3 colunistas x 8 posts x 2 execucoes/dia = cerca de US$ 0,40/mes.
 */
const APIFY_ACTOR = 'kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest';

export function shouldKeepPost(t: { text: string; isReply?: boolean; isRetweet?: boolean; hasMedia?: boolean }): boolean {
  const text = t.text.trim();
  if (t.isReply || t.isRetweet) return false;
  if (text.startsWith('@') || /^RT @/i.test(text)) return false;
  if (text.length < 40 && !t.hasMedia) return false;
  return true;
}

async function syncViaApify(supabase: any, token: string, perUser = 8): Promise<SyncResult> {
  const out: SyncResult = { inserted: 0, errors: [] };
  const { data: columnists, error } = await supabase.from('x_columnists').select('id, handle').eq('active', true);
  if (error) {
    out.errors.push(error.message);
    return out;
  }
  if (!columnists?.length) return out;
  const byHandle = new Map<string, string>(columnists.map((c: any) => [String(c.handle).toLowerCase(), c.id as string]));

  const res = await fetch(`https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?timeout=100`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      searchTerms: columnists.map((c: any) => `from:${c.handle} -filter:replies -filter:nativeretweets`),
      maxItems: perUser,
      queryType: 'Latest',
    }),
  });
  if (!res.ok) {
    out.errors.push(`Apify HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 160)}`);
    return out;
  }
  const items: any[] = await res.json().catch(() => []);
  const rows: any[] = [];
  for (const t of Array.isArray(items) ? items : []) {
    const handle = String(t.author?.userName ?? t.author?.screen_name ?? t.user?.screen_name ?? '').toLowerCase();
    const columnistId = byHandle.get(handle);
    const id = String(t.id ?? t.id_str ?? '');
    if (!columnistId || !id) continue;
    const text = String(t.fullText ?? t.text ?? '');
    const media = t.extendedEntities?.media ?? t.entities?.media ?? t.media ?? [];
    const photo = (Array.isArray(media) ? media : []).find((m: any) => m?.type === 'photo' || m?.media_url_https);
    const mediaUrl: string | null = photo?.media_url_https ?? photo?.url ?? null;
    const isRetweet = Boolean(t.isRetweet) || /^RT @/i.test(text);
    if (!shouldKeepPost({ text, isReply: Boolean(t.isReply), isRetweet, hasMedia: Boolean(mediaUrl) })) continue;
    const when = new Date(t.createdAt ?? t.created_at ?? Date.now());
    rows.push({
      columnist_id: columnistId,
      tweet_id: id,
      url: String(t.url ?? t.twitterUrl ?? `https://x.com/${handle}/status/${id}`).replace('twitter.com', 'x.com'),
      text: text.replace(/\s*https:\/\/t\.co\/\w+$/g, '').trim(),
      media_url: mediaUrl,
      posted_at: Number.isNaN(when.getTime()) ? new Date().toISOString() : when.toISOString(),
    });
  }
  if (rows.length) {
    const { error: upErr } = await supabase.from('x_posts').upsert(rows, { onConflict: 'tweet_id' });
    if (upErr) out.errors.push(upErr.message);
    else out.inserted = rows.length;
  } else if (!out.errors.length) {
    out.errors.push(`Apify devolveu ${Array.isArray(items) ? items.length : 0} item(ns), nenhum aproveitavel (respostas/retweets/curtos sao descartados)`);
  }
  return out;
}

export async function syncXColumnists(supabase: any, env: any, perUser = 10): Promise<SyncResult> {
  // Apify (mais barata) tem prioridade; a API oficial do X e' a alternativa
  if (env?.APIFY_TOKEN) return syncViaApify(supabase, String(env.APIFY_TOKEN));
  if (!env?.X_BEARER_TOKEN) return { inserted: 0, errors: ['Configure APIFY_TOKEN (ou X_BEARER_TOKEN) como segredo no Cloudflare.'] };
  return syncViaOfficial(supabase, String(env.X_BEARER_TOKEN), perUser);
}

async function syncViaOfficial(supabase: any, token: string, perUser = 10): Promise<SyncResult> {
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
