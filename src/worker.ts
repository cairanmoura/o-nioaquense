import { App } from 'astro/app';
// @ts-ignore
import { handle } from '../node_modules/@astrojs/cloudflare/dist/utils/handler.js';
import { syncXColumnists } from './lib/xsync';
import {
  enqueueJobs,
  makeServiceClient,
  processEntry,
  refreshQuotes,
  runSourceJob,
  sweepSources,
  type NewsJob,
} from './lib/pipeline';

// O manifest e' injetado pelo Astro em tempo de build.
export function createExports(manifest: any) {
  const app = new App(manifest);

  const fetch = async (request: any, env: any, context: any) => {
    return await handle(manifest, app, request, env, context);
  };

  /**
   * Cron: so enfileira UMA mensagem (`sweep`). Nao baixa nada, nao toca no
   * banco: custo de CPU ~0, entao cabe folgado nos 10 ms do plano gratis.
   */
  const scheduled = async (_event: any, env: any, _ctx: any) => {
    if (!env?.NEWS_QUEUE) {
      console.error('cron: binding NEWS_QUEUE ausente (confira wrangler.toml)');
      return;
    }
    await env.NEWS_QUEUE.send({ type: 'sweep' } satisfies NewsJob);
  };

  /**
   * Consumidor da fila (max_batch_size = 1): uma tarefa pequena por invocacao.
   * Falha temporaria -> retry com espera; depois de max_retries vai para a DLQ
   * (a materia nao se perde: a proxima varredura a descobre de novo).
   */
  const queue = async (batch: any, env: any, _ctx: any) => {
    const supabase = makeServiceClient(env);
    for (const msg of batch.messages) {
      const job = msg.body as NewsJob;
      try {
        if (!supabase) {
          console.error('queue: Supabase nao configurado');
          msg.ack();
          continue;
        }

        if (job.type === 'sweep') {
          const sources = await sweepSources(supabase);
          const jobs: NewsJob[] = sources.map((s) => ({ type: 'source', sourceId: s.id, backfill: job.backfill }));
          jobs.push({ type: 'quotes' });
          if (env.X_BEARER_TOKEN) jobs.push({ type: 'xposts' });
          // fontes escalonadas de 8 em 8 s: nao disparam todas juntas
          await enqueueJobs(env.NEWS_QUEUE, jobs, 8);
          console.log(`sweep: ${sources.length} fonte(s) enfileirada(s)`);
          msg.ack();
        } else if (job.type === 'source') {
          const r = await runSourceJob(supabase, env.NEWS_QUEUE, job.sourceId, Boolean(job.backfill));
          console.log(`source ${job.sourceId}: ${r.queued} nova(s), ${r.skipped} ignorada(s)`);
          msg.ack();
        } else if (job.type === 'article') {
          const { data: source } = await supabase.from('news_sources').select('*').eq('id', job.sourceId).maybeSingle();
          if (!source) {
            msg.ack();
            continue;
          }
          const out = await processEntry(supabase, env, source, job.entry);
          console.log(`article [${out.status}] ${out.title ?? job.entry.link} ${out.reason ?? ''}`);
          if (out.status === 'retry') msg.retry({ delaySeconds: 60 * Math.max(1, msg.attempts ?? 1) });
          else msg.ack();
        } else if (job.type === 'xposts') {
          const r = await syncXColumnists(supabase, env.X_BEARER_TOKEN);
          console.log(`xposts: ${r.inserted} novo(s)`, r.errors.join(' | '));
          msg.ack();
        } else if (job.type === 'quotes') {
          await refreshQuotes(supabase);
          msg.ack();
        } else {
          msg.ack();
        }
      } catch (err: any) {
        console.error('queue: erro', job?.type, err?.message ?? err);
        msg.retry({ delaySeconds: 30 });
      }
    }
  };

  return { default: { fetch, scheduled, queue }, scheduled, queue };
}
