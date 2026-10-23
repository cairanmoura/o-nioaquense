# Product

<!-- impeccable:product-schema 1 -->

> **Provenance note:** this record was compiled by an automated init pass from repository
> evidence (AGENTS.md, README.md, `src/pages/expediente.astro`,
> `src/pages/politica-editorial.astro`, package/config) without a live interview. Facts marked
> *(inferred)* should be confirmed by the product owner; contact details marked *(placeholder)*
> look like stand-ins and must be verified before use.

## Platform

web

## Users

- **Readers — residents of Nioaque (MS) and the surrounding region**, mostly on mobile
  phones (target: 360px–430px screens), reading on cellular connections, often needing
  immediate practical information (pharmacy on duty, bus schedules, city alerts) as much as
  news. *(inferred from the mobile-first mandate and the public-utility features)*
- **The newsroom: one Editor-Chefe and a roster of local columnists** *(role names from
  `src/lib/auth.ts` RBAC)*, working from the `/admin` panel, publishing under time pressure —
  the panel must work perfectly on a large thumb in the street.
- **Local merchants** *(inferred)*: advertisers who buy banner slots and "Ofertas do Dia",
  reached through WhatsApp click-tracking.

## Product Purpose

Hyperlocal news portal for Nioaque (MS), extending to Mato Grosso do Sul and Brazil. It
exists to give a small town its own professional newsroom — verified local reporting,
columns, and daily public-utility services (pharmacy on duty, weather, intermunicipal buses,
city alerts, lottery results, market quotes) — with transparency about how each story was
sourced. Success means the resident checks it daily (news + services), columnists can publish
under editorial control, and local advertising pays for the operation. *(purpose text from
AGENTS.md, expediente and política editorial)*

## Positioning

