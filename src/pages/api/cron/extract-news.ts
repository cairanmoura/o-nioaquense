import type { APIRoute } from 'astro';

import { getServiceRoleKey, getSupabaseCredentials } from '../../../lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST/GET /api/cron/extract-news
 * -----------------------------------------------------------------------------
 * Disparado pelo cron do Cloudflare (a cada hora) ou manualmente pelo admin.
 * Busca as fontes ativas em `news_sources`, extrai as ultimas materias do RSS,
 * ignora duplicatas (por slug) e insere como `status = 'draft'`.
 *
 * Protegido por `x-cron-secret` (igual a CRON_SECRET) OU sessao admin.
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const secret = request.headers.get('x-cron-secret');
  const expected = (locals as any)?.runtime?.env?.CRON_SECRET ?? '';
  const isCron = !expected || (expected && secret === expected);

  // Se nao for cron e CRON_SECRET estiver configurado, exige sessao admin
  if (!isCron && expected) {
    const session = (locals as any)?.adminUser;
    if (!session || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Nao autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const creds = getSupabaseCredentials(locals);
  const serviceKey = getServiceRoleKey(locals);
  if (!creds || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Supabase nao configurado' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(creds.url, serviceKey, {
    auth: { persistSession: false },
  });

  // Busca fontes ativas
  const { data: sources, error: srcErr } = await supabase
    .from('news_sources')
    .select('*')
    .eq('is_active', true);

  if (srcErr) {
    return new Response(JSON.stringify({ error: srcErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results: { source: string; inserted: number; skipped: number; error?: string }[] = [];

  for (const source of sources ?? []) {
    try {
      const res = await fetch(source.rss_url, {
        headers: { 'User-Agent': 'O-Nioaquense-Bot/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();

      // Extrai itens do RSS (regex simples, compativel com Workers)
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      let inserted = 0;
      let skipped = 0;

      while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];
        const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
          block.match(/<title>(.*?)<\/title>/))?.[1]?.trim();
        const link = (block.match(/<link>(.*?)<\/link>/) ||
          block.match(/<link\s+href="(.*?)"/))?.[1]?.trim();
        const desc = (block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
          block.match(/<description>(.*?)<\/description>/))?.[1]?.trim();

        if (!title || !link) continue;

        // Slug a partir do titulo
        const slug = title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 80);

        // Checa duplicata
        const { data: existing } = await supabase
          .from('articles')
          .select('id')
          .eq('slug', slug)
          .limit(1);

        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }

        // Extrai foto (media:content, enclosure, ou imagem no description)
        let photo: string | null = null;
        const mediaMatch = block.match(/<media:content[^>]*url="([^"]+)"/);
        const encMatch = block.match(/<enclosure[^>]*url="([^"]+)"/);
        const imgMatch = desc?.match(/<img[^>]*src="([^"]+)"/);
        photo = mediaMatch?.[1] ?? encMatch?.[1] ?? imgMatch?.[1] ?? null;

        // Limpa HTML do description
        const cleanDesc = (desc ?? '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 500);

        const article = {
          title: title.slice(0, 200),
          subtitle: null,
          slug,
          summary_bullets: cleanDesc ? [cleanDesc] : [],
          content: `<p>${cleanDesc}</p><p><a href="${link}" target="_blank" rel="noopener">Leia a matéria completa na fonte original.</a></p>`,
          cover_image_url: photo,
          cover_image_caption: photo ? `Foto: ${source.name}` : null,
          scope: source.default_category ?? 'brasil',
          category_label: source.default_category === 'ms' ? 'Agência MS' : 'Agência Brasil',
          is_breaking: false,
          is_featured: false,
          author_id: null,
          status: 'draft',
          views_count: 0,
          published_at: new Date().toISOString(),
          source_name: source.name,
          source_url: link,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: insErr } = await supabase.from('articles').insert(article);
        if (insErr) {
          console.error('Insert error:', insErr.message);
        } else {
          inserted++;
        }
      }

      // Atualiza last_fetched_at
      await supabase
        .from('news_sources')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('id', source.id);

      results.push({ source: source.name, inserted, skipped });
    } catch (err: any) {
      results.push({ source: source.name, inserted: 0, skipped: 0, error: err?.message });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST = GET;
