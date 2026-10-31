import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

import { jsonOk, readPayload, requireSession, toErrorResponse } from '../../../lib/api';
import { isAdmin } from '../../../lib/auth';
import { fetchTweet, fetchXProfile, parseTweetUrl } from '../../../lib/colunas';
import { getServiceRoleKey, getSupabaseCredentials } from '../../../lib/supabase/server';

function client(locals: App.Locals) {
  const creds = getSupabaseCredentials(locals);
  const key = getServiceRoleKey(locals);
  if (!creds || !key) throw new Error('Supabase nao configurado');
  return createClient(creds.url, key, { auth: { persistSession: false } });
}

function guard(locals: App.Locals) {
  const session = requireSession(locals);
  if (!isAdmin(session)) throw new Error('Acesso negado');
}

/** GET: colunistas + ultimos posts (para o painel). */
export const GET: APIRoute = async ({ locals }) => {
  try {
    guard(locals);
    const sb = client(locals);
    const [c, p] = await Promise.all([
      sb.from('x_columnists').select('*').order('sort_order'),
      sb.from('x_posts').select('*').order('posted_at', { ascending: false }).limit(60),
    ]);
    if (c.error) throw new Error(c.error.message + ' (rode a migracao 018)');
    return jsonOk({ columnists: c.data ?? [], posts: p.data ?? [] });
  } catch (err) {
    return toErrorResponse(err);
  }
};

/** POST { action: 'add_posts' | 'add_columnist' | 'refresh_profiles', ... } */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    guard(locals);
    const sb = client(locals);
    const body = (await readPayload(request)) as Record<string, any>;
    const action = String(body.action ?? '');

    if (action === 'add_columnist') {
      const handle = String(body.handle ?? '').replace(/^@/, '').replace(/^.*(?:x|twitter)\.com\//i, '').split(/[/?]/)[0].trim();
      if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) throw new Error('Usuario do X invalido.');
      const prof = await fetchXProfile(handle);
      const { error } = await sb.from('x_columnists').upsert(
        { handle, name: String(body.name || prof?.name || handle), bio: body.bio || prof?.bio || null, avatar_url: prof?.avatar ?? null, sort_order: 10 },
        { onConflict: 'handle' },
      );
      if (error) throw new Error(error.message);
      return jsonOk({ ok: true });
    }

    if (action === 'refresh_profiles') {
      const { data: list } = await sb.from('x_columnists').select('id, handle');
      let n = 0;
      for (const c of list ?? []) {
        const prof = await fetchXProfile(c.handle);
        if (prof) {
          await sb.from('x_columnists').update({ name: prof.name, bio: prof.bio, avatar_url: prof.avatar }).eq('id', c.id);
          n++;
        }
      }
      return jsonOk({ ok: true, updated: n });
    }

    if (action === 'add_posts') {
      const urls: string[] = Array.isArray(body.urls) ? body.urls : String(body.urls ?? '').split(/\s+/);
      const { data: columnists } = await sb.from('x_columnists').select('id, handle');
      const byHandle = new Map((columnists ?? []).map((c: any) => [String(c.handle).toLowerCase(), c.id as string]));
      const results: { url: string; ok: boolean; message?: string }[] = [];
      for (const raw of urls.map((u) => u.trim()).filter(Boolean)) {
        const ref = parseTweetUrl(raw);
        if (!ref) {
          results.push({ url: raw, ok: false, message: 'Link de post do X invalido' });
          continue;
        }
        const columnistId = byHandle.get(ref.handle.toLowerCase());
        if (!columnistId) {
          results.push({ url: raw, ok: false, message: `@${ref.handle} nao e' colunista cadastrado` });
          continue;
        }
        const tw = await fetchTweet(ref.handle, ref.id);
        if (!tw) {
          results.push({ url: raw, ok: false, message: 'Nao foi possivel ler o post (apagado ou privado?)' });
          continue;
        }
        const { error } = await sb.from('x_posts').upsert(
          { columnist_id: columnistId, tweet_id: ref.id, url: `https://x.com/${ref.handle}/status/${ref.id}`, text: tw.text, media_url: tw.media_url, posted_at: tw.posted_at },
          { onConflict: 'tweet_id' },
        );
        results.push(error ? { url: raw, ok: false, message: error.message } : { url: raw, ok: true });
      }
      return jsonOk({ results });
    }

    throw new Error('Acao desconhecida');
  } catch (err) {
    return toErrorResponse(err);
  }
};

/** DELETE ?post=<id> | ?columnist=<id> */
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    guard(locals);
    const sb = client(locals);
    const u = new URL(request.url);
    const post = u.searchParams.get('post');
    const columnist = u.searchParams.get('columnist');
    if (post) await sb.from('x_posts').delete().eq('id', post);
    else if (columnist) await sb.from('x_columnists').delete().eq('id', columnist);
    else throw new Error('Informe post ou columnist');
    return jsonOk({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
};
