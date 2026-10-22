# AGENTS.md — Diretrizes do Projeto "O Nioaquense" (onioaquense.com)

## Visão Geral
Portal de notícias hiperlocal focado em Nioaque (MS), cobrindo também Mato Grosso do Sul e Brasil.
Referências de Design:
- **Nexo Jornal**: fundo editorial suave (`#FAF9F6`), títulos serifados elegantes, leitura limpa, caixas de resumo didáticas ("Direto ao Ponto").
- **BHAZ (bhaz.com.br)**: uso vibrante das cores da marca em pílulas de editorias, cards arredondados mobile-first, destaque visual para avatares de colunistas e blocos de serviço.

## Stack Tecnológica Obrigatória
- **Framework**: Astro 5 (`output: 'server'`) com `@astrojs/cloudflare`.
- **Estilização**: Tailwind CSS.
- **Interatividade**: React (apenas como Islands `client:load` / `client:visible` no painel `/admin`, player de áudio e formulários interativos).
- **Backend / Auth / DB**: Supabase (`@supabase/supabase-js` e `@supabase/ssr`).
- **Storage e Cache**: Cloudflare R2 (ou Supabase Storage) para imagens convertidas em WebP + Cloudflare KV / Cache-Control na borda.

## Identidade Visual e Cores (Bandeira de Nioaque)
- **Verde Nioaque (Primária)**: `#008026`
- **Vermelho Nioaque (Acento / Urgência)**: `#E60000`
- **Branco Puro (Cards / Faixa central)**: `#FFFFFF`
- **Fundo Editorial**: `#FAF9F6`
- **Texto Principal**: `#1E293B`
- **Fontes**: `Newsreader` ou `Merriweather` (títulos editoriais) + `Plus Jakarta Sans` (interface, menus, tags e corpo de apoio).
- **Logo SVG**: Inspirada na bandeira de Nioaque (faixa superior verde, faixa central branca com cruz latina vermelha à esquerda e faixa inferior vermelha), porém em proporção mais estreita (faixas verde e vermelha com ~18% de altura cada, faixa branca central com ~64%) e trocando a inscrição original em latim por "O NIOAQUENSE" em vermelho e caixa alta.

## Regras de Código e Performance
1. **Zero CLS em Anúncios**: Todo slot do Google Ads ou banner local deve ter `min-height` reservado.
2. **Mobile-First Real**: Tanto o portal público quanto o painel `/admin` devem ser perfeitos para uso em telas de 360px a 430px.
3. **Segurança (RBAC)**: Validar sempre o perfil do usuário (`admin` vs `columnist`) no servidor e via RLS no Supabase. Colunistas sem `can_publish_directly = true` só podem salvar como `draft` ou enviar para `pending_review`.