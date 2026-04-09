import mongoose from "mongoose";

const voucherStockSchema = new mongoose.Schema(
  {
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: "RedemptionOffer", required: true, index: true },
    code: { type: String, required: true, unique: true, trim: true },
    redeemedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    redeemedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const VoucherStock = mongoose.model("VoucherStock", voucherStockSchema);
