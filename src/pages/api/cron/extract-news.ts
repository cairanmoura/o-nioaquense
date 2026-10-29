import type { APIRoute } from 'astro';

import { getServiceRoleKey, getSupabaseCredentials } from '../../../lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { runAI } from '../../../lib/ai';
import {
  extractRssImage,
  fetchHtmlCoverImage,
  extractInternalImages,
  getArteFallback,
  isPhotoCover,
  detectLocalTags,
  routeScope,
  detectCategory,
  REGION_CITIES,
  normCity,
} from '../../../lib/rss';

import type { ArticleScope } from '../../../lib/types';

/**
 * POST/GET /api/cron/extract-news
 * -----------------------------------------------------------------------------
 * Disparado pelo cron do Cloudflare (a cada hora) ou manualmente pelo admin
 * via /admin/fontes ("Executar Extracao Agora").
 *
 * Busca as fontes ativas em `news_sources`, extrai as ultimas materias do RSS,
 * aplica filtro de palavras-chave, classifica geograficamente (scope + local_tags)
 * pelo conteudo, extrai a foto real da materia original, opcionalmente reescreve
 * com IA e insere como `status = 'published'` (auto_publish) ou `status = 'draft'`.
 *
 * Protegido por `x-cron-secret` (igual a CRON_SECRET) OU sessao admin.
 */

/* -------------------------------------------------------------------------- */
/* Handler principal                                                          */
/* -------------------------------------------------------------------------- */

