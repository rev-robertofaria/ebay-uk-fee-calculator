/* eBay UK fee engine — pure functions, no DOM.
 * Plain script: exposes globalThis.EbayFees so it also works when index.html
 * is opened from the file system. Node tests import it as a module and read
 * the same global.
 * All money in GBP. Each fee line is rounded to the penny (half up),
 * which matches how eBay shows fees in Seller Hub order details.
 */
"use strict";

const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;

/* ---------- category helpers ---------- */
function findCategory(rates, id) {
  return rates.business.categories.find((c) => c.id.includes(Number(id)));
}
function rootOf(rates, cat) {
  let c = cat;
  while (c && c.parent) c = rates.business.categories.find((x) => x.name === c.parent);
  return c || cat;
}
/* Variable fee for ONE item whose tiered amount is `amount` (item price + its share of postage). */
function tieredFee(tiers, amount) {
  let fee = 0, prev = 0;
  for (const t of tiers) {
    const cap = t.up_to == null ? Infinity : t.up_to;
    if (amount > prev) fee += (Math.min(amount, cap) - prev) * t.pct / 100;
    prev = cap;
    if (amount <= cap) break;
  }
  return fee;
}
function categoryFee(cat, itemPrice, perItemAmount, qty) {
  // Trainers: flat 7% of the total when the item price (excl. postage) is >= £100
  if (cat.flat_if_item_price_at_least && itemPrice >= cat.flat_if_item_price_at_least.price) {
    return { fee: perItemAmount * qty * cat.flat_if_item_price_at_least.pct / 100, label: `${cat.flat_if_item_price_at_least.pct}% (item ≥ £${cat.flat_if_item_price_at_least.price})` };
  }
  const fee = tieredFee(cat.tiers, perItemAmount) * qty;
  const label = cat.tiers.length === 1 ? `${cat.tiers[0].pct}%` : cat.tiers.map((t) => `${t.pct}%${t.up_to ? ` to £${t.up_to}` : " above"}`).join(", ");
  return { fee, label };
}

/* ---------- Buyer Protection fee (paid by the buyer on UK private listings) ---------- */
function buyerProtectionFee(rates, itemPrice, qty = 1, distinctItems = 1) {
  const b = rates.private.buyer_protection_fee;
  const variable = tieredFee(b.tiers_per_item, itemPrice) * qty;
  const flat = b.flat_per_item * distinctItems; // once per listing for identical items
  return round2(variable + flat);
}
/* Inverse: item price a private seller must set so the buyer sees `displayed` (per unit). */
function privatePriceForDisplayed(rates, displayed) {
  const b = rates.private.buyer_protection_fee;
  let lo = 0, hi = displayed;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (mid + tieredFee(b.tiers_per_item, mid) + b.flat_per_item > displayed) hi = mid; else lo = mid;
  }
  // BPF is rounded to the penny, so step up while the rounded total still fits
  let p = Math.floor(lo * 100) / 100;
  while (round2(p + 0.01 + buyerProtectionFee(rates, p + 0.01)) <= displayed) p = round2(p + 0.01);
  return p;
}

/* ---------- common inputs ----------
 * { itemPrice, qty=1, postageCharged=0, buyerRegion='uk'|'eu_north'|'us_ca'|'other',
 *   itemCost=0, postageCost=0, packaging=0, otherCosts=0, adPct=0,
 *   listingFee=0, upgrades=0, vatRegistered=false, priceIncludesVat=false }
 */
function baseInputs(i) {
  return {
    itemPrice: +i.itemPrice || 0, qty: Math.max(1, Math.round(+i.qty || 1)), postageCharged: +i.postageCharged || 0,
    buyerRegion: i.buyerRegion || "uk", itemCost: +i.itemCost || 0, postageCost: +i.postageCost || 0,
    packaging: +i.packaging || 0, otherCosts: +i.otherCosts || 0, adPct: +i.adPct || 0,
    listingFee: +i.listingFee || 0, upgrades: +i.upgrades || 0,
    vatRegistered: !!i.vatRegistered, priceIncludesVat: !!i.priceIncludesVat,
  };
}
function finish(rates, inp, lines, buyerPays, vatOnFees) {
  const total = round2(inp.itemPrice * inp.qty + inp.postageCharged);
  const feesNet = round2(lines.reduce((s, l) => s + l.amount, 0));
  const vat = vatOnFees ? round2(feesNet * 0.20) : 0;
  if (vat) lines.push({ key: "vat", label: "VAT on fees (20%)", amount: vat });
  const feesTotal = round2(feesNet + vat);
  const outputVat = inp.vatRegistered && inp.priceIncludesVat ? round2(total / 6) : 0;
  const costs = round2(inp.itemCost * inp.qty + inp.postageCost + inp.packaging + inp.otherCosts);
  const netProceeds = round2(total - feesTotal);
  const profit = round2(netProceeds - costs - outputVat);
  return {
    lines, total, buyerPays: round2(buyerPays), feesNet, vat, feesTotal, outputVat, costs, netProceeds, profit,
    marginPct: total ? Math.round(profit / total * 1000) / 10 : 0,
    roiPct: costs ? Math.round(profit / costs * 1000) / 10 : null,
    feesPctOfSale: total ? Math.round(feesTotal / total * 1000) / 10 : 0,
  };
}

