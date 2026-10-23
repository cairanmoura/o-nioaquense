import { App } from 'astro/app';
// @ts-ignore
import { handle } from '../node_modules/@astrojs/cloudflare/dist/utils/handler.js';

// O manifest e' injetado pelo Astro em tempo de build.
export function createExports(manifest: any) {
  const app = new App(manifest);

  const fetch = async (request: any, env: any, context: any) => {
    return await handle(manifest, app, request, env, context);
  };

  const scheduled = async (_event: any, env: any, ctx: any) => {
    const base = 'https://o-nioaquense.o-nioaquense.workers.dev';
    ctx.waitUntil(
      (globalThis as any).fetch(`${base}/api/cron/extract-news`, {
        headers: { 'x-cron-secret': env?.CRON_SECRET ?? '' },
      }).then(async (res: any) => {
        console.log('cron extract-news:', res.status, await res.text());
      }),
    );
  };

  return { default: { fetch }, scheduled };
}
