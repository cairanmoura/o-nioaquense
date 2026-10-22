// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // URL canonica do portal (usada em canonical, sitemaps e OG tags)
  site: 'https://onioaquense.com',
  // SSR: o portal e' renderizado no servidor (Cloudflare Workers)
  output: 'server',
  adapter: cloudflare({
    // Imagens: sharp roda em tempo de build (o runtime do Cloudflare nao tem sharp).
    // As fotos do portal sao convertidas em WebP e servidas pelo R2/CDN.
    imageService: 'compile',
  }),
  integrations: [react()],
  // Sessoes: o portal usa cookies do Supabase (SSR). O driver 'memory' evita
  // exigir um binding KV do Cloudflare no deploy.
  session: {
    driver: 'memory',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: 'auto',
  },
  devToolbar: {
    enabled: true,
  },
});
