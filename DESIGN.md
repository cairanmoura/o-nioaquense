---
name: O Nioaquense
description: Design system do portal de noticias hiperlocal de Nioaque (MS)
colors:
  nioaque-green: "#008026"
  nioaque-red: "#e60000"
  nioaque-white: "#ffffff"
  editorial: "#faf9f6"
  ink: "#1e293b"
  nioaque-green-dark: "#006020"
  nioaque-green-light: "#00a233"
  nioaque-green-50: "#eaf6ee"
  nioaque-green-100: "#c9e9d4"
  nioaque-red-dark: "#b30000"
  nioaque-red-light: "#ff2a2a"
  nioaque-red-50: "#fdeaea"
  ink-soft: "#475569"
  ink-muted: "#64748b"
  line: "#e4e2dc"
  line-strong: "#d3d0c8"
typography:
  display:
    fontFamily: "Newsreader, Iowan Old Style, Palatino Linotype, Palatino, Georgia, 'Times New Roman', serif"
    fontWeight: 400
  body:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontWeight: 400
rounded:
  card: "1rem"
  pill: "999px"
icons:
  favicon: "/icons/03-icone-bandeira-on.svg"
  logo: "/icons/01-logo-horizontal-bandeira.svg"
  pauta:
    educacao: "/icons/13-pauta-educacao-livro.svg"
    saude: "/icons/23-pauta-saude-ambulancia.svg"
    "meio ambiente": "/icons/10-icone-serra-nioaque.svg"
    infraestrutura: "/icons/28-pauta-obras-infraestrutura.svg"
    cultura: "/icons/12-pauta-cultura-violao.svg"
    economia: "/icons/21-pauta-financas-saco-dinheiro.svg"
    estado: "/icons/25-pauta-poder-politica.svg"
    prefeitura: "/icons/25-pauta-poder-politica.svg"
    camara: "/icons/25-pauta-poder-politica.svg"
    "diario oficial": "/icons/25-pauta-poder-politica.svg"
    concursos: "/icons/27-pauta-financas-grafico.svg"
    turismo: "/icons/11-icone-nascer-do-sol.svg"
    cidade: "/icons/29-pauta-alerta-utilidade.svg"
    esportes: "/icons/18-pauta-esporte-trofeu.svg"
    default: "/icons/03-icone-bandeira-on.svg"
components:
  button-primary:
    backgroundColor: "{colors.nioaque-red}"
    textColor: "{colors.nioaque-white}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.75rem"
  button-primary-hover:
    backgroundColor: "{colors.nioaque-red-dark}"
  button-secondary:
    backgroundColor: "{colors.nioaque-green}"
    textColor: "{colors.nioaque-white}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.75rem"
  chip-pill:
    backgroundColor: "{colors.nioaque-green}"
    textColor: "{colors.nioaque-white}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.7rem"
  card-article:
    backgroundColor: "{colors.nioaque-white}"
    rounded: "{rounded.card}"
  input-search:
    backgroundColor: "{colors.editorial}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 1rem"
---

# Design System: O Nioaquense

## Overview

**Creative North Star: "O Ponto da Cidade"**

