Card de denúncias do leitor (Elemento C1, "Megafone"): fundo verde-mata, botão vermelho e marca d'água de megafone em gravura.

O card (`nq-boca`) é `verde-mata`, com `radius-md` e padding de 28 × 24 px. O título "Boca no Trombone" usa `titulo-secao` em `on-verde`; a frase "Sua denúncia muda a cidade" fica em `verde-texto-forte` e o texto de apoio em `verde-texto-suave`, no máximo 360 px de largura. O botão "Enviar denúncia" é `nq-btn` em `vermelho` com texto `on-vermelho`, altura de 48 px. A marca d'água de megafone (`wm`, 230 × 150 px, traço `on-verde`, opacidade 8%) fica no canto inferior direito, cortada pelo card, sem capturar clique. O SVG está no `preview.html`.

Quem consome fornece o destino do botão e o texto de apoio. Não use a marca d'água com opacidade maior: o texto precisa manter o contraste de `verde-texto-suave` sobre `verde-mata`.
