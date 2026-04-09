import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    lastMessageAt: { type: Date, default: null },
    lastMessagePreview: { type: String, default: "" }
  },
  { timestamps: true }
);

conversationSchema.index({ userId: 1, companyId: 1 }, { unique: true });

export const Conversation = mongoose.model("Conversation", conversationSchema);