A genuinely local newsroom a regional portal cannot copy: Nioaque-first coverage ("Radar
Oficial" for Prefeitura, Câmara, Concursos and Diário Oficial in plain language), combined
with a public-utility layer (duty pharmacy with one-tap call/WhatsApp, real-time weather,
bus timetable, city alert bar) and a reader-submission channel ("Boca no Trombone") that
turns resident tips into vetted stories. Editorial-commercial separation is a stated house
rule, not a slogan. *(inferred from README and política editorial)*

## Operating Context

- **Language:** Brazilian Portuguese everywhere — UI, content, and dates (`pt-BR` formatting
  in `src/lib/format.ts`).
- **Newsroom workflow:** columnists without `can_publish_directly` submit to a review queue;
  the Editor-Chefe approves/returns in one click. Publishing is enforced in four layers (UI,
  API, RLS, DB trigger). After publishing, a "Kit WhatsApp" formats the story for WhatsApp
  groups — WhatsApp distribution is a core part of the newsroom's real workflow.
- **Monetization workflow:** the Editor-Chefe registers local ads with a flight period and a
  WhatsApp contact; every reader click routes through a tracked redirect before opening
  WhatsApp; a click report is the number presented to the merchant.
- **Distribution context:** readers arrive via Google News, WhatsApp links, and direct/PWA
  installs; traffic spikes (e.g., urgent local news) must be absorbed at the Cloudflare edge
  without hitting the database.
- **Deployment:** Cloudflare Workers (Astro SSR) + Supabase (Postgres/Auth/Storage), with a
  demo mode that runs entirely on mock data when Supabase keys are absent.

## Capabilities and Constraints

**Confirmed capabilities:** editorial home with lead/sub-leads; article reading page with
"Direto ao Ponto" 3-topic summary, Web-Speech audio narration, and full SEO (canonical, OG,
Twitter, NewsArticle JSON-LD); columnist profiles; dynamic editorial sections
(`/editoria/[scope]`); special "Radar Oficial" section; portal search; reader tip channel
with client-side WebP compression; two-role admin panel (Editor-Chefe × Colunista) with a
3-step quick-publish wizard; public-utility management (duty pharmacy, alert, buses);
local-ad management with click reporting; news sitemap/robots/PWA; edge caching per page
type; automatic fallback to mock content when Supabase is not configured.

**Hard constraints (house rules, from AGENTS.md):**

1. **Zero CLS in ads** — every ad slot reserves its min-height before the creative loads.
2. **Mobile-first is real** — public portal and `/admin` must be perfect on 360px–430px
   screens.
3. **RBAC is enforced server-side and via RLS** — the client never decides; columnists
   without `can_publish_directly = true` can only save `draft` or `pending_review`.

**Technical constraints:** Astro 5 (`output: 'server'`) on `@astrojs/cloudflare`; React only
as islands in the admin panel, audio player, and interactive forms; Tailwind CSS v4;
Supabase with RLS on every table; images as WebP (client-side compression before upload).

**Explicitly undecided / open decisions:** dark mode and fine-tuned fluid typography
(backlog); advertiser reporting panel (impressions + period); R2 migration for images;
urgent-story notification channel (WhatsApp/Telegram); pagination on editorial pages;
version history in the admin panel. These are roadmap items, not commitments. *(from
README "Próximas etapas")*

## Brand Commitments

- **Name:** "O Nioaquense" (onioaquense.com).
- **Identity source:** the flag of Nioaque — green `#008026`, red `#E60000`, white, on an
  editorial off-white background; the logo is an SVG reinterpretation of the flag
  (narrow green/white/red bands, red latin cross, "O NIOAQUENSE" wordmark in red caps).
  Colors, logo form, and the two typefaces (Newsreader for editorial headlines, Plus Jakarta
  Sans for interface) are binding commitments in AGENTS.md.
- **Design references named by the owner:** Nexo Jornal (editorial off-white ground, elegant
  serif titles, "Direto ao Ponto" summary boxes) and BHAZ (vibrant editorial pills, rounded
  mobile-first cards, columnist avatar highlights, service blocks). *(pinned aesthetics —
  future design work must honor them)*
- **Voice:** transparent, service-oriented, plain language; clearly separates news,
  opinion, and advertising; corrections are published with a clear notice; sources are
  always identified. AI tools may assist transcription/organization/review, but the
  editorial decision and final check are human. *(from política editorial)*
- **House rule:** newsroom and commercial are separated — "uma regra da casa, não uma
  sugestão".

## Evidence on Hand

- Full implementation: `src/` (portal, admin panel, API routes), `supabase/migrations/`
  (schema + RLS + triggers + storage), `public/` (PWA, offline page, icons).
- Seed content with **real headlines** from local and Campo Grande/MS portals in
  `src/lib/mock-data.ts` (development seed only; Supabase becomes the source when
  connected) — `scripts/parse-rss.mjs` ingests RSS.
- Editorial/legal pages already written: `/politica-editorial`, `/expediente`,
  `/privacidade`, `/termos`.
- **Absences future work must not fabricate:** no real testimonials, audience metrics,
  advertiser names, or revenue figures exist in the repo. The expediente contact data —
  e-mail `contato@onioaquense.com`, phone/WhatsApp `(67) 9999-9000` — reads as a
  *(placeholder)* and must be verified before anything external quotes it. The AdSense
  client ID is a placeholder (`ca-pub-XXXXXXXXXXXXXXXX`).

## Product Principles

1. **Nioaque first.** Local usefulness outranks volume: a resident should find the day's
   most important local fact — plus the pharmacy, the bus, and the city alert — in seconds,
   on a phone.
2. **Trust is the product.** Verified sources, visible corrections, and a strict
   news/opinion/advertising separation; nothing publishes past editorial control, whoever
   the author is.
3. **Every pixel earns its keep on 360px.** Mobile-first is the test, not the fallback;
   layout stability (zero CLS) is non-negotiable.
4. **The newsroom's tools serve the street.** Admin workflows are built for speed and big
   thumbs; publishing feeds WhatsApp distribution because that is where the town gathers.
5. **The operation pays for itself honestly.** Local advertising is tracked, transparent,
   and never allowed to blur into editorial content.

## Accessibility & Inclusion

- Content and interface language is Brazilian Portuguese at plain-language level
  ("Radar Oficial" explanations are explicitly written in simple language for the general
  citizen).
- Zero-CLS ad slots and reserved heights protect readers on slow connections from layout
  jumps; offline fallback page and PWA support intermittent connectivity.
- No formal accessibility standard (e.g., WCAG target) is documented in the repo — an open
  decision future work may set. *(inferred absence)*
