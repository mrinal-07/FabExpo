import express from "express";
import { z } from "zod";

import { RedemptionOffer } from "../models/RedemptionOffer.js";
import { VoucherStock } from "../models/VoucherStock.js";
import { Redemption } from "../models/Redemption.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireAdminKey } from "../middleware/adminKey.js";
import { PointsLedger } from "../models/PointsLedger.js";

export const redemptionsRouter = express.Router();

// Authenticated catalog (Myntra / Nykaa–style offers)
redemptionsRouter.get("/catalog", requireAuth(), async (req, res) => {
  const offers = await RedemptionOffer.find({ active: true }).sort({ pointsCost: 1 }).lean();
  const withStock = await Promise.all(
    offers.map(async (o) => {
      const available = await VoucherStock.countDocuments({ offerId: o._id, redeemedBy: null });
      return { ...o, availableCount: available };
    })
  );
  res.json({ offers: withStock });
});

redemptionsRouter.get("/mine", requireAuth(), requireRole("user"), async (req, res) => {
  const rows = await Redemption.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ redemptions: rows });
});

const redeemSchema = z.object({
  offerId: z.string().min(1)
});

redemptionsRouter.post("/redeem", requireAuth(), requireRole("user"), async (req, res) => {
  const parsed = redeemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid offer" });

  const offer = await RedemptionOffer.findById(parsed.data.offerId).lean();
  if (!offer || !offer.active) return res.status(404).json({ error: "Offer not found" });
  const now = new Date();
  if (offer.startsAt && now < new Date(offer.startsAt)) return res.status(400).json({ error: "Offer not started yet" });
  if (offer.endsAt && now > new Date(offer.endsAt)) return res.status(400).json({ error: "Offer expired" });

  const cost = offer.pointsCost;

  const updatedUser = await User.findOneAndUpdate(
    { _id: req.user._id, pointsBalance: { $gte: cost } },
    { $inc: { pointsBalance: -cost } },
    { new: true }
  );

  if (!updatedUser) {
    return res.status(400).json({ error: "Not enough points" });
  }

  const voucher = await VoucherStock.findOneAndUpdate(
    { offerId: offer._id, redeemedBy: null },
    { $set: { redeemedBy: req.user._id, redeemedAt: new Date() } },
    { new: true }
  );

  if (!voucher) {
    await User.updateOne({ _id: req.user._id }, { $inc: { pointsBalance: cost } });
    return res.status(409).json({
      error: "No voucher codes in stock for this offer. Ask the admin to add codes."
    });
  }

  const redemption = await Redemption.create({
    userId: req.user._id,
    offerId: offer._id,
    partnerKey: offer.partnerKey,
    title: offer.title,
    pointsSpent: cost,
    code: voucher.code
  });

  await PointsLedger.create({
    userId: req.user._id,
    type: "spend",
    amount: -cost,
    balanceAfter: updatedUser.pointsBalance,
    reason: "Voucher redemption",
    ref: { kind: "redemption", id: String(redemption._id) }
  });

  res.json({
    voucherCode: voucher.code,
    partnerKey: offer.partnerKey,
    valueLabel: offer.valueLabel,
    pointsSpent: cost,
    pointsBalance: updatedUser.pointsBalance
  });
});

// Admin refund/reversal (MVP). In real life this is triggered by provider failure / support.
const refundSchema = z.object({
  redemptionId: z.string().min(1)
});

redemptionsRouter.post("/admin/refund", requireAuth(), requireRole("admin"), async (req, res) => {
  const parsed = refundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const redemption = await Redemption.findById(parsed.data.redemptionId);
  if (!redemption) return res.status(404).json({ error: "Not found" });
  if (redemption.status !== "issued") return res.status(400).json({ error: "Already refunded" });

  redemption.status = "refunded";
  redemption.refundedAt = new Date();
  await redemption.save();

  const updatedUser = await User.findOneAndUpdate(
    { _id: redemption.userId },
    { $inc: { pointsBalance: redemption.pointsSpent } },
    { new: true }
  ).lean();

  if (updatedUser) {
    await PointsLedger.create({
      userId: updatedUser._id,
      type: "reversal",
      amount: redemption.pointsSpent,
      balanceAfter: updatedUser.pointsBalance,
      reason: "Redemption refund",
      ref: { kind: "redemption", id: String(redemption._id) }
    });
  }

  res.json({ ok: true });
});

// Bulk upload real gift-card codes you buy from partners / aggregators (keep secret)
const bulkVouchersSchema = z.object({
  offerId: z.string().min(1),
  codes: z.array(z.string().min(4)).min(1).max(500)
});

redemptionsRouter.post("/admin/vouchers", requireAdminKey, async (req, res) => {
  const parsed = bulkVouchersSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const offer = await RedemptionOffer.findById(parsed.data.offerId);
  if (!offer) return res.status(404).json({ error: "Offer not found" });

  const trimmed = parsed.data.codes.map((c) => c.trim()).filter(Boolean);
  let inserted = 0;
  let skipped = 0;
  for (const code of trimmed) {
    try {
      await VoucherStock.create({ offerId: offer._id, code });
      inserted++;
    } catch (e) {
      if (e?.code === 11000) skipped++;
      else throw e;
    }
  }
  res.status(201).json({ inserted, skipped });
});
