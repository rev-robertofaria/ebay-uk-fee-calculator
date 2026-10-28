# SPEC — eBay UK Fee Calculator (v1)

Documento interno (PT). Interface do produto em inglês britânico. Status: aprovado para construção após auditoria de 28/10/2026.

## 1. Objetivo
Calculadora gratuita, pública e offline de taxas e lucro no eBay.co.uk, para vendedores **Business** e **Private** do Reino Unido (e **eBay Live**). Um único `index.html`, sem bibliotecas externas, instalável como app. Funciona em computador, tablet e telemóvel (Android, iPhone/iPad, Mac).

## 2. Fonte de verdade
`data/rates.json` — transcrito dos PDFs oficiais (páginas eBay atualizadas 30/09/2026, verificadas 28/10/2026). Auditoria automática: 74 IDs, 14 percentagens e 9 limiares iguais à fonte. Qualquer alteração de taxa muda só este ficheiro + `verified_on`.

## 3. Modos e regras de cálculo

### 3.1 Business (taxas sem IVA)
```
total       = Σ(item_price × qty) + postage_charged          # "total amount of the sale"
fvf_var     = Σ por item: tiers(categoria, item_price + postage/qty)   # tiers calculados por item
              trainers: 7% flat se item_price ≥ £100 (item_price exclui portes)
              2 categorias: aplica-se a maior taxa
per_order   = total ≤ £10 ? 0.30 : 0.40                       # 1× por pedido
              reduzida 0.10 (total ≤ £10) se Home, Furniture & DIY (auto) ou Collectables elegível (checkbox)
rof         = 0.35% × total
intl        = total × {UK 0 | Eurozone+N.Europe 1.05% | US+Canada 1.8% | Other 2.0%}
ads         = promoted_pct × total                            # opcional
surcharge   = total × {0 | +6pp | +7pp | +4pp | +5pp}          # desempenho, opcional
discount    = Top Rated Premium Service ? −10% × fvf_var : 0  # opcional
listing     = taxa por anúncio conforme nível de loja (0.30 / 0.10 / 0.05 / 0) + upgrades opcionais
fees_net    = fvf_var − discount + per_order + rof + intl + ads + surcharge + listing
vat         = VAT registered ? 0 (recuperável) : 20% × fees_net
fees_total  = fees_net + vat
```
Premissa declarada na UI: o limiar de £10 do per-order usa o total com portes.

### 3.2 Private (UK) (taxas com IVA)
```
fvf = 0 · rof = 0 · intl = 3% × total se entrega fora do UK
listing = 0 até 300/mês (400 com loja £19.99), depois £0.35
upgrades opcionais
```
Nota na UI: Simple Delivery (comprador paga portes).
**Buyer Protection fee** (oficial, paga pelo comprador, com IVA; base = preço do item, sem portes):
```
bpf_var  = Σ por item: 7% até £20 + 4% de £20–£300 + 2% de £300–£4,000 + 0% acima
bpf_flat = £0.10 por item distinto (1× por anúncio em quantidades iguais)
buyer_sees = item_price + bpf  (+ postage)
```
Exemplos oficiais usados nos testes: £5 → £0.45 · £20 → £1.50 · £1,500 → £36.70 · £7,500 → £86.70 · 2× £20 iguais → £2.90.
Sub-opção: *Private seller registered outside the UK* → 12.8% + 30p, 3% acima de £5,000 (item único), ROF 0.42%, trainers 8% + 30p (item ≥ £100).

### 3.3 eBay Live (sem IVA)
```
commission = min(6% × total, £100/item)   (4% para Coins/Bullion/Sneakers)
processing = 2.42% × total
per_order  = 0.30 (0.10 até 31/12/2026 se total ≤ £10)
```

### 3.4 Lucro
```
net_proceeds = total − fees_total
profit       = net_proceeds − item_cost×qty − postage_cost − packaging − other_costs
             − (VAT registered && price_includes_vat ? total/6 : 0)
margin       = profit / total · roi = profit / costs
```

