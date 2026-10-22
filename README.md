# O Nioaquense

Portal de notícias hiperlocal de **Nioaque (MS)**, com cobertura do Sul de Mato Grosso do Sul e do Brasil.

- **Site:** https://onioaquense.com
- **Stack:** Astro 5 (SSR) · Cloudflare Workers · Tailwind CSS v4 · React (ilhas) · Supabase

---

## Etapa 1 — Fundação (status: concluída)

| # | Entrega | Onde está |
|---|---------|-----------|
| 1 | Projeto Astro SSR + `@astrojs/cloudflare` + Tailwind + React + clientes Supabase | `astro.config.mjs`, `package.json`, `src/lib/supabase/*` |
| 2 | Cores oficiais da bandeira + fontes Google (Newsreader / Plus Jakarta Sans) | `src/styles/global.css` (bloco `@theme`) |
| 3 | Componente `<LogoNioaquense />` em SVG responsivo | `src/components/LogoNioaquense.astro` |
| 4 | Banco PostgreSQL com RLS completo | `supabase/migrations/001_initial_schema.sql` |
| 5 | Dados mock/seed | `src/lib/mock-data.ts`, `supabase/seed.sql` |

---

## Etapa 2 — Layout principal, serviços, anúncios e Home (status: concluída)

| # | Entrega | Onde está |
|---|---------|-----------|
| 1 | `MainLayout` + `Header` (logo, editorias, "Mande sua Notícia", busca rápida) | `src/layouts/MainLayout.astro`, `src/components/Header.astro` |
| 2 | Barra fixa de utilidade pública (farmácia, clima Open-Meteo, ônibus, alerta) | `src/components/NioaqueServiceBar.astro`, `src/lib/weather.ts` |
| 3 | Monetização sem CLS (AdSense + anúncios locais + rota de clique) | `src/components/{GoogleAdSlot,LocalAdBanner,LocalDailyDeal}.astro`, `src/lib/ads.ts`, `src/pages/api/ads/click/[id].ts` |
| 4 | Home editorial (manchete, submanchetes, colunistas, Radar Oficial, MS, Brasil) | `src/pages/index.astro` + componentes auxiliares |
| 5 | Busca do portal | `src/pages/busca.astro` |

### Barra de utilidade pública

Fica fixa logo abaixo do cabeçalho e, no celular, desliza na horizontal.

- **Farmácia de plantão** — nome, botão *ligar* (`tel:`) e botão *WhatsApp*;
- **Clima em tempo real** — Open-Meteo (lat `-21.1353`, lon `-55.8300`), cache de 15 min na borda
  (`locals.runtime.caches`), com fallback offline; os códigos WMO viram rótulos e ícones;
- **Horários de ônibus** — atalho para o painel `#servicos`;
- **Alerta da cidade** — aparece no topo em **vermelho** (`urgent`) ou **amarelo** (`warning`)
  quando `public_utilities.alert_active = true`.

### Monetização (zero CLS)

Todo slot reserva a altura mínima **antes** do criativo carregar (`src/lib/ads.ts`):

| Slot | Altura reservada |
|------|------------------|
| `header_billboard` | 160px |
| `home_middle` | 220px |
| `article_inline` | 280px |
| `sidebar` | 260px |
| `daily_deal` | 340px |
| AdSense leaderboard / rectangle / horizontal | 120px / 280px / 140px |

Sem `PUBLIC_GOOGLE_ADSENSE_CLIENT` configurado, o `<GoogleAdSlot />` renderiza um placeholder
com a **mesma** altura — o layout não muda entre dev e produção.

**Contagem de clique:** o botão "Chamar no WhatsApp" nunca aponta direto para o anunciante.
Ele passa por `GET /api/ads/click/[id]`, que incrementa `clicks_count` (RPC
`increment_ad_clicks`) e só então redireciona (302) para o WhatsApp com a mensagem pré-preenchida.

### Google AdSense

```ini
PUBLIC_GOOGLE_ADSENSE_CLIENT="ca-pub-XXXXXXXXXXXXXXXX"
PUBLIC_ADSENSE_SLOT_DEFAULT="XXXXXXXXXX"
```

---

## Etapa 4 — Autenticação, painel /admin e portal do colunista (status: concluída)

