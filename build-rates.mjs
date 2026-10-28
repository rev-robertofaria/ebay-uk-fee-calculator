// Run after editing data/rates.json:  node build-rates.mjs
// Generates data/rates.js (a plain script) so index.html works offline and from the file system.
import { readFileSync, writeFileSync } from "node:fs";
const json = readFileSync(new URL("./data/rates.json", import.meta.url), "utf8");
const data = JSON.parse(json);
writeFileSync(new URL("./data/rates.js", import.meta.url),
  "// GENERATED from data/rates.json by build-rates.mjs — do not edit by hand\n" +
  "globalThis.EBAY_RATES = " + JSON.stringify(data) + ";\n");
console.log("data/rates.js written, verified_on", data.meta.verified_on);
