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

const companyProfileSchema = new mongoose.Schema(
  {
    brandName: { type: String, default: "" },
    website: { type: String, default: "" },
    gstNumber: { type: String, default: "" },
    address: { type: addressSchema, default: () => ({}) },
    verificationStatus: {
      type: String,
      enum: ["unsubmitted", "pending", "verified", "rejected"],
      default: "unsubmitted",
      index: true
    },
    verificationNote: { type: String, default: "" },
    docs: {
      gstCertificateUrl: { type: String, default: "" },
      addressProofUrl: { type: String, default: "" }
    },
    pointsRules: {
      basePointsPerKg: { type: Number, default: 200, min: 0 },
      conditionMultipliers: {
        new: { type: Number, default: 1.2, min: 0 },
        good: { type: Number, default: 1.0, min: 0 },
        fair: { type: Number, default: 0.8, min: 0 },
        poor: { type: Number, default: 0.5, min: 0 }
      }
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "company", "admin"], default: "user" },
    pointsBalance: { type: Number, default: 0, min: 0 },

 
    address: { type: addressSchema, default: () => ({}) },

    companyProfile: { type: companyProfileSchema, default: null }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);