| # | Entrega | Onde está |
|---|---------|-----------|
| 1 | Login com Supabase Auth + middleware protegendo `/admin/*` | `src/pages/admin/login.astro`, `src/middleware.ts`, `src/lib/auth.ts` |
| 2 | Dashboard com as duas visões (Editor-Chefe x Colunista) | `src/pages/admin/index.astro` |
| 3 | Editor rápido de publicação em 3 passos (com compressão WebP no cliente) | `src/pages/admin/artigos/{novo,[id]}.astro`, `src/components/admin/QuickPublishWizard.tsx` |
| 4 | "Kit WhatsApp" com o texto pronto e cópia em 1 clique | dentro do `QuickPublishWizard.tsx` |
| 5 | Gestão de colunistas + fila de aprovação em 1 clique | `src/pages/admin/{colunistas,revisao}.astro` |

### Telas do painel

| Rota | Quem acessa | O que faz |
|------|-------------|-----------|
| `/admin/login` | público | login por e-mail/senha (Supabase Auth) |
| `/admin` | ambos | dashboard (visão diferente por papel) |
| `/admin/artigos/novo` | ambos | editor de 3 passos |
| `/admin/artigos/[id]` | autor ou admin | edição |
| `/admin/revisao` | só admin | fila de aprovação (aprovar/devolver em 1 clique) |
| `/admin/colunistas` | só admin | cadastro + chave "pode publicar direto" |
| `/admin/pistas` | só admin | "Boca no Trombone" (pistas do leitor) |
| `/admin/servicos` | só admin | farmácia de plantão, alertas e ônibus |
| `/admin/anuncios` | só admin | anúncios locais (ativar/pausar) |
| `/admin/perfil` | ambos | foto, bio e nome da coluna |

### Trava de publicação (`can_publish_directly`)

A regra é aplicada em **quatro** camadas — o client nunca decide:

1. **UI** — o botão vira "Enviar para revisao" e aparece o aviso de "Revisão obrigatória";
2. **API** — `resolveStatus()` rebaixa `published` para `pending_review` e devolve `coerced: true`;
3. **RLS** — a policy de `articles` impede `published` para quem não tem a flag;
4. **Trigger** — `enforce_article_publish_rules` barra a transição para `published`.

### Editor de 3 passos

1. **Capa e título** — upload de imagem **comprimida para WebP no cliente** (canvas, máx. 1600px, qualidade 0.82) antes de qualquer upload; título, subtítulo, editoria, categoria e a marca de "Urgente";
2. **Resumo e texto** — os 3 tópicos do "Direto ao Ponto" e um editor limpo com barra de formatação (negrito, itálico, H2, lista, link) e prévia;
3. **Revisão e publicação** — resumo final, aviso da trava de publicação e o slug gerado pelo servidor.

### Kit WhatsApp

Após publicar, a tela mostra uma caixa pronta com o texto formatado (título em negrito, os 3 pontos
do resumo e o link) e o botão **"Copiar para grupos de WhatsApp"** (Clipboard API com fallback
para navegadores sem permissão). O link usa o slug **gravado pelo servidor**, então sempre abre
a matéria certa.

### Modo demonstração

Sem as chaves do Supabase, `/admin/login` oferece dois perfis de exemplo (Editor-Chefe e
Colunista). Os dados ficam **apenas em memória** (`src/lib/demo-store.ts`) e o modo é
**desativado automaticamente** assim que o Supabase é configurado — a rota de login devolve
403 nesse caso.

```bash
npm run dev
# abra http://localhost:4321/admin/login
```

### Storage das imagens

`supabase/migrations/002_admin_storage.sql` cria os buckets `covers` e `avatars` (públicos,
só WebP/JPEG/PNG) com politicas de escrita restritas a quem está autenticado, além das views
`review_queue` e `admin_overview`.

---

## Etapa 5 — Gestão comercial, utilidade pública, SEO e produção (status: concluída)

| # | Entrega | Onde está |
|---|---------|-----------|
| 1 | Tela rápida de utilidade pública (farmácia da semana, alerta, ônibus) | `src/pages/admin/utilidade-publica.astro`, `src/components/admin/UtilidadePublicaEditor.tsx` |
| 2 | Gestão de publicidade local + relatório de cliques | `src/pages/admin/anuncios.astro` |
| 3 | Caixa de entrada "Boca no Trombone" + transformar em rascunho | `src/pages/admin/leitores.astro` |
| 4 | Sitemap de notícias, robots.txt e PWA (manifest + service worker) | `src/pages/sitemap-news.xml.ts`, `src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts`, `public/manifest.json`, `public/sw.js` |
| 5 | Configuração de produção na Cloudflare + cache de borda | `wrangler.toml`, `public/_headers`, `src/lib/cache.ts` |

