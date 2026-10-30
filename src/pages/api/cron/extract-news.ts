import type { APIRoute } from 'astro';

import { getServiceRoleKey, getSupabaseCredentials, createSupabaseServerClient } from '../../../lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { runAI } from '../../../lib/ai';
import {
  extractRssImage,
  fetchHtmlCoverImage,
  getArteFallback,
  isPhotoCover,
  detectLocalTags,
  routeScope,
  detectCategory,
  REGION_CITIES,
  normCity,
  fetchArticleContent,
  stripHtml,
  isGoogleNewsFeed,
  parseGoogleNewsItems,
  resolveGoogleNewsUrl,
  discoverSitemapUrls,
  fetchGoogleNewsFeed,
  isBingNewsFeed,
  parseBingNewsItems,
} from '../../../lib/rss';
import { fetchPageHtml, extractArticleLinks, parseArticlePage, BROWSER_HEADERS } from '../../../lib/scraper';

import { cleanTitle } from '../../../lib/format';
import { refreshDollarQuote, refreshAgroQuotes } from '../../../lib/quotes';
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
    let session = (locals as any)?.adminUser;

    // Se o middleware nao resolveu a sessao (ex.: rotas /api/cron antes do ajuste),
    // tentamos resolver manualmente usando o cookie sb-...-auth-token do Supabase.
    if (!session || session.role !== 'admin') {
      // 2a) Token enviado explicitamente pelo cliente no header x-user-token.
      // Mais confiavel do que depender do cookie no Worker (que nem sempre chega parseado).
      try {
        const userToken = request.headers.get('x-user-token');
        if (userToken) {
          const { url } = getSupabaseCredentials(locals) ?? {};
          const serviceKey = getServiceRoleKey(locals);
          if (url && serviceKey) {
            const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
            const { data } = await adminClient.auth.getUser(userToken);
            if (data?.user) {
              const { data: profile } = await adminClient
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .maybeSingle();
              if (profile && profile.role === 'admin' && profile.active) {
                session = { id: profile.id, role: profile.role };
              }
            }
          }
        }
      } catch {
        // ignora
      }
    }

    if (!session || session.role !== 'admin') {
      try {
        const supabase = createSupabaseServerClient({
          request,
          cookies: {
            getAll() {
              const cookieHeader = request.headers.get('cookie') ?? '';
              return cookieHeader
                .split(';')
                .map((part) => part.trim())
                .filter(Boolean)
                .map((part) => {
                  const sep = part.indexOf('=');
                  if (sep === -1) return { name: part, value: '' };
                  return {
                    name: part.slice(0, sep).trim(),
                    value: part.slice(sep + 1).trim(),
                  };
                });
            },
            setAll() {},
          },
          locals,
        } as any);

        if (!supabase) throw new Error('sem supabase');

        const {
          data: { session: supabaseSession },
        } = await supabase.auth.getSession();

        if (supabaseSession?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseSession.user.id)
            .maybeSingle();

          if (profile && profile.role === 'admin' && profile.active) {
            session = {
              id: supabaseSession.user.id,
              email: supabaseSession.user.email ?? '',
              profile: {
                id: profile.id,
                full_name: profile.full_name ?? '',
                slug: profile.slug ?? '',
                role: profile.role as 'admin' | 'columnist',
                column_name: profile.column_name ?? null,
                bio: profile.bio ?? null,
                avatar_url: profile.avatar_url ?? null,
                social_links: profile.social_links ?? {},
                can_publish_directly: profile.can_publish_directly ?? false,
                active: profile.active ?? false,
              },
              isDemo: false,
            };
          }
        }
      } catch {
        // ignora erro de resolucao manual de sessao
      }
    }

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
    type?: 'rss' | 'scraper';
    inserted: number;
    skipped: number;
    rewritten: number;
    error?: string;
    insert_errors?: string[];
  }[] = [];

  const DEFAULT_AUTHOR_ID = '10000000-0000-4000-8000-000000000001';

  // Verifica uma unica vez se o autor padrao existe (evita quebrar a FK)
  const { data: authorRow } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', DEFAULT_AUTHOR_ID)
    .maybeSingle();
  const authorIdToUse = authorRow ? DEFAULT_AUTHOR_ID : null;

  // Orcamento global de inserts por invocacao: o plano Workers free permite
  // ~50 subrequests por invocacao. Cada materia nova custa 1-2 fetches +
  // 2 chamadas de IA + 1 insert (~5 subrequests). Com folga, limitamos a 6
  // inserts por execucao — o cron horario continua pegando o restante nas
  // proximas rodadas.
  const MAX_TOTAL_INSERTS = 6;
  let globalInserted = 0;

  for (const source of sources ?? []) {
    if (globalInserted >= MAX_TOTAL_INSERTS) {
      results.push({
        source: source.name,
        inserted: 0,
        skipped: 0,
        rewritten: 0,
        error: 'Adiada: orcamento de inserts da execucao atingido',
      });
      continue;
    }
    try {
      const isScraper = (source.source_type ?? 'rss') === 'html_scraper';

      // Item normalizado: vem do RSS (bloco XML) ou do scraper (pagina HTML)
      interface ExtractEntry {
        title: string;
        link: string;
        rawDesc: string | null;
        pubDate: string | null;
        /** Bloco XML do item RSS (usado para extrair midia do feed). */
        rssBlock?: string;
        /** Dados ja extraidos pelo scraper (imagem/conteudo da pagina). */
        scrapedCover?: string | null;
        scrapedCaption?: string | null;
        scrapedContent?: string;
        /** true quando o link e' um redirect do Google News (resolver antes de usar). */
        needsResolution?: boolean;
        /** true quando o link ja e' a URL real, mas a pagina precisa ser baixada
         *  para extrair og:image + conteudo (Bing News). */
        needsPageFetch?: boolean;
        /** URL do portal de origem declarada em <source url="..."> do Google News. */
        sourceUrlHint?: string | null;
      }

      const entries: ExtractEntry[] = [];

      if (isScraper) {
        // --- Web Scraper: raspa a pagina inicial, checa quais links ja
        //     existem no banco (1 query em lote) e baixa SÓ as materias novas
        //     (cada pagina baixada = 1 subrequest do Workers free) ---
        const homeHtml = await fetchPageHtml(source.rss_url);
        if (!homeHtml) throw new Error(`Falha ao baixar a pagina inicial de ${source.name}`);

        const links = await extractArticleLinks(homeHtml, source.rss_url, 12);

        let existingUrlSet = new Set<string>();
        if (links.length > 0) {
          const { data: urlRows } = await supabase
            .from('articles')
            .select('source_url')
            .in('source_url', links);
          existingUrlSet = new Set((urlRows ?? []).map((r: any) => r.source_url));
        }

        for (const link of links) {
          if (existingUrlSet.has(link)) continue; // ja publicada

          const html = await fetchPageHtml(link);
          if (!html) continue;

          const parsed = parseArticlePage(html, link, source.name);
          if (!parsed?.title) continue;

          entries.push({
            title: parsed.title,
            link: parsed.link,
            rawDesc: parsed.description || null,
            pubDate: parsed.pubDate,
            scrapedCover: parsed.coverImageUrl,
            scrapedCaption: parsed.coverImageCaption,
            scrapedContent: parsed.contentHtml,
          });

          // Orcamento de paginas novas por fonte/invocacao
          if (entries.length >= 3) break;
        }
      } else {
        // --- RSS / Bing News / Google News: busca e parseia o XML do feed ---
        // Usa headers de navegador completo (anti-bot: Cloudflare devolve 503/530
        // para clientes com poucos headers).
        const isGoogleNews = isGoogleNewsFeed(source.rss_url);
        const isBingNews = isBingNewsFeed(source.rss_url);
        let xml = '';
        if (isGoogleNews) {
          // Google News: fetch direto com cascata de proxies (Workers da
          // Cloudflare podem ser bloqueados com 503 pelo Google).
          xml = await fetchGoogleNewsFeed(source.rss_url, 20);
        } else {
          // RSS classico e Bing News: fetch direto (Bing aceita datacenter)
          try {
            const res = await fetch(source.rss_url, {
              headers: {
                ...BROWSER_HEADERS,
                Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
              },
            });
            if (res.ok) xml = await res.text();
          } catch {
            // falha de rede — tenta o fallback de sitemap abaixo
          }
        }

        if (isGoogleNews && xml) {
          // --- Google News: itens com link de redirect; resolver por materia ---
          for (const item of parseGoogleNewsItems(xml, 20)) {
            entries.push({
              title: item.title,
              link: item.link,
              rawDesc: null,
              pubDate: item.pubDate,
              needsResolution: true,
              sourceUrlHint: item.sourceUrl,
            });
          }
        } else if (isBingNews && xml) {
          // --- Bing News: link JA resolvido (URL real da materia no portal);
          // nao precisa de resolucao, apenas baixa a pagina na Fase 3 ---
          for (const item of parseBingNewsItems(xml, 15)) {
            entries.push({
              title: item.title,
              link: item.link,
              rawDesc: item.description ?? null,
              pubDate: item.pubDate,
              needsPageFetch: true,
            });
          }
        } else if (xml && /<item\b/i.test(xml)) {
          // --- RSS classico: parseia os blocos <item> do XML ---
          const itemRegex = /<item\b([\s\S]*?)<\/item>/gi;
          let match;
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

            entries.push({ title, link, rawDesc: rawDesc ?? null, pubDate: pubDate ?? null, rssBlock: block });
          }
        }

        // --- Fallback: feed falhou ou nao tem itens -> tenta Sitemap XML ---
        // Le /robots.txt do dominio a procura de news-sitemap.xml / sitemap.xml
        // e extrai as URLs das materias recentes.
        if (entries.length === 0) {
          const sitemapUrls = await discoverSitemapUrls(source.rss_url, 12);
          const newUrls = sitemapUrls.slice(0, 6);

          for (const smUrl of newUrls) {
            if (entries.length >= 3) break;

            const html = await fetchPageHtml(smUrl);
            if (!html) continue;

            const parsed = parseArticlePage(html, smUrl, source.name);
            if (!parsed?.title) continue;

            entries.push({
              title: parsed.title,
              link: parsed.link,
              rawDesc: parsed.description || null,
              pubDate: parsed.pubDate,
              scrapedCover: parsed.coverImageUrl,
              scrapedCaption: parsed.coverImageCaption,
              scrapedContent: parsed.contentHtml,
            });
          }

          if (entries.length === 0) {
            throw new Error(
              xml ? 'Feed sem itens e sitemap sem URLs de materias' : `HTTP do feed falhou e sitemap sem materias`,
            );
          }
        }
      }

      let inserted = 0;
      let skipped = 0;
      let rewritten = 0;
      const insertErrors: string[] = [];

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

      // --- Fase 1: filtro de palavras-chave + slug (sem I/O) ---
      interface Candidate {
        entry: ExtractEntry;
        title: string;
        link: string;
        rawDesc: string | null;
        pubDate: string | null;
        scrapedText: string;
        slug: string;
      }

      const candidates: Candidate[] = [];
      for (const entry of entries) {
        const { title, link, rawDesc, pubDate } = entry;

        // Texto do corpo (scraper ja extraiu; RSS pode buscar depois)
        const scrapedText = entry.scrapedContent ? stripHtml(entry.scrapedContent) : '';

        // Filtro de palavras-chave: titulo, descricao ou corpo da materia.
        // Itens do Google News nao checam aqui: o corpo ainda nao foi baixado
        // (a resolucao do redirect acontece na Fase 3); eles checam la.
        if (!entry.needsResolution) {
          if (
            !matchesKeywords(title) &&
            !(rawDesc && matchesKeywords(rawDesc)) &&
            !(scrapedText && matchesKeywords(scrapedText))
          ) {
            skipped++;
            continue;
          }
        }

        // Slug a partir do titulo
        const slug = title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 80);

        candidates.push({ entry, title, link, rawDesc, pubDate, scrapedText, slug });
      }

      // --- Fase 2: dup-check em LOTE (1 query por fonte, nao por item) ---
      let existingSlugs = new Set<string>();
      if (candidates.length > 0) {
        const uniqueSlugs = [...new Set(candidates.map((c) => c.slug))];
        const { data: dupRows } = await supabase
          .from('articles')
          .select('slug')
          .in('slug', uniqueSlugs);
        existingSlugs = new Set((dupRows ?? []).map((r: any) => r.slug));
      }

      // --- Fase 3: processa no MAXIMO MAX_NEW_PER_SOURCE itens novos por
      //     fonte por invocacao (economiza subrequests do plano free: cada
      //     item novo custa 1-2 fetches + 2 chamadas de IA + 1 insert) ---
      const MAX_NEW_PER_SOURCE = 3;

      for (const c of candidates) {
        const budgetLeft = Math.min(
          MAX_NEW_PER_SOURCE - inserted,
          MAX_TOTAL_INSERTS - globalInserted,
        );
        if (budgetLeft <= 0) {
          // Itens novos excederam o orcamento; os restantes ficam para a
          // proxima execucao (nao sao "skipped" — sao adiados).
          break;
        }
        const { entry, slug } = c;

        if (existingSlugs.has(slug)) {
          skipped++;
          continue;
        }

        // --- Google News / Bing News: baixa a pagina real da materia ---
        // Google News: resolve o redirect antes (1 fetch de resolucao a mais).
        // Bing News: o link ja e' a URL real; apenas baixa a pagina.
        // Custo: 1-2 fetches por item novo.
        if (entry.needsResolution) {
          const resolved = await resolveGoogleNewsUrl(entry.link);
          if (!resolved) {
            // Nao conseguiu resolver o redirect — descarta o item
            skipped++;
            continue;
          }
          entry.link = resolved;
        }

        if (entry.needsResolution || entry.needsPageFetch) {
          // Baixa a pagina real para extrair og:image + conteudo completo
          const html = await fetchPageHtml(entry.link);
          if (html) {
            const parsed = parseArticlePage(html, entry.link, source.name);
            if (parsed) {
              entry.scrapedCover = parsed.coverImageUrl;
              entry.scrapedCaption = parsed.coverImageCaption;
              entry.scrapedContent = parsed.contentHtml;
              c.scrapedText = stripHtml(parsed.contentHtml);
              // Usa o titulo real do portal (mais preciso que o do agregador)
              if (parsed.title && parsed.title.length >= 10) {
                c.title = parsed.title;
              }
            }
          }
        }

        const { title, link, rawDesc, pubDate, scrapedText } = c;

        // Filtro de palavras-chave pos-download (itens do Google/Bing News:
        // o corpo so' existe depois de baixar a pagina)
        if (entry.needsResolution || entry.needsPageFetch) {
          if (
            !matchesKeywords(title) &&
            !(rawDesc && matchesKeywords(rawDesc)) &&
            !(scrapedText && matchesKeywords(scrapedText))
          ) {
            skipped++;
            continue;
          }
        }

        // --- Classificacao geografica: local_tags + scope ---
        const fullText = `${title} ${rawDesc ?? ''} ${scrapedText.slice(0, 3000)}`;
        const localTags = detectLocalTags(fullText);
        const scope = routeScope(localTags, source.name ?? '') as ArticleScope;

        // --- Extracao de imagem real (scraper ja extraiu og:image; RSS extrai midia do feed) ---
        let coverImage: string | null = null;
        let coverCaption: string | null = null;

        if (source.use_original_image) {
          if (entry.scrapedCover && /^https?:\/\//i.test(entry.scrapedCover)) {
            // Scraper ou Google News resolvido: og:image ja extraida da pagina
            coverImage = entry.scrapedCover;
            coverCaption = entry.scrapedCaption ?? `Foto: Reproducao / ${source.name}`;
          } else if (!isScraper) {
            const rssImage = entry.rssBlock ? extractRssImage(entry.rssBlock, source.rss_url) : undefined;
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
              finalTitle = cleanTitle(rewriteRes.text.trim().slice(0, 200)) || cleanTitle(title) || title;
              rewritten++;
            }

            const descText = rawDesc ?? (scrapedText ? scrapedText.slice(0, 2000) : title);
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
          const cleanDesc = (rawDesc ?? scrapedText)
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          summaryBullets = cleanDesc ? [cleanDesc.slice(0, 160)] : [];
        }

        // --- Categoria tematica (editoria) ---
        const categoryLabel = detectCategory(finalTitle);

        // --- Corpo da materia: scraper/Google News ja extraiu; RSS busca na URL original ---
        let fullContent = '';
        if (entry.scrapedContent) {
          fullContent = entry.scrapedContent ?? '';
        } else if (!isScraper && source.use_original_image) {
          try {
            fullContent = await fetchArticleContent(link, source.rss_url);
          } catch {
            // ignora erro de extracao de conteudo completo
          }
        }

        let content: string;
        if (fullContent) {
          // Conteudo completo extraido da fonte original (ja vem com imagens limpas)
          content = `<p>${finalTitle}</p>${fullContent}`;
        } else {
          // Fallback: so descricao do RSS + link para a materia original
          content = `<p>${finalTitle}</p>`;
          if (rawDesc) {
            const cleanDesc = (rawDesc ?? '')
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 2000);
            content += `<p>${cleanDesc}</p>`;
          }
        }

        content += `<p><br/></p><p>Fonte: <a href="${link}" target="_blank" rel="noopener noreferrer">${source.name}</a>.</p>`;

        // --- Status: publicado direto ou rascunho ---
        const now = new Date().toISOString();
        const status = source.auto_publish ? 'published' : 'draft';
        const publishedAt = source.auto_publish
          ? pubDate
            ? new Date(pubDate).toISOString()
            : now
          : null;

        const article = {
          title: (cleanTitle(finalTitle) || finalTitle).slice(0, 200),
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
          author_id: authorIdToUse,
          status,
          views_count: 0,
          published_at: publishedAt,
          source_name: source.name,
          source_url: link,
          created_at: now,
          updated_at: now,
        };

        let payload: Record<string, unknown> = { ...article };
        let insErr: { message: string } | null = null;
        // Resiliencia a migracoes nao aplicadas no banco: se o PostgREST
        // reclamar de coluna inexistente ("Could not find the 'X' column"),
        // remove a coluna do payload e tenta de novo (ate 6 colunas).
        for (let attempt = 0; attempt < 6; attempt++) {
          const res = await supabase.from('articles').insert(payload);
          insErr = res.error;
          if (!insErr) break;
          const colMatch = insErr.message.match(/Could not find the '([^']+)' column/);
          if (colMatch) {
            delete payload[colMatch[1]];
            continue;
          }
          // Enum article_scope sem o valor 'regiao' (migracao 007 pendente)
          if (/scope|regiao/.test(insErr.message) && payload.scope && payload.scope !== 'ms') {
            payload.scope = 'ms';
            continue;
          }
          break;
        }
        if (insErr) {
          console.error('Insert error:', insErr.message);
          insertErrors.push(`${title.slice(0, 60)}: ${insErr.message}`);
        } else {
          inserted++;
          globalInserted++;
        }
      }

      await supabase
        .from('news_sources')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('id', source.id);

      results.push({
        source: source.name,
        type: isScraper ? 'scraper' : 'rss',
        inserted,
        skipped,
        rewritten,
        ...(insertErrors.length ? { insert_errors: insertErrors.slice(0, 3) } : {}),
      });
    } catch (err: any) {
      results.push({ source: source.name, inserted: 0, skipped: 0, rewritten: 0, error: err?.message });
    }
  }

  // Totais agregados para o frontend mostrar um resumo
  const totals = results.reduce(
    (acc, r) => ({
      inserted: acc.inserted + (r.inserted ?? 0),
      skipped: acc.skipped + (r.skipped ?? 0),
      rewritten: acc.rewritten + (r.rewritten ?? 0),
    }),
    { inserted: 0, skipped: 0, rewritten: 0 },
  );

  await refreshDollarQuote(supabase);
  await refreshAgroQuotes(supabase);

  return new Response(JSON.stringify({ ok: true, ...totals, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST = GET;
