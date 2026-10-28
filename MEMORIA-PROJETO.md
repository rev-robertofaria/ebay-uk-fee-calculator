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
