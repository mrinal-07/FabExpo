import mongoose from "mongoose";

const redemptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: "RedemptionOffer", required: true },
    partnerKey: { type: String, required: true },
    title: { type: String, required: true },
    pointsSpent: { type: Number, required: true, min: 1 },
    code: { type: String, required: true },
    status: { type: String, enum: ["issued", "refunded"], default: "issued", index: true },
    refundedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const Redemption = mongoose.model("Redemption", redemptionSchema);
