# eBay UK Fee Calculator

Free fee and profit calculator for sellers on **eBay.co.uk** (GBP). Single HTML file, works offline.

> ⚠️ **Rate changes scheduled**
> - **01/12/2026** — seller currency conversion charge rises from **2.5% to 2.75%** (UK-registered sellers; only when eBay converts funds for items listed/sold on another eBay site).
> - **31/12/2026** — eBay Live promotion ends: £0.10 per-order fee on orders ≤ £10 reverts to £0.30.
>
> This repository will be updated when the changes take effect. Full list: `data/rates.json` → `meta.scheduled_changes`.

> **Please note.** This calculator is the result of careful work transcribing and testing eBay's published fee rules, but it is not guaranteed to be free of errors. Treat the figures as a close estimate of what you will pay, and always confirm against [eBay.co.uk](https://www.ebay.co.uk/help/selling/fees-credits-invoices/fees-business-sellers-activated-managed-payments?id=4809) and your own Seller Hub order details before setting prices.
>
> Not affiliated with, endorsed by or sponsored by eBay Inc. eBay is a trademark of eBay Inc.

## Status
- [x] Official rate table (`data/rates.json`): business, private and eBay Live, all categories and exceptions
- [x] Fee engine (`fees.js`) with tests (`node test-fees.mjs`, 66 assertions)
- [x] Calculator page (`index.html`): Business, Private, eBay Live; Private vs Business comparison; full rate table; installable, offline
- [x] Published on GitHub Pages: https://rev-robertofaria.github.io/ebay-uk-fee-calculator/

## Use it
- Online: https://rev-robertofaria.github.io/ebay-uk-fee-calculator/
- Offline / installed: Chrome or Edge → **Install**; iPhone or iPad → Share → **Add to Home Screen**. Works without internet after the first visit.
- Locally: clone the repo and open `index.html` in any modern browser (Safari 15+, Chrome, Edge, Firefox). No build step.

## Develop
```
node test-fees.mjs      # 66 assertions: eBay's official examples + anonymised real orders
node build-rates.mjs    # regenerate data/rates.js after editing data/rates.json
```
After changing `index.html`, `fees.js` or `data/rates.js`, bump `CACHE` in `sw.js`.

## Rates
| | |
|---|---|
| Source pages last updated | 30/09/2026 |
| Verified on | 28/10/2026 |
| Coverage | All eBay.co.uk categories except Motors (cars, motorcycles, vehicles) |

What `data/rates.json` covers:
- **Business sellers:** final value fee by category (including tiered rates per item), per-order fee (£0.30 / £0.40, reduced £0.10 in Home, Furniture & DIY and selected Collectables), 0.35% regulatory operating fee, international fee, listing fees by Shop level, performance surcharges. Fees are **exclusive of VAT**.
- **Private sellers (UK):** no final value fee; listing allowance, international fee (3%), upgrades; **Buyer Protection fee** paid by the buyer (£0.10 + 7% to £20, 4% to £300, 2% to £4,000). Fees are **inclusive of VAT**.
- **eBay Live:** commission + payment processing.
- **Seller currency conversion charge:** 2.5%, rising to **2.75% from 01/12/2026** (only when eBay converts funds for items listed or sold on another eBay site).

Sources:
- [Fees for business sellers](https://www.ebay.co.uk/help/selling/fees-credits-invoices/fees-business-sellers-activated-managed-payments?id=4809)
- [Fees for private sellers](https://www.ebay.co.uk/help/selling/fees-credits-invoices/fees-private-sellers-activated-managed-payments?id=4822)
- [Buyer Protection fee](https://www.ebay.co.uk/help/buying/paying-items/buyer-protection-fee?id=5594) · [Buyer Protection – information for sellers](https://www.ebay.co.uk/help/selling/selling/pricing-items/buyer-protection-information-sellers?id=5595)
- [eBay Live selling fees](https://www.ebay.co.uk/help/selling/ebay-live/ebay-live-selling-fees?id=5870)
