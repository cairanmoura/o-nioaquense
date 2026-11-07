# Backlog interno: perfil das autoridades (`/autoridades/[slug]`)

Documento interno. **Nada daqui aparece no site público** até haver dado real integrado
(regra do projeto: zero dados fictícios, sem placeholder vazio).

Já publicado: cabeçalho, pódio (subsídio, custo total, diárias), diárias e reembolsos,
produção legislativa (vereadores) e salário mês a mês, tudo com dados da Quality e da Instar.

## Fases futuras

1. **Integração TSE (DivulgaCandContas 2024)**
   Votos recebidos em Nioaque, bens declarados, evolução patrimonial, receitas e despesas
   de campanha e principais doadores.

2. **Custo de gabinete por vereador**
   Cruzar as Portarias de Nomeação (JSON de Legislação da Instar) com a folha da Quality para
   descobrir quais assessores estão lotados no gabinete de cada um dos 9 vereadores e somar o
   custo total do gabinete.

3. **Assiduidade e votações (atas plenárias)**
   Presenças e faltas nas sessões de terça-feira. Depende da resposta do e-SIC (atas digitadas)
   ou de um pipeline multimodal para ler atas manuscritas.

4. **Emendas impositivas / parlamentares**
   Rastrear a destinação de emendas individuais no orçamento municipal (LOA).

## Notas técnicas do que já existe

- Histórico da folha: chave `folha:hist:AAAA` em `transparencia_cache` (competência → autoridade
  → base, bruto, descontos, líquido). Alimentado pelos passos `folha` (primeiro escalão) e
  `folhacamara` (vereadores) da rodada semanal. Competência com folha não fechada não entra.
- Em 2026 o histórico foi preenchido de janeiro em diante com `.tmp/backfill.ts` (local).
- O card para redes sociais reaproveita os desenhos de `prefeitura-export.ts` e
  `transparencia-export.ts` (1080x1440).
