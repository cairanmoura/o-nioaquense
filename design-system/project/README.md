O Nioaquense é o portal de notícias de Nioaque, MS. O sistema define a identidade do site (desktop e mobile) em português do Brasil, com visual de jornal: papel quente, serifa pesada nas manchetes e verde e vermelho tirados da logo.

## Fundamentos de conteúdo

- Escreva sempre em português do Brasil, em tom direto e jornalístico, na terceira pessoa. Não fale com o leitor em "você" nos títulos de notícia.
- Manchetes em frase corrente, com maiúscula só na primeira palavra e em nomes próprios: "Prefeitura de Nioaque intensifica campanha contra caça ilegal de animais silvestres".
- Todo card de notícia leva chapéu (editoria, ou editoria e cidade: "Saúde · Nioaque"), título, fonte e horário ("O Pantaneiro · há 4h").
- Horários relativos ("há 34 min", "há 1 h"). Datas por extenso só dentro de matérias.
- Seções especiais têm nome fixo, sempre com estas grafias: Plantão, Loterias, Cotação Agro de Nioaque, Boca no Trombone ("Sua denúncia muda a cidade"), Radar Oficial.
- O box "Direto ao Ponto" existe só na página da matéria aberta. Não o coloque na Home.
- Não use "O que acontece em Nioaque" nem a data do dia no topo da Home.
- Emoji só no clima do header ("☀️ 22°C"). Em qualquer outro lugar, use ícones de traço.

## Fundamentos visuais

**Cor.** O fundo da página é `papel`. Cards e blocos de destaque são `branco` com borda de 1 px em `pedra`. Texto corrido em `tinta`; resumos em `tinta-suave`; metadados em `tinta-muda`.

- `verde-mata` é o verde da logo: use como fundo do header e do card Boca no Trombone. Para contorno, ícone ou tag em verde sobre papel e branco use `verde-contorno`, e para verde como cor de texto use `verde-texto`.
- `verde-institucional` é o verde de interface (pílula ativa, barras Plantão e Loterias, chapéus de Saúde, dezenas, filetes). Texto sobre ele é `on-verde`.
- `vermelho` é o vermelho da logo e serve para ação (botão "+ Mande sua notícia", "Enviar denúncia"), bolinhas de chapéu e fio dos filetes. Texto sobre ele é `on-vermelho`. Em texto pequeno sobre papel ou branco, use `vermelho-texto`.
- A faixa de mercado usa `mercado-fundo` com `ocre`, `mercado-rotulo` e `papel` para valores.
- Verde e vermelho aparecem sempre acompanhados de palavra ou posição (nunca só a cor diferencia um estado).

**Tipografia.** Bitter para manchetes e títulos de seção (peso 800 em manchetes e títulos de card, 700 em títulos de seção), Chivo para interface, resumos, dados e tags (400, 500 e 600). Use as classes de estilo geradas: `manchete-web`, `manchete-mobile`, `titulo-card`, `titulo-card-mobile`, `titulo-secao`, `rotulo-secao`, `linha-fina`, `resumo`, `plantao-titulo`, `meta`, `chapeu`, `selo-tag`, `nav`, `botao`, `pilula`, `dado-destaque`, `dezena`. Ative números tabulares em horários, dezenas e valores. As duas famílias vêm do Google Fonts: carregue `Bitter:wght@700;800` e `Chivo:wght@400;500;600;700`.

**Espaço e forma.** Margem lateral de `space-4` no mobile e `space-5` no desktop; conteúdo com no máximo `container-max`. Cantos de 4 px (`radius-md`) em cards, botões e pílulas; 2 px (`radius-xs`) em miniaturas; cápsulas só no Radar Oficial (`radius-pill`). Não use sombras: a separação vem de borda `pedra` e de filetes. Todo alvo tocável tem no mínimo `toque-min` de altura.