/* ---------- BUSINESS ---------- */
function calcBusiness(rates, input) {
  const inp = baseInputs(input);
  const B = rates.business;
  const cat = findCategory(rates, input.categoryId) || findCategory(rates, 99);
  const cat2 = input.secondCategoryId ? findCategory(rates, input.secondCategoryId) : null;
  const total = inp.itemPrice * inp.qty + inp.postageCharged;
  const perItem = inp.itemPrice + inp.postageCharged / inp.qty;
  const lines = [];

  // 1. Final value fee — variable part (higher of two categories)
  let fv = categoryFee(cat, inp.itemPrice, perItem, inp.qty), used = cat;
  if (cat2) { const fv2 = categoryFee(cat2, inp.itemPrice, perItem, inp.qty); if (fv2.fee > fv.fee) { fv = fv2; used = cat2; } }
  let fvfAmount = fv.fee;
  if (input.topRatedPremium) fvfAmount *= 1 - B.top_rated_premium_service_discount_pct / 100;
  lines.push({ key: "fvf", label: `Final value fee — ${used.name} (${fv.label})${input.topRatedPremium ? ", −10% Top Rated" : ""}`, amount: round2(fvfAmount) });

  // 2. Per-order fee
  const po = B.per_order_fee;
  const root = rootOf(rates, used);
  const autoReduced = used.reduced_per_order === "all" || root.reduced_per_order === "all";
  const reduced = total <= po.threshold && (autoReduced || !!input.reducedPerOrder);
  const perOrder = reduced ? po.reduced_up_to_threshold : total <= po.threshold ? po.up_to_threshold : po.above_threshold;
  lines.push({ key: "per_order", label: `Per-order fee${reduced ? " (reduced)" : ""}`, amount: round2(perOrder) });

  // 3. Regulatory operating fee
  lines.push({ key: "rof", label: `Regulatory operating fee (${B.regulatory_operating_fee_pct}%)`, amount: round2(total * B.regulatory_operating_fee_pct / 100) });

  // 4. International fee
  const intlPct = inp.buyerRegion === "uk" ? 0 : B.international_fee_pct[{ eu_north: "eurozone_and_northern_europe", us_ca: "us_and_canada", other: "other_countries" }[inp.buyerRegion]];
  if (intlPct) lines.push({ key: "intl", label: `International fee (${intlPct}%)`, amount: round2(total * intlPct / 100) });

  // 5. Performance surcharge (optional)
  const sp = B.performance_surcharge_pp[input.sellerSurcharge];
  if (sp) lines.push({ key: "surcharge", label: `Performance surcharge (+${sp} pp)`, amount: round2(total * sp / 100) });

  // 6. Promoted Listings (user-entered rate), listing fee, upgrades
  if (inp.adPct) lines.push({ key: "ads", label: `Promoted Listings (${inp.adPct}%)`, amount: round2(total * inp.adPct / 100) });
  if (inp.listingFee) lines.push({ key: "listing", label: "Listing fee", amount: round2(inp.listingFee) });
  if (inp.upgrades) lines.push({ key: "upgrades", label: "Listing upgrades", amount: round2(inp.upgrades) });

  return finish(rates, inp, lines, total, !inp.vatRegistered);
}

