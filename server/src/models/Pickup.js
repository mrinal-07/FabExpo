import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, default: "" },
    line2: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    country: { type: String, default: "India" }
  },
  { _id: false }
);

const pickupSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    scheduledFor: { type: Date, required: true },
    address: { type: addressSchema, default: () => ({}) },
    contactPhone: { type: String, default: "" },

    status: {
      type: String,
      enum: ["scheduled", "in_transit", "delivered", "failed", "cancelled"],
      default: "scheduled",
      index: true
    },

    courier: {
      provider: { type: String, default: "" },
      trackingId: { type: String, default: "" },
      trackingUrl: { type: String, default: "" }
    },

    proof: {
      pickupPhotoUrl: { type: String, default: "" },
      deliveredPhotoUrl: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

pickupSchema.index({ listingId: 1 }, { unique: true });

export const Pickup = mongoose.model("Pickup", pickupSchema);

