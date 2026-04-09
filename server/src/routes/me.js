import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";

export const meRouter = express.Router();

meRouter.get("/", requireAuth(), async (req, res) => {
  const user = await User.findById(req.user._id).lean();
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    pointsBalance: user.pointsBalance,
    companyProfile: user.companyProfile || null
  });
});

