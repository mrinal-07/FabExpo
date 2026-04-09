import mongoose from "mongoose";

const redemptionOfferSchema = new mongoose.Schema(
  {
    partnerKey: {
      type: String,
      enum: ["myntra", "nykaa", "other"],
      required: true,
      index: true
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    valueLabel: { type: String, default: "" },
    pointsCost: { type: Number, required: true, min: 1 },
    denominationValue: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "INR" },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const RedemptionOffer = mongoose.model("RedemptionOffer", redemptionOfferSchema);