### Utilidade pública (`/admin/utilidade-publica`)

Uma tela, três blocos, feito para o dedo grande e a pressa da rua:

- **Alerta urgente** — liga/desliga, texto e nível (informativo/atenção/urgente). O alerta
  aparece no topo do site e na barra fixa, em verde, amarelo ou vermelho;
- **Farmácia de plantão da semana** — uma linha por dia (nome + telefone), salva de uma vez
  via upsert por `duty_date`;
- **Horários de ônibus intermunicipais** — tabela estruturada (linha, destino, horários,
  frequência), com cadastro, edição e remoção.

### Gestão comercial (`/admin/anuncios`)

Cadastro de **banners** e **"Ofertas do Dia em Nioaque"** com nome do comércio, foto/arte,
posição no site, WhatsApp do lojista, condição e período de veiculação.

O **relatório de cliques** mostra o total de cliques, quantos anúncios estão no ar, quantos são
ofertas do dia e o ranking dos 5 mais clicados — o número para apresentar ao comerciante.

### Boca no Trombone (`/admin/leitores`)

Caixa de entrada com as fotos e os relatos enviados pelos moradores, resposta direta por
WhatsApp e o botão **"Transformar em Rascunho de Matéria"** — que cria o rascunho (nunca
publicado direto), marca a pista como `converted_to_article` e deixa o rascunho visível em
"Meus rascunhos", no dashboard do Editor-Chefe.

### SEO e PWA

| Arquivo | O que é |
|---------|--------|
| `/sitemap-news.xml` | Sitemap de Notícias no padrão do Google (`news:news` com `publication`, `publication_date` W3C e `title`), limitado às últimas **48 horas** e 1000 URLs |
| `/sitemap.xml` | Sitemap geral com todas as matérias publicadas |
| `/robots.txt` | Bloqueia `/admin` e `/api`, declara os dois sitemaps e o bloco do `Googlebot-News` |
| `/manifest.json` | PWA instalável: nome, ícones 192/512 + maskable, atalhos (Capa, Radar, Serviços), cores da marca |
| `/sw.js` | Service worker: rede primeiro nas páginas, cache primeiro nos estáticos, página offline |
| `/offline.html` | Página de fallback sem conexão, com a bandeira |

Os ícones PNG são gerados do logo SVG com `node scripts/generate-icons.mjs`.

### Cache de borda (picos de tráfego)

`src/lib/cache.ts` define a política por tipo de página, aplicada no middleware:

| Página | `s-maxage` | `stale-while-revalidate` |
|--------|-----------|---------------------------|
| Home | 60s | 300s |
| Matéria | 300s | 3600s |
| Editorias / busca | 120s | 600s |
| Sitemaps / robots | 900s | 3600s |
| `/admin/*` e `/api/*` | — | `private, no-store` |

As páginas HTML ainda são gravadas no `caches.default` do Cloudflare, então um pico de tráfego
não chega ao Supabase. Quem está autenticado **nunca** é servido do cache.

Os arquivos estáticos têm regras próprias em `public/_headers` (`/_astro/*` com `immutable` por
1 ano, `/sw.js` com `no-cache`).

### Deploy

```bash
npm run build
npx wrangler deploy
```

Variáveis secretas: `npx wrangler secret put PUBLIC_SUPABASE_URL` (idem para as outras).
As variáveis públicas ficam em `wrangler.toml` → `[vars]`.

---

## Rodando localmente

```bash
npm install
cp .env.example .env      # opcional: sem isso o site roda 100% com os dados mock
npm run dev               # http://localhost:4321
```

Comandos úteis:

```bash
npm run check             # astro check (TypeScript + templates)
npm run build             # check + build do Worker
npm run preview           # build + wrangler dev (simula o Cloudflare)
node scripts/generate-placeholders.mjs   # regera as imagens de exemplo
node scripts/generate-seed.mjs           # regera supabase/seed.sql a partir do mock
```

---