/* ---------- PRIVATE (UK-based) ---------- */
function calcPrivate(rates, input) {
  const inp = baseInputs(input);
  const P = rates.private;
  const total = inp.itemPrice * inp.qty + inp.postageCharged;
  const lines = [];
  const bpf = buyerProtectionFee(rates, inp.itemPrice, inp.qty, 1);

  if (input.outsideUK) {
    const O = P.registered_outside_uk;
    const perItem = inp.itemPrice + inp.postageCharged / inp.qty;
    let pct = O.final_value_fee_pct, label = `${pct}%`;
    if (input.trainers && inp.itemPrice >= 100) { pct = O.trainers_item_price_at_least_100.pct; label = `${pct}% (trainers ≥ £100)`; }
    let fvf = perItem * inp.qty * pct / 100;
    if (inp.qty === 1 && perItem > O.single_item_above.threshold) fvf = O.single_item_above.threshold * pct / 100 + (perItem - O.single_item_above.threshold) * O.single_item_above.pct / 100;
    lines.push({ key: "fvf", label: `Final value fee (${label}, seller outside UK)`, amount: round2(fvf) });
    lines.push({ key: "per_order", label: "Per-order fee", amount: round2(O.per_order_fee) });
    lines.push({ key: "rof", label: `Regulatory operating fee (${O.regulatory_operating_fee_pct}%)`, amount: round2(total * O.regulatory_operating_fee_pct / 100) });
  } else {
    lines.push({ key: "fvf", label: "Final value fee (free for UK private sellers)", amount: 0 });
  }
  if (inp.buyerRegion !== "uk" && !input.outsideUK) lines.push({ key: "intl", label: `International fee (${P.international_fee_pct}%)`, amount: round2(total * P.international_fee_pct / 100) });
  // Private fees are quoted inclusive of VAT; ad fees may have VAT added (seen on real orders: 20%)
  if (inp.adPct) lines.push({ key: "ads", label: `Promoted Listings (${inp.adPct}% + VAT)`, amount: round2(total * inp.adPct / 100 * (inp.vatRegistered ? 1 : 1.2)) });
  if (inp.listingFee) lines.push({ key: "listing", label: "Listing fee", amount: round2(inp.listingFee) });
  if (inp.upgrades) lines.push({ key: "upgrades", label: "Listing upgrades", amount: round2(inp.upgrades) });

  const r = finish(rates, inp, lines, total + (input.outsideUK ? 0 : bpf), false);
  r.buyerProtectionFee = input.outsideUK ? 0 : bpf;
  return r;
}

/* ---------- eBay LIVE ---------- */
function calcLive(rates, input) {
  const inp = baseInputs(input);
  const L = rates.live;
  const total = inp.itemPrice * inp.qty + inp.postageCharged;
  const g = input.liveGroup === "coins_bullion_sneakers" ? L.groups.coins_bullion_sneakers : L.groups.all_other;
  const commission = Math.min((inp.itemPrice + inp.postageCharged / inp.qty) * g.commission_pct / 100, g.commission_cap_per_item) * inp.qty;
  const promoOn = input.asOf ? input.asOf <= "2026-12-31" : true;
  const perOrder = promoOn && total <= 10 ? L.promotion.per_order_fee_orders_up_to_10 : L.per_order_fee;
  const lines = [
    { key: "commission", label: `Commission (${g.commission_pct}%, cap £${g.commission_cap_per_item}/item)`, amount: round2(commission) },
    { key: "processing", label: `Payment processing (${L.payment_processing_pct}%)`, amount: round2(total * L.payment_processing_pct / 100) },
    { key: "per_order", label: `Per-order fee${perOrder < L.per_order_fee ? " (promotion to 31/12/2026)" : ""}`, amount: round2(perOrder) },
  ];
  if (inp.adPct) lines.push({ key: "ads", label: `Promoted Listings (${inp.adPct}%)`, amount: round2(total * inp.adPct / 100) });
  return finish(rates, inp, lines, total, !inp.vatRegistered);
}

/* ---------- inverse: price needed for a target ---------- */
function priceForTarget(rates, mode, input, target) {
  // target: { profit: £ } or { marginPct: % }. Returns item price per unit (2 dp) or null.
  const f = { business: calcBusiness, private: calcPrivate, live: calcLive }[mode];
  const ok = (p) => { const r = f(rates, { ...input, itemPrice: p }); return target.profit != null ? r.profit >= target.profit : r.marginPct >= target.marginPct; };
  let lo = 0, hi = 10;
  while (!ok(hi) && hi < 1e7) hi *= 2;
  if (hi >= 1e7) return null;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (ok(mid)) hi = mid; else lo = mid; }
  return Math.ceil(hi * 100) / 100;
}

globalThis.EbayFees = { round2, findCategory, tieredFee, buyerProtectionFee, privatePriceForDisplayed, calcBusiness, calcPrivate, calcLive, priceForTarget };
