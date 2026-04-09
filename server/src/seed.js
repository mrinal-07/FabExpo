import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { connectDb } from "./lib/db.js";
import { RedemptionOffer } from "./models/RedemptionOffer.js";
import { VoucherStock } from "./models/VoucherStock.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

function demoCodes(prefix, n) {
  return Array.from({ length: n }, (_, i) => `${prefix}-DEMO-${String(i + 1).padStart(4, "0")}`);
}

async function main() {
  await connectDb();

  let myntra = await RedemptionOffer.findOne({ partnerKey: "myntra", title: /Myntra/i });
  if (!myntra) {
    myntra = await RedemptionOffer.create({
      partnerKey: "myntra",
      title: "Myntra gift voucher",
      description: "Demo codes for development. Replace with real partner codes in production.",
      valueLabel: "₹500",
      pointsCost: 500,
      active: true
    });
    console.log("Created offer:", myntra.title);
  }

  let nykaa = await RedemptionOffer.findOne({ partnerKey: "nykaa", title: /Nykaa/i });
  if (!nykaa) {
    nykaa = await RedemptionOffer.create({
      partnerKey: "nykaa",
      title: "Nykaa gift voucher",
      description: "Demo codes for development. Replace with real partner codes in production.",
      valueLabel: "₹500",
      pointsCost: 500,
      active: true
    });
    console.log("Created offer:", nykaa.title);
  }

  for (const [offer, prefix] of [
    [myntra, "MYNTRA"],
    [nykaa, "NYKAA"]
  ]) {
    const codes = demoCodes(prefix, 20);
    let inserted = 0;
    for (const code of codes) {
      try {
        await VoucherStock.create({ offerId: offer._id, code });
        inserted++;
      } catch (e) {
        if (e?.code === 11000) continue;
        throw e;
      }
    }
    console.log(`Vouchers for ${offer.partnerKey}: +${inserted} (skipped if duplicate)`);
  }

  console.log("Seed done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