### 3.5 Inverso
Dado custo + margem alvo (%) ou lucro alvo (£) → preço mínimo por bissecção (tiers tornam a função não linear). Mostrar também break-even.

### 3.6 Comparador Private vs Business
Mesmo item, lado a lado: o que o **comprador paga** (Private: item + BPF; Business: item), o que o **vendedor recebe**, lucro, e o "preço Business equivalente" = preço que dá ao comprador o mesmo total e/ou ao vendedor o mesmo líquido.

## 4. Interface
- Tabs: **Calculator · Compare · Rates · About**.
- Entradas: mode, category (pesquisa + lista completa, com exceções indentadas), 2nd category (opcional), item price, quantity, postage charged, buyer location, item cost, postage cost, packaging, other costs; *Advanced*: shop level, listing fee, upgrades, promoted %, seller level, Top Rated Premium, VAT registered, price includes VAT, reduced per-order (Collectables).
- Saída: tabela de taxas linha a linha (com % e base), líquido, lucro, margem, ROI; aviso "estimate".
- Rates: tabela completa pesquisável + data de verificação + links oficiais.
- About: "Not affiliated with eBay", privacidade (nada sai do dispositivo), licença MIT, fontes, limitações (§8).
- Estado nos parâmetros da URL (partilhar cenário) + último cenário em localStorage.

## 5. Compatibilidade (requisito do Roberto)
| Alvo | Como garantir |
|---|---|
| Telemóvel/tablet | layout 1 coluna < 720px, inputs `inputmode="decimal"`, fonte ≥ 16px (evita zoom no iOS), alvos ≥ 44px |
| iPhone/iPad (Safari) | manifest + `apple-touch-icon` + `apple-mobile-web-app-capable`; sem `dvh`, sem CSS nesting, sem container queries (baseline **Safari 15**, por causa dos MacBook 2012) |
| Mac/Windows/Linux | Chrome, Edge, Firefox, Safari; PWA instalável no Chrome/Edge |
| Offline | service worker (cache-first para a página + rates.json) |
| Acessibilidade | labels associados, contraste AA, navegação por teclado, dark mode |
| Teste | Playwright/Chromium em 390×844, 820×1180, 1440×900; testes unitários do motor (`node test-fees.mjs`) com exemplos calculados à mão |

Limitação: não há WebKit nesta sessão; teste real em iPhone/iPad/Mac fica com o Roberto.

## 6. Ficheiros
```
index.html            página única (CSS+JS inline, carrega data/rates.json; fallback embutido)
data/rates.json       taxas oficiais
sw.js, manifest.webmanifest, icons/
test-fees.mjs         testes do motor
README.md (EN) · SPEC.md · MEMORIA-PROJETO.md (PT) · LICENSE (MIT) · .nojekyll
```

## 6b. Alterações agendadas (aviso visível no README, no rates.json e na aba About da app)
- 01/12/2026 — conversão de moeda 2.5% → 2.75% (só anúncios noutros sites eBay).
- 31/12/2026 — fim da promoção eBay Live (£0.10 → £0.30 por pedido ≤ £10).
A app mostra um banner "Rates change on <data>" a partir de 14 dias antes e "Rates verified on <data>" sempre.

## 7. Fora de escopo v1
Motors; anúncios noutros sites eBay (taxas desse site + conversão 2.5%/2.75%); créditos de taxas em reembolsos; preço de etiquetas de portes; Etsy/Vinted (repositório próprio no futuro).

## 8. Pendências abertas
- [x] Buyer Protection fee — fonte oficial recebida 28/10/2026.
- [ ] Lista das "selected Collectables categories" com per-order 10p (eBay só dá link "Learn more").
- [ ] Confirmar no Seller Hub, após 1ª venda Business, a base do limiar £10 (com ou sem portes).
- [ ] Ativar GitHub Pages (Roberto) após o 1º deploy do `index.html`.