## Conectando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Copie `.env.example` para `.env` e preencha:

   ```ini
   PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
   PUBLIC_SUPABASE_ANON_KEY="eyJ..."
   SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # somente servidor
   ```

3. Aplique o schema:

   ```bash
   supabase link --project-ref <seu-ref>
   supabase db push            # aplica supabase/migrations/*.sql
   supabase db reset --seed-only   # opcional: popula com os dados de exemplo
   ```

4. Promova o primeiro admin (as demais contas nascem como `columnist`):

   ```sql
   update public.profiles
      set role = 'admin', can_publish_directly = true
    where id = (select id from auth.users where email = 'voce@email.com');
   ```

> **Sem chaves do Supabase o portal continua funcionando**: `src/lib/content.ts` cai
> automaticamente para os dados mock de `src/lib/mock-data.ts`.

---

## Estrutura

```
src/
├─ components/
│  ├─ LogoNioaquense.astro     # marca SVG (faixas + cruz latina + wordmark)
│  ├─ ArticleCard.astro        # variantes: lead | standard | compact | column
│  ├─ ArticlePills.astro       # pílulas (editoria + categoria)
│  ├─ CategoryPill.astro       # pílula colorida de categoria (estilo BHAZ)
│  ├─ ScopePill.astro          # pílula de editoria
│  ├─ ServiceBlock.astro       # farmácia, ônibus e atalhos do dia
│  ├─ NioaqueServiceBar.astro  # barra fixa: farmácia, clima, ônibus, alerta
│  ├─ GoogleAdSlot.astro       # slot AdSense com altura reservada
│  ├─ LocalAdBanner.astro      # banner local (zero CLS)
│  ├─ LocalDailyDeal.astro     # "Destaque do Comércio de Nioaque"
│  ├─ ColumnistShowcase.astro  # faixa de colunistas (avatars com anel)
│  ├─ RadarOficialBlock.astro  # Prefeitura, Câmara, Concursos, Diário Oficial
│  ├─ Header.astro / Footer.astro
│  └─ islands/EnviarPista.tsx  # ilha React (formulário do leitor)
├─ layouts/MainLayout.astro
├─ lib/
│  ├─ mock-data.ts             # dados de exemplo (fonte do seed.sql)
│  ├─ content.ts               # camada de leitura: Supabase → fallback mock
│  ├─ types.ts                 # tipos do domínio
│  ├─ format.ts                # datas em pt-BR
│  ├─ slug.ts                  # slugify + unicidade
│  ├─ weather.ts               # Open-Meteo + cache na borda
│  ├─ ads.ts                   # rotas de clique, WhatsApp e alturas reservadas
│  ├─ auth.ts                  # sessão + RBAC (admin | columnist)
│  ├─ admin.ts                 # dados e mutacoes do painel (RBAC no servidor)
│  ├─ api.ts                   # helpers JSON das rotas de API
│  ├─ demo-store.ts            # armazenamento em memoria (modo demonstracao)
│  └─ supabase/{server,client}.ts
├─ pages/
│  ├─ index.astro              # home
│  ├─ busca.astro              # busca do portal
│  ├─ materia/[slug].astro
│  ├─ sitemap.xml.ts           # sitemap geral
│  ├─ sitemap-news.xml.ts      # sitemap do Google Noticias
│  ├─ robots.txt.ts
│  ├─ admin/                   # painel (Etapas 4 e 5)
│  │  ├─ login.astro
│  │  ├─ index.astro           # dashboard (2 papeis)
│  │  ├─ artigos/{novo,[id]}.astro
│  │  ├─ colunistas.astro      # gestao + chave de publicacao
│  │  ├─ revisao.astro         # fila de aprovacao
│  │  ├─ leitores.astro        # boca no trombone
│  │  ├─ utilidade-publica.astro # farmacia, alerta e onibus
│  │  ├─ anuncios.astro        # publicidade local + relatorio
│  │  └─ perfil.astro
│  └─ api/
│     ├─ auth/{login,logout}.ts
│     ├─ admin/…               # articles, profiles, me, upload, ads, bus…
│     ├─ ads/click/[id].ts     # contagem de clique + redirect
│     └─ demo/asset/[id].ts    # imagens do modo demonstracao
├─ middleware.ts               # sessao + protecao do /admin + cache de borda
└─ styles/global.css           # tokens Tailwind v4 + fontes

supabase/
├─ migrations/
│  ├─ 001_initial_schema.sql   # tabelas + RLS
│  ├─ 002_admin_storage.sql    # buckets do Storage + views do painel
│  └─ 003_commercial_utilities.sql # ofertas, horarios de onibus e relatorio
├─ seed.sql
└─ config.toml
```

