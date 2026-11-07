# Vereadores de Nioaque: nomes e apelidos

Legislatura 2025-2028. Mandato dos vereadores: 01/01/2025 a 31/12/2026. Mesa Diretora do biênio 2025-2026.

Fonte dos dados: `src/data/autoridades.json` (extraído do portal oficial da Câmara, https://www.cmnioaque.ms.gov.br/portal/legislaturas/1/legislatura-2025-2028/). Os apelidos da última coluna são os usados pelo site para reconhecer o vereador em títulos de proposições, notícias e diárias (`src/lib/camara-vereadores.ts`).

## Tabela

| Cargo na Câmara | Nome civil | Nome político | Partido | Identificador (slug) na Transparência |
|---|---|---|---|---|
| Presidente | Reinaldo Garcia Andréa | Nado Andréa | PP | `reinaldo-andrea` |
| Vice-presidente | Sérgio Marques | Sérgio Marques | PT | `sergio-marques` |
| 1º Secretário | João Carlos Vera Gonçalves | Corumbá | PL | `joao-goncalves` |
| 2º Secretário | Silas Nunes Ferreira | Silas Ferreira | PSDB | `silas-ferreira` |
| Vereador | Jeuzimar Mendes de Araújo | Seco do Esporte | PSDB | `jeuzimar-araujo` |
| Vereador | Jorge Fernandes Lemes | Jorge do Uirapuru | PP | `jorge-lemes` |
| Vereador | Pablo Ruan Pache Corrêa | Pablo Corrêa | PSDB | `pablo-correa` |
| Vereador | Paulo Roberto Meira Simão | Neguinho da Santa Amélia | PV | `paulo-simao` |
| Vereadora | Rosemeire Meza Arruda | Rose Arruda | PP | `rosemeire-arruda` |

## Apelidos e variações de escrita reconhecidos

1. **Reinaldo Garcia Andréa**: Reinaldo Garcia Andréa; Reinaldo G. Andréa; Reinaldo Andréa; Nado Andréa; Nado.
2. **Sérgio Marques**: Sérgio Marques; Sergio Marques; Sérgio Terena.
3. **João Carlos Vera Gonçalves**: João Carlos Vera Gonçalves; João Carlos; João Gonçalves; Corumbá.
4. **Silas Nunes Ferreira**: Silas Nunes Ferreira; Silas Ferreira; Silas.
5. **Jeuzimar Mendes de Araújo**: Jeuzimar Mendes de Araújo; Jeuzimar Araújo; Jeuzimar; Seco do Esporte; Vereador Seco; Seco.
6. **Jorge Fernandes Lemes**: Jorge Fernandes Lemes; Jorge F. Lemes; Jorge Lemes; Jorge do Uirapuru.
7. **Pablo Ruan Pache Corrêa**: Pablo Ruan Pache Corrêa; Pablo R. P. Corrêa; Pablo Corrêa; Pablo.
8. **Paulo Roberto Meira Simão**: Paulo Roberto Meira Simão; Paulo Roberto M. Simão; Paulo Roberto; Paulo Simão; Neguinho da Santa Amélia; Neguinho.
9. **Rosemeire Meza Arruda**: Rosemeire Meza Arruda; Rosemeire M. Arruda; Rosemeira M Arruda (grafia errada que aparece no portal); Rose Arruda; Rose.

## Regras de uso no site

- **O campo Autor do portal manda.** Quando o título de uma proposição cita um vereador e o campo Autor indica outro, o site considera o Autor. Isso foi conferido nos PDFs de vários casos (3296, 3314, 3335, 3508 e a Indicação 07/2026).
- Em textos com apelido, o apelido é ignorado ao classificar bairros e locais, para que "Jorge do Uirapuru" não seja lido como o assentamento Uirapuru, nem "Neguinho da Santa Amélia" como a localidade Santa Amélia.
- O telefone, o e-mail, o Instagram e a biografia de cada vereador ficam em `src/data/autoridades.json`. Este documento não repete esses dados para não ficarem desatualizados em dois lugares.
- A Mesa Diretora do biênio termina em 31/12/2026. Depois disso, atualizar os cargos no JSON e aqui.
