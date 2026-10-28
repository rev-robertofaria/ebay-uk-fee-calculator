// Run: node test-fees.mjs
import { readFileSync } from "node:fs";
import "./fees.js";
const { calcBusiness, calcPrivate, calcLive, buyerProtectionFee, privatePriceForDisplayed, priceForTarget, findCategory } = globalThis.EbayFees;
import { execFileSync } from "node:child_process";

const rates = JSON.parse(readFileSync(new URL("./data/rates.json", import.meta.url), "utf8"));
let n = 0, failed = 0;
const eq = (name, got, want) => { n++; const ok = Math.abs(got - want) < 0.005; if (!ok) { failed++; console.log(`FAIL ${name}: got ${got}, want ${want}`); } };
const line = (r, key) => (r.lines.find((l) => l.key === key) || { amount: 0 }).amount;

/* --- Buyer Protection fee: official examples (eBay help pages) --- */
eq("BPF £5 mug", buyerProtectionFee(rates, 5), 0.45);
eq("BPF £20 headphones", buyerProtectionFee(rates, 20), 1.50);
eq("BPF £1,500 handbag", buyerProtectionFee(rates, 1500), 36.70);
eq("BPF £7,500 watch (cap above £4,000)", buyerProtectionFee(rates, 7500), 86.70);
eq("BPF 2× £20 identical (flat once)", buyerProtectionFee(rates, 20, 2, 1), 2.90);
eq("BPF £60 + £20 different items", buyerProtectionFee(rates, 60, 1, 1) + buyerProtectionFee(rates, 20, 1, 1), 4.60);

/* --- Real private orders (Seller Hub, Oct 2026; no personal data) --- */
// Order A: 1 × £3.64, free postage, label £0.91, Promoted Listings 18% (+VAT) → earnings £1.94
let r = calcPrivate(rates, { itemPrice: 3.64, qty: 1, postageCost: 0.91, adPct: 18 });
eq("Order A BPF", r.buyerProtectionFee, 0.35);
eq("Order A buyer pays", r.buyerPays, 3.99);
eq("Order A ad fee", line(r, "ads"), 0.79);
eq("Order A earnings", r.profit, 1.94);
// Order B: 2 × £3.63 identical, free postage, tracked label £2.90, no ads → earnings £4.36
r = calcPrivate(rates, { itemPrice: 3.63, qty: 2, postageCost: 2.90 });
eq("Order B BPF", r.buyerProtectionFee, 0.61);
eq("Order B buyer pays", r.buyerPays, 7.87);
eq("Order B fees", r.feesTotal, 0);
eq("Order B earnings", r.profit, 4.36);

// Order C: 1 × £3.63, free postage, label £0.91, no ads → Seller Hub earnings £2.72; with item cost £0.27 → £2.45
r = calcPrivate(rates, { itemPrice: 3.63, qty: 1, postageCost: 0.91 });
eq("Order C BPF", r.buyerProtectionFee, 0.35);
eq("Order C buyer pays", r.buyerPays, 3.98);
eq("Order C earnings", r.profit, 2.72);
eq("Order C profit with item cost", calcPrivate(rates, { itemPrice: 3.63, qty: 1, postageCost: 0.91, itemCost: 0.27 }).profit, 2.45);

/* --- Match a displayed price (private) --- */
eq("display £3.99 → set £3.64", privatePriceForDisplayed(rates, 3.99), 3.64);
eq("display £21.50 → set £20.00", privatePriceForDisplayed(rates, 21.50), 20.00);
eq("display £1,536.70 → set £1,500", privatePriceForDisplayed(rates, 1536.70), 1500.00);

