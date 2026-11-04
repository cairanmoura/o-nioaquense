# AGENTS.md — Diretrizes do Projeto "O Nioaquense" (onioaquense.com)

## Visão Geral
Portal de notícias hiperlocal focado em Nioaque (MS), cobrindo também Mato Grosso do Sul e Brasil.

## Design System (fonte de verdade)
O sistema de design oficial vive em `design-system/project/` (importado do Claude Design: https://claude.ai/artifact/TKbik7hnPJX5x9PusSZbz1). **Leia `design-system/project/README.md` antes de qualquer trabalho visual** e, por item, `api/tokens.md`, `components/<Nome>/README.md` e `assets/<Grupo>/README.md`. Valores que não estiverem lá são palpite: não invente. Se o sistema mudar no Claude Design, reimporte para essa pasta e reaplique no site.

Resumo (detalhes no README do sistema):
- **Visual de jornal**: papel quente, serifa pesada nas manchetes, verde e vermelho tirados da logo. Sem sombras: separação por borda `pedra` e filetes.
- **Cores** (tokens em `src/styles/global.css`, `@theme`): papel `#F7F5F0`, branco (cards) com borda `pedra` `#E5E0D5`, tinta `#1B1F1C`, `verde-mata` `#0D4722` (verde da logo: header, Boca no Trombone), `verde-institucional` `#166A34` (interface: pílula ativa, Plantão, Loterias, dezenas; no código é `nioaque-green`), `vermelho` `#D92323` (ação, bolinhas, filetes), `vermelho-texto` `#B01E1E` (texto pequeno sobre claro; no código é `nioaque-red-dark`), faixa de mercado `#0F291E` com `ocre` `#D97706`.
- **Fontes**: `Bitter` 800/700 (manchetes e títulos de seção) + `Chivo` 400-700 (interface, resumos, dados, tags). Carregar `Bitter:wght@700;800` e `Chivo:wght@400;500;600;700`. Números tabulares em horários, dezenas e valores.
- **Forma**: cantos de 4 px (cards, botões, pílulas), 2 px (miniaturas, dezenas), cápsula só no Radar Oficial. Alvo tocável mínimo 44 px. Foto da manchete 4:3 ou 16:9 já aplicada nos cards; sem foto usar reserva (`foto-reserva`).
- **Marca**: logo oficial sempre como imagem de `public/brand/` (`logo-branca` sobre verde-mata no header, `logo-verde` sobre papel/branco, `logo-preta`, `logo-vermelha` só destaque), via `<LogoNioaquense tone="...">`. Nunca redesenhar nem redigitar a logo. Cavaleiro isolado em `public/brand/cavaleiro-*.svg` (marca d'água a 9% no Radar Oficial, ícones PWA/favicon). PNGs em vários tamanhos estão em `O Nioaquense - ID Visual Oficial/PNG/`.
- **Elementos gráficos**: A1 "Degraus" (filete sob as pílulas de editoria), B2 "Colunata" (Radar Oficial), C1 "Megafone" (Boca no Trombone), D1 "Filete cheio" (Cotação Agro), filete duplo verde e vermelho antes do rodapé. Barra de leitura de 4 px fixa no topo extremo.
- **Conteúdo**: português do Brasil, tom jornalístico direto, manchetes em frase corrente (maiúscula só na primeira palavra e em nomes próprios), horários relativos ("há 34 min"). Nomes fixos de seção: Plantão, Loterias, Cotação Agro de Nioaque, Boca no Trombone ("Sua denúncia muda a cidade"), Radar Oficial. O box "Direto ao Ponto" existe **só na matéria aberta, nunca na Home**. Não usar "O que acontece em Nioaque" nem a data do dia no topo da Home. Emoji só no clima do header; ícones de traço no resto.
- **Contraste**: texto 4,5:1 mínimo (3:1 em marcas gráficas). Verde e vermelho sempre acompanhados de palavra ou posição. Foco: anel sólido de 2 px em `verde-mata` sobre claro.
- **Tema escuro**: previsto no sistema (`data-theme="dark"`, tokens no README) mas ainda **não implementado** no site.

## Stack Tecnológica Obrigatória
- **Framework**: Astro 5 (`output: 'server'`) com `@astrojs/cloudflare`.
- **Estilização**: Tailwind CSS 4 (tokens no `@theme` de `src/styles/global.css`).
- **Interatividade**: React (apenas como Islands `client:load` / `client:visible` no painel `/admin`, player de áudio e formulários interativos).
- **Backend / Auth / DB**: Supabase (`@supabase/supabase-js` e `@supabase/ssr`).
- **Storage e Cache**: Cloudflare R2 (ou Supabase Storage) para imagens convertidas em WebP + Cloudflare KV / Cache-Control na borda.

## Regras de Código e Performance
1. **Zero CLS em Anúncios**: Todo slot do Google Ads ou banner local deve ter `min-height` reservado.
2. **Mobile-First Real**: Tanto o portal público quanto o painel `/admin` devem ser perfeitos para uso em telas de 360px a 430px.
3. **Segurança (RBAC)**: Validar sempre o perfil do usuário (`admin` vs `columnist`) no servidor e via RLS no Supabase. Colunistas sem `can_publish_directly = true` só podem salvar como `draft` ou enviar para `pending_review`.