O portal se comporta como a praça central de Nioaque: o lugar onde o morador encontra, em segundos, a notícia do dia e os serviços úteis (farmácia de plantão, clima, ônibus, alerta da cidade). O tom é editorial, calmo e confiável — solidez de leitura tipo Nexo Jornal (fundo off-white #FAF9F6, títulos serifados em Newsreader, caixa "Direto ao Ponto") — com pontuação vibrante de serviço no espírito BHAZ (pilulas de editoria coloridas com ícones temáticos, cards arredondados, avatares de colunistas em destaque). Tudo cabe em telas de 360px a 430px; o desktop só acrescenta, nunca reescreve. O vermelho é reservado a urgência e ações primárias; nunca é decoração.

**Key Characteristics:**

- Fundo editorial #FAF9F6 em toda a página; cards e modais em #FFFFFF puro.
- Títulos editoriais em Newsreader (serif); interface, rótulos e dados em Plus Jakarta Sans (sans).
- Escala de texto fluida mobile-first (clamp) para títulos; tamanhos fixos para corpo e rótulos.
- Raio generoso: cards 1rem (16px), pilulas e botões 999px.
- Profundidade por camadas tonais e bordas de 1px; sombras sutis apenas em estado (hover/focus).
- Zero CLS em anúncios: altura reservada antes do criativo carregar.
- Símbolo da marca: releitura da bandeira de Nioaque (faixas 18% / 64% / 18%, cruz vermelha esquerda, wordmark "O NIOAQUENSE" vermelho caixa alta).
- Ícones temáticos de pauta (CategoriaPill / IconePauta): cada categoria de notícia tem um ícone SVG próprio da identidade Nioaque, exibido dentro das pilulas de categoria.

## Brand Assets

### Logo

O lockup oficial está em SVG externo: `/icons/01-logo-horizontal-bandeira.svg` (viewBox 470×100). Contém:
- Faixa superior verde #008026, faixa central branca #FFFFFF, faixa inferior vermelha #E60000
- Cruz latina vermelha na parte esquerda da faixa central
- Wordmark "O NIOAQUENSE" em vermelho caixa alta, com "PORTAL" acima em verde
- Componente `LogoNioaquense.astro` renderiza `<img src="/icons/01-logo-horizontal-bandeira.svg">`, mantendo props `variant` (full/mark/wordmark), `class`, `title`

### Favicon

`/icons/03-icone-bandeira-on.svg` — ícone "ON" com as faixas da bandeira sobre fundo editorial #FAF9F6, texto "ON" inclinado em vermelho. Usado em `public/favicon.svg` e na meta `theme-color` (#008026).

## Colors

Paleta extraída da bandeira de Nioaque, com verdes para confiança e ações, vermelho apenas para urgência, e fundo off-white para leitura longa.

### Primary

- **Verde Nioaque** (#008026): âncora de marca e confiança. Usado em pilulas de editoria ativas, botões primários de serviço (Ligar), anéis de foco, linhas do topo da marca e a faixa superior do logo.

### Secondary

- **Vermelho Nioaque** (#e60000): acento de urgência e sinalização breve. Usado em alertas "Última hora", botões de chamada ("Mande sua notícia", WhatsApp), botões de exclusão/ação destrutiva, pontos dos resumos "Direto ao Ponto", a faixa inferior do logo e a cruz da marca. Nunca é usado como decoração de fundo ou texto de corpo.

### Neutral

- **Editorial** (#faf9f6): fundo de todas as páginas; leitura longa em off-white quente.
- **Ink** (#1e293b): texto principal e corpo de matéria; nunca preto puro.
- **Ink Soft** (#475569): texto secundário (créditos, subtítulos suaves).
- **Ink Muted** (#64748b): rótulos pequenos, metadados, placeholders.
- **Branco Puro** (#ffffff): cards, resumos, botões secundários em estado de repouso.
- **Line** (#e4e2dc) / **Line Strong** (#d3d0c8): bordas e divisores sutis entre superfícies brancas.

Derivados úteis já definidos no código: verde escuro #006020 (hover verde), verde claro #00a233, verde-50 #eaf6ee e verde-100 #c9e9d4 (superfícies de estado verde); vermelho escuro #b30000 (hover vermelho), vermelho claro #ff2a2a, vermelho-50 #fdeaea (superfícies de estado vermelho).

**The One Red Rule.** Vermelho Nioaque ocupa no máximo 10% de qualquer tela. Sua raridade é o que faz o alerta funcionar; pintar mais que isso desqualifica o sinal de urgência.

**The Flat-By-Default Rule.** Superfícies são planas em repouso. Sombra aparece apenas como resposta a estado (hover, focus, elevado) — nunca como decoração estática.

## Typography

**Display Font:** Newsreader (com Iowan Old Style, Palatino, Georgia, Times New Roman como fallback).

**Body Font:** Plus Jakarta Sans (com ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial como fallback).

**Character:** O par serif-para-títulos / sans-para-interface cria a tensão editorial do portal: autoridade nas manchetes, neutralidade rápida na navegação e nos dados de serviço.

### Hierarchy

- **Display** (400–800, clamp(2.25rem, 1.4rem + 3.6vw, 4.5rem), line-height 1.02, letter-spacing -0.03em): manchetes da capa e títulos de destaque editorial apenas.
- **Headline** (400–700, clamp(1.75rem, 1.2rem + 2.4vw, 3rem), line-height 1.08, letter-spacing -0.02em): títulos de matéria e seções.
- **Title** (600, clamp(1.25rem, 1.05rem + 0.9vw, 1.75rem), line-height 1.18, letter-spacing -0.015em): títulos de cards e encabeçados de componentes.
- **Body** (400–700, 0.9375rem–1.125rem, leading-relaxed, medida máxima 65–75ch): corpo de matéria, serviços e texto de apoio.
- **Label** (700, 0.6875rem, letter-spacing 0.16em, maiúsculo): pilulas de editoria, sobremesas e metadados miúdos.

H2 e H3 dentro do corpo de matéria usam Newsreader, peso 600, espaçamento -0.01em, topo de 2rem.

## Layout

Modelo espacial em coluna única centralizada, mobile-first.

- **Container:** `container-editorial` — largura total, `max-width: 80rem`, `padding-inline: 1rem` (1.5rem a partir de 640px, 2rem a partir de 1024px), centralizado com `margin-inline: auto`.
- **Breakpoints (observados em uso):** `sm` 640px (padding do container), `md` 768px (grade 2 colunas de serviços), `lg` 1024px (padding alargado, menu desktop). Padrão Tailwind v4 sem arquivo de configuração; tokens via `@theme` em `src/styles/global.css`.
- **Grade:** bloco de serviços em `grid md:grid-cols-2`; menu mobile em `grid-cols-2 gap-2`; rodapé em grid responsivo `minmax(0,1fr) repeat(3, minmax(0,auto))`.
- **Ritmo espacial:** base de 4px (0.25rem); grupos apertados (gap 0.25rem–1rem), separação generosa entre seções (espaço acima do título maior que abaixo); pilulas nunca estouram o container (`max-width: 100%`, `text-overflow: ellipsis`) — crítico em 360px.
- **Mobile-first real:** toda a superfície pública e o painel `/admin` são pensados para 360px–430px primeiro; melhorias de desktop aplicam-se apenas acima dos breakpoints.

## Elevation & Depth

Sistema plano por contrato; profundidade vem de camadas tonais, não de sombras pesadas: cards brancos sobre o fundo #FAF9F6, bordas de 1px em #e4e2dc / #d3d0c8, superfícies de estado em verde-50 / vermelho-50.

### Shadow Vocabulary

- **Card** (`0 1px 2px rgb(30 41 59 / 0.04), 0 8px 24px -12px rgb(30 41 59 / 0.12)`): elevação sutil e constante de cards e blocos de serviço.
- **Lift** (`0 2px 4px rgb(30 41 59 / 0.05), 0 18px 40px -18px rgb(30 41 59 / 0.22)`): elevação mais forte para estados de foco/interação.

Ambas possuem deslocamento e desfoque suave; nenhum halo de cor com deslocamento zero (não é um mundo neobrutalista).

## Shapes

- **Cards e blocos de serviço:** `rounded-xl` / `rounded-2xl`, raio efetivo alinhado a `--radius-card: 1rem` (16px).
- **Pilulas, botões e avatares:** `--radius-pill: 999px` (forma completa).
- **Borda:** 1px sólida em `#e4e2dc` (`--color-line`) ou `#d3d0c8` (`--color-line-strong`); exceção intencional única e escopada: a caixa "Direto ao Ponto" carrega `border-left: 4px solid #008026` (referência fixa do Nexo, apenas neste componente).
- **Capas geométricas (sem foto):** retângulo 1200×675 com `rx="20"` na caixa branca da editoria; marcas d'água circulares em verde e vermelho com opacidade baixa.

## Components

### Buttons

- **Shape:** pilula completa (`rounded-full`, 999px).
- **Primary:** vermelho `#e60000`, texto `#ffffff`, `px-3 py-2.5`, `text-xs`, `font-semibold`, hover escurece para `#b30000`. Usado em CTAs de serviço ("Mande sua notícia").
- **Secondary / ghost:** verde `#008026` texto branco (Ligar) ou verde sobre transparente com anel; WhatsApp usa `#075E54` (marca do canal, não do portal).
- **Estados:** foco visível com anel 2px verde (#008026) e deslocamento 2px; textos de botões truncam em mobile para ícone só.

### Chips (Scope Pills)

- **Style:** `.pill-scope` — `inline-flex`, `gap: 0.375rem`, `border-radius: 999px`, `padding: 0.25rem 0.7rem`, `font-size: 0.6875rem`, `font-weight: 700`, `letter-spacing: 0.12em`, texto maiúsculo, `line-height: 1.4`.
- **Variantes por editoria (SCOPE_BADGE_CLASS):**
  - Nioaque: fundo verde, texto branco.
  - Mato Grosso do Sul: fundo verde-50, texto verde escuro, anel verde-100.
  - Brasil: fundo ink, texto branco.
  - Coluna: fundo vermelho, texto branco.
  - Radar Oficial: fundo vermelho-50, texto vermelho escuro, anel vermelho-100.

### Category Pills com Ícones Temáticos

- **Componente:** `CategoryPill.astro` renderiza `<IconePauta categoria={category}>` à esquerda do rótulo, dentro da pilula.
- **Componente:** `IconePauta.astro` mapeia cada categoria para um ícone SVG temático da identidade Nioaque (veja tabela de ícones acima).
- **Paleta:** cores da marca apenas (verde, vermelho, preto editorial, tints -50/-100). A cor `amber` foi removida — não pertence à identidade Nioaque.
- **Tamanho do ícone:** `w-3 h-3` (12px) para não estourar o layout em 360px.

### Cards / Containers

- **Corner Style:** `rounded-xl` (12px) mínimo; `rounded-2xl` em blocos de serviço; alinhados a `--radius-card: 1rem`.
- **Background:** `#FFFFFF`; fundo da página `#FAF9F6`.
- **Shadow Strategy:** veja Elevação (sombra `card` por padrão, `lift` em foco).
- **Border:** 1px `#e4e2dc` quando necessário.
- **Internal Padding:** `p-5` (20px) em cards de matéria; `px-5 py-3` em cabeçalhos de serviço.
- **ArticleCard** tem quatro variantes: `lead` (manchete grande + capa + caixa "Direto ao Ponto"), `standard` (card vertical com imagem 16:9), `compact` (linha com miniatura esquerda), `column` (opinião, sem imagem, borda esquerda vermelha). Links de título ficam verdes no hover (`group-hover:text-nioaque-green`); imagens de capa escalam suavemente no hover (`scale-[1.02]` / `1.03`, duração 500ms).

### Inputs / Fields

- **Style:** busca em `rounded-full`, borda 1px `#e4e2dc`, fundo `#FAF9F6`, `px-4 py-2`, `text-sm`.
- **Focus:** `focus-within:border-nioaque-green` e `focus-within:bg-nioaque-white`; nunca anel azul do navegador.
- **Error / Disabled:** não definidos como sistema; erros usam texto vermelho quando aparecem.

### Navigation

- **Header (público):** cabeçalho em `#FFFFFF` com `container-editorial`; logo `w-28` (mobile) até `w-48` (desktop); linha de navegação por editoria abaixo do h1 da capa (pills de escopo com estado ativo); menu de editorias em pilulas `rounded-full px-4 py-2 text-sm font-semibold`, ativo em verde texto branco, inativo em `ink-soft` com hover verde-50; menu mobile em grade 2 colunas `rounded-xl px-4 py-3` com `ring-1 ring-line`; link de acessibilidade "Pular para o conteúdo" (sr-only até o foco, posição absoluta topo-esquerda, fundo verde).
- **Editoria [scope]:** linha horizontal de pills de editoria abaixo do cabeçalho da página, com estado ativo colorido por escopo e link direto para `/radar-oficial` quando aplicável.
- **Admin:** barra lateral fixa (desktop) + barra inferior fixa (mobile) com alcance do polegar; ativo em verde `bg-nioaque-green text-white`.

### Signature Component — "Direto ao Ponto"

Caixa de resumo de matéria (referência Nexo Jornal): `border-left: 4px solid #008026`, fundo `#FFFFFF`, `border-radius: 0 0.75rem 0.75rem 0`, `p-5`; título `h3` "Direto ao Ponto" em verde escuro `text-sm font-semibold`; bullets com ponto vermelho (`rounded-full`, `#e60000`), texto de corpo `text-base leading-relaxed`.

## Do's and Don'ts

### Do:

- **Do** reserve a altura mínima de cada slot de anúncio antes do criativo carregar (zero CLS): header_billboard 160px, home_middle 220px, article_inline 280px, sidebar 260px, daily_deal 340px; AdSense leaderboard 120px, rectangle 280px, horizontal 140px, mobileBanner 100px. Sem cliente configurado, o slot não é renderizado vazio.
- **Do** mantenha a medida do corpo entre 65 e 75 caracteres, com `leading-relaxed`.
- **Do** use `#FAF9F6` como fundo de página e `#FFFFFF` em cards; jamais misture outros fundos de superfície.
- **Do** restrinja o vermelho a urgência e chamada primária (regra dos 10%).
- **Do** use Newsreader apenas para títulos editoriais; Plus Jakarta Sans para tudo o que é interface, rótulo ou dado.
- **Do** use ícones temáticos de pauta dentro das pilulas de categoria (`IconePauta`), nunca genéricos.

### Don't:

- **Don't** use texto em degradê ou vidro/desfoque como decoração.
- **Don't** use sombras de deslocamento duro (`4px 4px 0`) — não é um mundo neobrutalista.
- **Don't** renderize slots de anúncio vazios; oculte o slot inteiro quando não houver cliente.
- **Don't** coloque sobremesa (kicker/eyebrow) acima de títulos; o título carrega seu próprio peso.
- **Don't** use preto puro (`#000000`) em texto; o tom de corpo é `#1E293B`.
- **Don't** use cores fora da identidade Nioaque (ex.: `amber`) em pilulas, botoes ou estados da interface.
