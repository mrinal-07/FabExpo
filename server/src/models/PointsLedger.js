import mongoose from "mongoose";

const pointsLedgerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["earn", "spend", "reversal", "adjustment"],
      required: true
    },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    reason: { type: String, default: "" },
    ref: {
      kind: { type: String, default: "" },
      id: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

pointsLedgerSchema.index({ userId: 1, createdAt: -1 });

export const PointsLedger = mongoose.model("PointsLedger", pointsLedgerSchema);