export const GET: APIRoute = async ({ request, locals }) => {
  const secret = request.headers.get('x-cron-secret');
  const expected = (locals as any)?.runtime?.env?.CRON_SECRET ?? '';
  const isCron = !expected || (expected && secret === expected);

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

  const { data: sources, error: srcErr } = await supabase
    .from('news_sources')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (srcErr) {
    return new Response(JSON.stringify({ error: srcErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const env = (locals as any)?.runtime?.env ?? {};
  const results: {
    source: string;
    inserted: number;
    skipped: number;
    rewritten: number;
    error?: string;
  }[] = [];

  const DEFAULT_AUTHOR_ID = '10000000-0000-4000-8000-000000000001';

  for (const source of sources ?? []) {
    try {
      const res = await fetch(source.rss_url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();

      const itemRegex = /<item\b[\s\S]*?<\/item>/gi;
      let match;
      let inserted = 0;
      let skipped = 0;
      let rewritten = 0;

      // Filtro de palavras-chave (se configurado na fonte)
      const keywords: string[] =
        (source.keywords_filter
          ?.split(',')
          .map((k: string) => k.trim())
          .filter(Boolean)
          .map((k: string) => k.toLowerCase()) ?? []);

      const matchesKeywords = (text: string): boolean => {
        if (keywords.length === 0) return true;
        const lower = text.toLowerCase();
        return keywords.some((k) => lower.includes(k));
      };

      while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1];
        const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
          block.match(/<title>(.*?)<\/title>/))?.[1]?.trim();
        const link = (block.match(/<link>(.*?)<\/link>/) ||
          block.match(/<link\s+href="(.*?)"/))?.[1]?.trim();
        const rawDesc = (block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/) ||
          block.match(/<description>(.*?)<\/description>/))?.[1]?.trim();
        const pubDate = (block.match(/<pubDate>(.*?)<\/pubDate>/))?.[1]?.trim();

        if (!title || !link) continue;

        // Filtro de palavras-chave: titulo e descricao
        if (!matchesKeywords(title) || (rawDesc && !matchesKeywords(rawDesc))) {
          skipped++;
          continue;
        }

        // Slug a partir do titulo
        const slug = title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 80);

        // Checa duplicata por slug
        const { data: existing } = await supabase
          .from('articles')
          .select('id')
          .eq('slug', slug)
          .limit(1);

        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }

        // --- Classificacao geografica: local_tags + scope ---
        const fullText = `${title} ${rawDesc ?? ''}`;
        const localTags = detectLocalTags(fullText);
        const scope = routeScope(localTags, source.name ?? '') as ArticleScope;

        // --- Extracao de imagem real (prioridade: RSS -> HTML og:image) ---
        let coverImage: string | null = null;
        let coverCaption: string | null = null;

        if (source.use_original_image) {
          const rssImage = extractRssImage(block, source.rss_url);
          if (rssImage) {
            coverImage = rssImage;
            coverCaption = `Foto: Reproducao / ${source.name}`;
          }
          if (!coverImage) {
            const htmlCover = await fetchHtmlCoverImage(link, source.rss_url);
            if (htmlCover.url) {
              coverImage = htmlCover.url;
              coverCaption = htmlCover.caption ?? `Foto: Reproducao / ${source.name}`;
            }
          }
        }

        if (!coverImage || !isPhotoCover(coverImage)) {
          coverImage = getArteFallback(scope);
          coverCaption = null;
        }

        // --- IA: reescrever título e gerar 3 bullets (se ai_rewrite = true) ---
        let finalTitle = title;
        let summaryBullets: string[] = [];

        // Instrucao dinamica quando Nioaque aparece com outras cidades da regiao
        const hasNioaqueAndRegion =
          localTags.some((t) => normCity(t) === normCity('Nioaque')) &&
          localTags.length > 1;
        const nioaqueRegionInstruction = hasNioaqueAndRegion
          ? '\nImportante: Esta notícia cita Nioaque e outras cidades da região. Ao reescrever, puxe o foco narrativo do título e do primeiro parágrafo para o impacto local em Nioaque e sua conexão com as cidades vizinhas.'
          : '';

        if (source.ai_rewrite) {
          try {
            const rewriteRes = await runAI(
              `Reescreva o seguinte título de notícia de forma inédita e imparcial, mantendo os fatos.${nioaqueRegionInstruction}\n\nRetorne APENAS o título reescrito, sem aspas, sem texto adicional.\n\nTítulo original: ${title}`,
              env,
            );
            if (rewriteRes.text.trim()) {
              finalTitle = rewriteRes.text.trim().slice(0, 200);
              rewritten++;
            }

            const descText = rawDesc ?? title;
            const bulletsRes = await runAI(
              `Leia o texto abaixo e crie EXATAMENTE 3 tópicos curtos (máximo 15 palavras cada) para o "Direto ao Ponto" de uma notícia.${nioaqueRegionInstruction}\n\nRetorne APENAS os 3 tópicos, um por linha, sem numeração, sem bullets, sem marcadores, sem texto adicional.\n\nTexto: ${descText}`,
              env,
            );
            summaryBullets = bulletsRes.text
              .split('\n')
              .map((line) => line.replace(/^[-•\*\d.\s]+/, '').trim())
              .filter((line) => line.length > 0)
              .slice(0, 3);
          } catch (aiErr) {
            console.warn(`IA falhou para "${title}":`, aiErr);
          }
        }

        if (summaryBullets.length === 0) {
          const cleanDesc = (rawDesc ?? '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          summaryBullets = cleanDesc ? [cleanDesc.slice(0, 160)] : [];
        }

        // --- Categoria tematica (editoria) ---
        const categoryLabel = detectCategory(finalTitle);

        // --- Corpo da materia (preserva fotos internas da materia original) ---
        let content = `<p>${finalTitle}</p>`;
        if (rawDesc) {
          const cleanDesc = (rawDesc ?? '')
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 2000);
          content += `<p>${cleanDesc}</p>`;
        }

        if (source.use_original_image && coverImage) {
          try {
            const pageRes = await fetch(link, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
              },
            } as RequestInit);
            if (pageRes.ok) {
              const html = await pageRes.text();
              const internal = extractInternalImages(html, source.rss_url, source.name ?? '');
              for (const img of internal) {
                if (img.url === coverImage) continue;
                content += `<figure><img src="${img.url}" alt="${img.caption}" referrerpolicy="no-referrer" loading="lazy" /><figcaption>${img.caption}</figcaption></figure>`;
              }
            }
          } catch {
            // ignora erro de extracao de fotos internas
          }
        }

        content += `<p><br/></p><p>Leia a materia completa na <a href="${link}" target="_blank" rel="noopener noreferrer">${source.name}</a>.</p>`;

        // --- Status: publicado direto ou rascunho ---
        const now = new Date().toISOString();
        const status = source.auto_publish ? 'published' : 'draft';
        const publishedAt = source.auto_publish
          ? pubDate
            ? new Date(pubDate).toISOString()
            : now
          : null;

        const article = {
          title: finalTitle.slice(0, 200),
          subtitle: null,
          slug,
          summary_bullets: summaryBullets,
          content,
          cover_image_url: coverImage,
          cover_image_caption: coverCaption,
          scope,
          local_tags: localTags,
          category_label: categoryLabel,
          is_breaking: false,
          is_featured: false,
          author_id: DEFAULT_AUTHOR_ID,
          status,
          views_count: 0,
          published_at: publishedAt,
          source_name: source.name,
          source_url: link,
          created_at: now,
          updated_at: now,
        };

        const { error: insErr } = await supabase.from('articles').insert(article);
        if (insErr) {
          console.error('Insert error:', insErr.message);
        } else {
          inserted++;
        }
      }

      await supabase
        .from('news_sources')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('id', source.id);

      results.push({ source: source.name, inserted, skipped, rewritten });
    } catch (err: any) {
      results.push({ source: source.name, inserted: 0, skipped: 0, rewritten: 0, error: err?.message });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST = GET;
