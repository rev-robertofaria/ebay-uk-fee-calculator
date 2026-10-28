# MEMORIA-PROJETO — ebay-uk-fee-calculator

## Objetivo
Calculadora pública e gratuita de taxas e lucro para vendedores do eBay.co.uk (GBP), num único HTML, offline. Interface em inglês britânico.

## Decisões
| Data | Decisão | Motivo |
|---|---|---|
| 28/10/2026 | Repositório público, com todas as categorias | Disponibilizar a vendedores do Reino Unido |
| 28/10/2026 | Dados de vendas do Roberto NÃO entram no repo | Dados de negócio privados; o repo público leva só taxas |
| 28/10/2026 | Taxas em `data/rates.json`, com fontes e data | Atualizar só um ficheiro quando o eBay mudar |
| 28/10/2026 | Modos Business, Private e eBay Live | Público do UK inclui vendedores privados |
| 28/10/2026 | Aviso "Not affiliated with eBay", sem logótipo | Evitar confusão com ferramenta oficial |

## Histórico
- 28/10/2026 — Repo criado pelo Roberto. `rates.json` gerado a partir dos PDFs oficiais (business, private, Live; atualizados em 30/09/2026): 55 categorias/exceções. Próximo passo: página da calculadora.
- 28/10/2026 — Auditoria do rates.json contra o PDF (74 IDs, 14 %, 9 limiares: OK). Lacunas corrigidas: private fora do UK (12.8%+30p, ROF 0.42%), upgrades de leilão, 2 categorias, promoted, premissa do limiar £10, Buyer Protection fee marcada como não verificada. SPEC v1 escrito; LICENSE MIT.
- 28/10/2026 — Buyer Protection fee verificada (2 PDFs oficiais) e registada. Aviso das alterações de 01/12/2026 e 31/12/2026 no README, rates.json (meta.scheduled_changes) e SPEC §6b.
- 28/10/2026 — Fase 1: motor `fees.js` (Business, Private UK/fora do UK, Live, BPF, inverso, match a displayed price) + `test-fees.mjs` com 61 asserções: exemplos oficiais da BPF, 2 encomendas reais (sem dados pessoais), tiers, 2 categorias, trainers, per-order reduzido, internacional, IVA, Live. 61/61 OK. Escopo fechado: ad rate e portes só como campos livres.
- 28/10/2026 — Fase 2: `index.html` (Calculator, Compare, Rates, About), manifest, SW, ícones, nota de responsabilidade (About, rodapé, README), crédito 'Made by Roberto Faria'. Testado em Chromium 390/820/1440: sem erros, sem scroll horizontal, inputs 16px, instalável, offline OK; valores das 2 encomendas reais e do cenário concorrente conferem. Falta: Roberto ativar o GitHub Pages; teste real em iPhone/iPad/Mac.
