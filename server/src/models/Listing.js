import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
    pointsAwarded: { type: Number, default: 0, min: 0 },
    note: { type: String, default: "" }
  },
  { timestamps: true }
);

const listingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "Other" },
    condition: { type: String, enum: ["new", "good", "fair", "poor"], default: "good" },
    weightKg: { type: Number, default: 0 },
    photos: [{ type: String, required: true }],
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "in_review",
        "accepted",
        "rejected",
        "pickup_scheduled",
        "picked_up",
        "recycled",
        "completed"
      ],
      default: "submitted",
      index: true
    },
    review: { type: reviewSchema, default: null },
    grade: {
      qualityGrade: { type: String, enum: ["A", "B", "C", "D"], default: "B" },
      notes: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

export const Listing = mongoose.model("Listing", listingSchema);

