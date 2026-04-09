import express from "express";
import { z } from "zod";

import { requireAuth, requireRole } from "../middleware/auth.js";
import { User } from "../models/User.js";

export const companyRouter = express.Router();

const profileSchema = z.object({
  brandName: z.string().min(2).max(120),
  website: z.string().max(200).optional().default(""),
  gstNumber: z.string().min(5).max(30),
  address: z.object({
    line1: z.string().min(1).max(120),
    line2: z.string().max(120).optional().default(""),
    city: z.string().min(1).max(60),
    state: z.string().min(1).max(60),
    pincode: z.string().min(4).max(12),
    country: z.string().max(60).optional().default("India")
  }),
  docs: z
    .object({
      gstCertificateUrl: z.string().max(500).optional().default(""),
      addressProofUrl: z.string().max(500).optional().default("")
    })
    .optional()
    .default({})
});

// Company submits profile for verification (MVP: URLs for docs; later: file uploads)
companyRouter.post("/onboarding/submit", requireAuth(), requireRole("company"), async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const existing = await User.findById(req.user._id);
  if (!existing) return res.status(404).json({ error: "Not found" });

  existing.companyProfile = {
    ...(existing.companyProfile || {}),
    ...parsed.data,
    verificationStatus: "pending",
    verificationNote: ""
  };
  await existing.save();

  res.json({
    ok: true,
    companyProfile: existing.companyProfile
  });
});

// Company views their onboarding status
companyRouter.get("/onboarding/status", requireAuth(), requireRole("company"), async (req, res) => {
  const company = await User.findById(req.user._id).lean();
  res.json({ companyProfile: company?.companyProfile || null });
});

// Admin verifies/rejects a company
const verifySchema = z.object({
  status: z.enum(["verified", "rejected"]),
  note: z.string().max(500).optional().default("")
});

companyRouter.post("/admin/verify/:companyId", requireAuth(), requireRole("admin"), async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const company = await User.findOne({ _id: req.params.companyId, role: "company" });
  if (!company) return res.status(404).json({ error: "Company not found" });

  company.companyProfile = company.companyProfile || {};
  company.companyProfile.verificationStatus = parsed.data.status;
  company.companyProfile.verificationNote = parsed.data.note;
  await company.save();

  res.json({ ok: true, companyProfile: company.companyProfile });
});