/* --- Business: basics --- */
const VG = 1249; // Video Games & Consoles 9.9%
r = calcBusiness(rates, { categoryId: VG, itemPrice: 3.99, qty: 1 });
eq("Biz FVF 9.9% of 3.99", line(r, "fvf"), 0.40);
eq("Biz per-order ≤£10", line(r, "per_order"), 0.30);
eq("Biz ROF 0.35%", line(r, "rof"), 0.01);
eq("Biz VAT 20% on fees", r.vat, 0.14);
eq("Biz fees total", r.feesTotal, 0.85);
r = calcBusiness(rates, { categoryId: VG, itemPrice: 12, postageCharged: 3 });
eq("Biz FVF includes postage (9.9% of 15)", line(r, "fvf"), 1.49);
eq("Biz per-order >£10", line(r, "per_order"), 0.40);
r = calcBusiness(rates, { categoryId: VG, itemPrice: 3.99, vatRegistered: true });
eq("Biz VAT registered → no VAT line", r.vat, 0);
eq("Biz VAT registered, price incl. VAT → output VAT", calcBusiness(rates, { categoryId: VG, itemPrice: 12, vatRegistered: true, priceIncludesVat: true }).outputVat, 2.00);

/* --- Business: tiers per item, two categories, trainers, reduced per-order --- */
r = calcBusiness(rates, { categoryId: 139971, itemPrice: 500 }); // consoles: 6.9% to £400, 2% above
eq("Console £500 tiered", line(r, "fvf"), 29.60);
r = calcBusiness(rates, { categoryId: 139971, itemPrice: 500, qty: 2 }); // tiers per item, not per order
eq("2 consoles £500 each = 2× tiered", line(r, "fvf"), 59.20);
r = calcBusiness(rates, { categoryId: 11233, secondCategoryId: 619, itemPrice: 100 }); // Music 9.9 vs Instruments 10.9 → higher
eq("Two categories → higher (10.9%)", line(r, "fvf"), 10.90);
r = calcBusiness(rates, { categoryId: 15709, itemPrice: 120, postageCharged: 5 }); // trainers ≥ £100 → 7% of total
eq("Trainers ≥£100 flat 7%", line(r, "fvf"), 8.75);
r = calcBusiness(rates, { categoryId: 15709, itemPrice: 99 });
eq("Trainers <£100 → 11.9%", line(r, "fvf"), 11.78);
r = calcBusiness(rates, { categoryId: 26677, itemPrice: 8 }); // Bath (Home, Furniture & DIY) → reduced per-order 10p
eq("Home & DIY reduced per-order", line(r, "per_order"), 0.10);
eq("Bath 10.9%", line(r, "fvf"), 0.87);
r = calcBusiness(rates, { categoryId: 1, itemPrice: 8 }); // Collectables: opt-in only
eq("Collectables default 30p", line(r, "per_order"), 0.30);
eq("Collectables opt-in 10p", line(calcBusiness(rates, { categoryId: 1, itemPrice: 8, reducedPerOrder: true }), "per_order"), 0.10);
eq("Jewellery £1,500: 14.9% to £1,000 + 4% above", line(calcBusiness(rates, { categoryId: 281, itemPrice: 1500 }), "fvf"), 169.00);
eq("Furniture £1,200: 10.9/7.9/3", line(calcBusiness(rates, { categoryId: 3197, itemPrice: 1200 }), "fvf"), 100.00);

/* --- Business: international, surcharge, Top Rated, ads --- */
r = calcBusiness(rates, { categoryId: VG, itemPrice: 100, buyerRegion: "eu_north" });
eq("Intl fee Eurozone 1.05%", line(r, "intl"), 1.05);
eq("Intl fee US 1.8%", line(calcBusiness(rates, { categoryId: VG, itemPrice: 100, buyerRegion: "us_ca" }), "intl"), 1.80);
eq("Intl fee other 2.0%", line(calcBusiness(rates, { categoryId: VG, itemPrice: 100, buyerRegion: "other" }), "intl"), 2.00);
eq("Below Standard +6pp", line(calcBusiness(rates, { categoryId: VG, itemPrice: 100, sellerSurcharge: "below_standard" }), "surcharge"), 6.00);
eq("Top Rated −10% of variable", line(calcBusiness(rates, { categoryId: VG, itemPrice: 100, topRatedPremium: true }), "fvf"), 8.91);
eq("Ads 5% (business, VAT added at the end)", line(calcBusiness(rates, { categoryId: VG, itemPrice: 100, adPct: 5 }), "ads"), 5.00);

