Manchete principal e cards de notícia da Home, em três formas: manchete, card vertical e card compacto com miniatura à direita.

A manchete (`nq-manchete`) abre com filete de 3 px em `verde-institucional`, chapéu, título em `manchete-web` (`manchete-mobile` no mobile), linha-fina e meta, e termina com foto 4:3 (`nq-foto-43`). Não leva o box "Direto ao Ponto". O card vertical (`nq-card nq-card-v`) tem foto de 150 px, chapéu, `titulo-card`, `resumo` e meta. No mobile use o card compacto (`nq-card-c`): miniatura de 96 px à direita, título em `titulo-card-mobile` com no máximo 4 linhas e sem resumo; é ele que faz a segunda notícia caber na primeira dobra de 390 × 844.

O chapéu leva bolinha: `vermelho` com texto `vermelho-texto` para Política e Região, `verde-institucional` para Saúde (use a variável `--c` na classe `nq-chapeu`). Quem consome fornece foto (ou `foto-reserva`), chapéu, título, resumo, fonte e horário. Horários em `meta`, com números tabulares.