---

## Identidade visual

Definida em `src/styles/global.css` (bloco `@theme` do Tailwind v4):

| Token | Valor | Uso |
|-------|-------|-----|
| `nioaque-green` | `#008026` | primária, faixa superior da bandeira |
| `nioaque-red` | `#E60000` | acento/urgência, faixa inferior e wordmark |
| `nioaque-white` | `#FFFFFF` | cards e faixa central |
| `editorial` | `#FAF9F6` | fundo do portal |
| `ink` | `#1E293B` | texto principal |

Tipografia: **Newsreader** (títulos editoriais) + **Plus Jakarta Sans** (interface, menus, tags).

### Logo

`<LogoNioaquense />` reproduz a bandeira de Nioaque em lockup horizontal ~4:1:

- faixa superior **verde** (~18% da altura)
- faixa central **branca** (~64%) com a **cruz latina vermelha** à esquerda
- faixa inferior **vermelha** (~18%)
- wordmark **“O NIOAQUENSE”** em vermelho, caixa alta e espaçada

Variantes: `full` (padrão), `mark` (só o símbolo) e `wordmark` (só o texto).

```astro
<LogoNioaquense class="w-40" />
<LogoNioaquense variant="mark" class="h-8 w-auto" />
```

---

## Modelo de dados (RLS)

`supabase/migrations/001_initial_schema.sql` cria 5 tabelas, 6 enums, RLS em todas,
triggers, índices, RPCs e uma view de apoio.

| Tabela | Quem lê | Quem escreve |
|--------|---------|--------------|
| `profiles` | público (colunistas ativos), o próprio usuário, admin | o próprio usuário (sem alterar `role`/`can_publish_directly`), admin |
| `articles` | público (apenas `published`), o autor, admin | autor (status `draft`/`pending_review`), admin |
| `public_utilities` | público | admin |
| `local_ads` | público (anúncios ativos na janela) | admin |
| `reader_submissions` | admin | qualquer leitor (anônimo, status inicial `pending`) |

**Regra de ouro (AGENTS.md #3):** um colunista sem `can_publish_directly = true`
nunca consegue publicar. Isso é garantido em três camadas:

1. **RLS** — a policy de `articles` impede `status = 'published'` para quem não tem a flag;
2. **Trigger** `enforce_article_publish_rules` — barra a transição para `published` e zera `published_at` ao voltar para rascunho;
3. **Trigger** `guard_profile_privileges` — impede que um usuário altere o próprio `role`/`can_publish_directly`.

Funções auxiliares (`SECURITY DEFINER`, sem recursão de RLS):
`current_user_role()`, `is_admin()`, `is_staff()`, `current_user_publish_flag()`,
`current_user_may_publish()`, `slugify()`.

RPCs: `increment_article_views(uuid)` e `increment_ad_clicks(uuid)`.

---

## Deploy (Cloudflare)

```bash
npm run build
npx wrangler deploy
```

Variáveis: configure-as no Cloudflare (`wrangler secret put PUBLIC_SUPABASE_URL` etc.) ou em
`.dev.vars` para o ambiente local.

> O `astro.config.mjs` usa `session: { driver: 'memory' }` para não exigir um binding KV
> do Cloudflare. Se for usar `Astro.session`, troque para o driver KV do adaptador.

---

## Próximas etapas

- [ ] Migrar as imagens do Storage do Supabase para o **Cloudflare R2** + CDN
- [ ] Painel de relatórios do anunciante (impressões + cliques por período)
- [ ] Notificação de matéria urgente (WhatsApp/Telegram da redação)
- [ ] Cache por editoria no Cloudflare KV e invalidação ao publicar
- [ ] SEO: News Sitemaps validados no Search Console e AMP
- [ ] Modo escuro e ajuste fino da tipografia fluida
- [ ] Páginas de editoria (`/nioaque`, `/ms`, `/brasil`, `/colunas`) com paginação
- [ ] Histórico de versões do texto no painel (quem alterou o quê)