/* --- Competitor scenario (business, Joy-Con flex, cost £0.27, label £0.91, packaging £0.10) --- */
r = calcBusiness(rates, { categoryId: VG, itemPrice: 2.29, itemCost: 0.27, postageCost: 0.91, packaging: 0.10 });
eq("Joy-Con 1 unit profit", r.profit, 0.36);
r = calcBusiness(rates, { categoryId: VG, itemPrice: 1.72, qty: 4, itemCost: 0.27, postageCost: 0.91, packaging: 0.10 });
eq("Joy-Con 4 units profit", r.profit, 3.59);

/* --- Private: international, outside UK --- */
eq("Private intl 3%", line(calcPrivate(rates, { itemPrice: 100, buyerRegion: "other" }), "intl"), 3.00);
r = calcPrivate(rates, { itemPrice: 100, outsideUK: true });
eq("Private outside UK 12.8%", line(r, "fvf"), 12.80);
eq("Private outside UK 30p", line(r, "per_order"), 0.30);
eq("Private outside UK ROF 0.42%", line(r, "rof"), 0.42);
eq("Private outside UK no BPF", r.buyerProtectionFee, 0);
eq("Private outside UK £6,000: 12.8% to £5,000 + 3%", line(calcPrivate(rates, { itemPrice: 6000, outsideUK: true }), "fvf"), 670.00);

/* --- eBay Live --- */
r = calcLive(rates, { itemPrice: 100, asOf: "2026-11-01" });
eq("Live commission 6%", line(r, "commission"), 6.00);
eq("Live processing 2.42%", line(r, "processing"), 2.42);
eq("Live per-order 30p", line(r, "per_order"), 0.30);
eq("Live promo 10p ≤£10", line(calcLive(rates, { itemPrice: 8, asOf: "2026-11-01" }), "per_order"), 0.10);
eq("Live promo ended", line(calcLive(rates, { itemPrice: 8, asOf: "2027-01-01" }), "per_order"), 0.30);
eq("Live commission cap £100 (6% of £3,000)", line(calcLive(rates, { itemPrice: 3000 }), "commission"), 100.00);

/* --- Inverse --- */
const p = priceForTarget(rates, "business", { categoryId: VG, itemCost: 0.27, postageCost: 0.91, packaging: 0.10 }, { profit: 1.00 });
eq("price for £1 profit reaches target", calcBusiness(rates, { categoryId: VG, itemPrice: p, itemCost: 0.27, postageCost: 0.91, packaging: 0.10 }).profit >= 1 ? 1 : 0, 1);
eq("price for £1 profit is minimal", calcBusiness(rates, { categoryId: VG, itemPrice: p - 0.02, itemCost: 0.27, postageCost: 0.91, packaging: 0.10 }).profit < 1 ? 1 : 0, 1);

/* --- data sanity --- */
// data/rates.js (loaded by index.html) must be generated from data/rates.json
const ratesJs = readFileSync(new URL("./data/rates.js", import.meta.url), "utf8");
eq("rates.js in sync with rates.json", ratesJs.includes(JSON.stringify(rates)) ? 1 : 0, 1);
eq("74 category ids", new Set(rates.business.categories.flatMap((c) => c.id)).size, 74);
eq("Everything Else exists", findCategory(rates, 99) ? 1 : 0, 1);

console.log(`${n - failed}/${n} assertions passed${failed ? ` — ${failed} FAILED` : ""}`);
process.exit(failed ? 1 : 0);