**Layout da Home.** Barra de leitura de `barra-leitura` fixa no topo extremo, depois o header verde-mata, depois as pílulas de editoria (Nioaque, Região, Mato Grosso do Sul, Brasil, Mundo) e o filete A1. Em seguida três colunas no desktop: manchete, sub-manchetes e barra lateral (Plantão e Loterias). A faixa Cotação Agro vem depois, e o rodapé especial reúne Boca no Trombone e Radar Oficial sob um filete duplo verde e vermelho. No mobile as colunas empilham, o card seguinte à manchete vira card compacto com miniatura à direita e a segunda notícia deve aparecer inteira na primeira dobra de 390 × 844.

**Imagens.** A foto da manchete tem sempre proporção 4:3 (`aspect-ratio: 4/3`). Sem foto, use `foto-reserva`.

**Foco.** Use anel sólido de 2 px em `verde-contorno` sobre papel e branco, e em `on-verde` sobre fundos verdes ou escuros.

## Tema escuro

O tema escuro é um segundo tema dos mesmos tokens: ative-o com `data-theme="dark"` na raiz. Os nomes não mudam, só os valores.

- Fundo da página: `papel` vira um verde-preto (#0E1411) e `branco` vira a superfície elevada (#17201A). Cards continuam com borda `pedra`. Nunca escreva #FFFFFF para um card: use `branco`. Para texto branco fixo sobre verde ou vermelho, use `on-verde` e `on-vermelho`.
- Texto: `tinta`, `tinta-suave` e `tinta-muda` clareiam. Verde e vermelho em texto pequeno usam `verde-texto` e `vermelho-texto`; contornos e ícones verdes usam `verde-contorno`. Não use `verde-institucional` nem `vermelho` como cor de texto no escuro.
- Não mudam: o header (`verde-mata` com logo branca), as barras Plantão e Loterias, a pílula ativa, o botão vermelho, o card Boca no Trombone e a faixa Cotação Agro (`mercado-fundo`, `ocre`, `mercado-texto`).
- Imagens: o cavaleiro troca de `cavaleiro-verde.png` para `cavaleiro-branco.png` (classes `t-l` e `t-d`). A logo verde ou preta some sobre fundo escuro: fora do header, use `logo-branca.png` sobre `verde-mata`.
- Matérias: título, linha-fina, corpo, o box Direto ao Ponto, os cards Leia também e o Plantão seguem os mesmos tokens; a foto usa `foto-reserva`. Texto corrido da matéria em Chivo 18/1,65, no máximo 65 caracteres por linha.
- Todo par de texto anotado nos tokens mantém no mínimo 4,5:1 nos dois temas (3:1 para marcas gráficas).

## Marca e iconografia

- A logo oficial é a imagem "O NIOAQUENSE" em caixa alta condensada com o monumento do cavaleiro à direita. Use os arquivos em `assets/Logos`: nunca redesenhe nem redigite a logo com uma fonte.
- No header verde-mata use `logo-branca.png`. Em fundos claros use `logo-verde.png` ou `logo-preta.png`; `logo-vermelha.png` só em usos de destaque. Altura: `logo-web` no desktop e `logo-mobile` no mobile, centralizada no mobile.
- O cavaleiro isolado (`assets/Cavaleiro`) é o ícone institucional. Use-o como marca d'água a 9% no cabeçalho do Radar Oficial e dentro do selo "Apurado pela redação".
- Ícones de interface são de traço fino (1,6 a 2 px, pontas arredondadas), na cor do contexto: busca, menu, e os três ícones da Cotação Agro (Dólar, Boi Gordo, Soja) em `ocre`. O Radar Oficial usa a colunata (referência à Retirada da Laguna); o Boca no Trombone usa o megafone em gravura como marca d'água a 8%. O SVG de cada um está no `preview.html` do componente.

## Elementos gráficos de Nioaque (escolhidos)

- **A1 · Degraus:** três faixas horizontais de comprimento decrescente (`verde-institucional`, branco com contorno `pedra-escura`, `vermelho`) antes de uma linha dupla (3 px e 1 px) em `verde-institucional`. Fica logo abaixo das pílulas de editoria. Componente: Editorias.
- **B2 · Colunata:** ícone de colunata em `verde-mata`, título Radar Oficial e tags em cápsula (DECRETO, LICITAÇÃO, EDITAL, PORTARIA) em Chivo `selo-tag`, com ponto verde ou vermelho alternado. Componente: RadarOficial.
- **C1 · Megafone:** card `verde-mata`, botão "Enviar denúncia" em `vermelho` e marca d'água de megafone a 8% no canto inferior direito. Componente: BocaNoTrombone.
- **D1 · Filete cheio:** faixa `mercado-fundo` com filete superior de 4 px em `ocre`, rótulo MERCADO em `ocre` e ícones de traço. Componente: CotacaoAgro.

As variações descartadas (A com faixas inclinadas e losangos, B1 obelisco, C2 trombone, D2 filete duplo) não fazem parte do sistema.


---

## Consuming this system (generated — do not edit)

Every path named below is under `project/` in this design system: read `project/api/tokens.md`, not `api/tokens.md`.

10 components are documented without a runnable `components/bundle.js`: read each component’s card, and its README where it has one (`components/<Comp>/README.md`), and build to those guidelines. Tokens: the values are on `api/tokens.md`; a Slides deck or Design canvas also takes `tokens.json` by file path. On a Design canvas, also copy `tokens.css` to `project/ds/<folder>/tokens.css` in the call that installs this system, and link it in each artboard that uses this system, right after the `support.js` line and before the system’s other stylesheets: `<link rel="stylesheet" href="ds/<folder>/tokens.css">` (with one `../` in front for each folder the artboard is in).

**Read, per thing:** a component’s props, parts and examples: `api/components/<Comp>.md`; token values: `api/tokens.md`; stored assets and their paths: `api/assets/<Group>.md`. After this README, fetch the cards and fonts you need in ONE message as parallel calls — none depends on another.

**Two rules.** Before you use a thing — a component, a token group, an icon, an asset — read its card from the index below; a value you did not read from a card is a guess. `tokens.json`, `manifest.json` and `design-system.json` are sources for tools: hand them over. `components/<Comp>/README.md` and `assets/<Group>/README.md` are the long-form second read a card links to; `SKILL.md` and `artifact-type/` beside them are authoring guidance, not needed to consume the system.

## Index (generated — do not edit)

**Tokens**

- `api/tokens.md` — Every token: fill, palette, type, spacing, radius. (8.5k)

**Icons and assets**

- `api/assets/Logos.md` — 8 files, by asset id. (2.2k)
- `api/assets/Cavaleiro.md` — 4 files, by asset id. (1.9k)

**Components** (`api/components/<Comp>.md`, 10)

- **Seções especiais**: `BocaNoTrombone` — Card de denúncias do leitor (Elemento C1, "Megafone"): fundo verde-mata, botão vermelho e marca d'água de megafone em gravura · `CotacaoAgro` — Faixa de largura total com as cotações do campo (Elemento D1, "Filete cheio"), em fundo verde muito escuro · `RadarOficial` — Card do Radar Oficial (Elemento B2, "Colunata"): o que a Prefeitura publica no Diário Oficial, com ícone de colunata, tags em cápsula e o cavaleiro como marca…
- **Estrutura**: `Cabecalho` — Header verde-mata do portal, com a barra de leitura no topo extremo, em duas versões: desktop e mobile
- **Conteúdo**: `CardNoticia` — Manchete principal e cards de notícia da Home, em três formas: manchete, card vertical e card compacto com miniatura à direita · `Loterias` — Widget lateral com os últimos sorteios (Mega-Sena, Quina, Lotofácil), com barra verde e dezenas em chips · `Plantao` — Bloco lateral de notícias de última hora, com barra verde e itens com chapéu de horário e miniatura
- **Navegação**: `Editorias` — Pílulas de editoria seguidas do filete A1 "Degraus", logo abaixo do header verde-mata
- **Marca**: `Logo` — A marca "O NIOAQUENSE" com o cavaleiro, em quatro tintas, sempre como imagem · `SeloApuracao` — Selo circular "Apurado pela redação", com o cavaleiro verde, que marca conteúdo conferido pela equipe do portal
