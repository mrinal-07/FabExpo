import express from "express";
import { z } from "zod";

import { Listing } from "../models/Listing.js";
import { User } from "../models/User.js";
import { PointsLedger } from "../models/PointsLedger.js";
import { Pickup } from "../models/Pickup.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createMulter } from "../lib/upload.js";

export const listingsRouter = express.Router();
const upload = createMulter();

// Public-ish listing search (for MVP). You can lock this down later.
listingsRouter.get("/", requireAuth(), async (req, res) => {
  const { q = "", mine = "false" } = req.query;
  const query = {};

  if (mine === "true") query.userId = req.user._id;
  if (q) query.title = { $regex: String(q), $options: "i" };

  const listings = await Listing.find(query).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ listings });
});

const createSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().max(2000).optional().default(""),
  category: z.string().max(60).optional().default("Other"),
  condition: z.enum(["new", "good", "fair", "poor"]).optional().default("good"),
  weightKg: z.coerce.number().min(0).max(200).optional().default(0)
});

// User creates a listing with photo(s)
listingsRouter.post(
  "/",
  requireAuth(),
  requireRole("user"),
  upload.array("photos", 5),
  async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: "At least 1 photo is required" });

    const photos = files.map((f) => `/uploads/${f.filename}`);

    const listing = await Listing.create({
      userId: req.user._id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      condition: parsed.data.condition,
      weightKg: parsed.data.weightKg,
      photos
    });

    res.status(201).json({ listing });
  }
);

// Company reviews a listing and awards points.
const reviewSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
  pointsAwarded: z.coerce.number().min(0).max(5000).optional(),
  note: z.string().max(500).optional().default(""),
  qualityGrade: z.enum(["A", "B", "C", "D"]).optional().default("B"),
  weightKg: z.coerce.number().min(0).max(200).optional()
});

listingsRouter.post(
  "/:id/review",
  requireAuth(),
  requireRole("company"),
  async (req, res) => {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    if (typeof parsed.data.weightKg === "number") listing.weightKg = parsed.data.weightKg;

    listing.status = parsed.data.status === "accepted" ? "accepted" : "rejected";
    listing.review = {
      companyId: req.user._id,
      status: parsed.data.status,
      pointsAwarded: 0,
      note: "Pre-approved pending physical pickup"
    };

    await listing.save();

    const updated = await Listing.findById(listing._id).lean();
    res.json({ listing: updated });
  }
);

// User schedules pickup after acceptance
const scheduleSchema = z.object({
  scheduledFor: z.coerce.date(),
  address: z
    .object({
      line1: z.string().min(1).max(120),
      line2: z.string().max(120).optional().default(""),
      city: z.string().min(1).max(60),
      state: z.string().min(1).max(60),
      pincode: z.string().min(4).max(12),
      country: z.string().max(60).optional().default("India")
    })
    .strict(),
  contactPhone: z.string().min(7).max(20)
});

listingsRouter.post(
  "/:id/pickup/schedule",
  requireAuth(),
  requireRole("user"),
  async (req, res) => {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (String(listing.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (listing.status !== "accepted") {
      return res.status(400).json({ error: "Pickup can only be scheduled after acceptance" });
    }
    if (!listing.review?.companyId) {
      return res.status(400).json({ error: "No reviewing company found for this listing" });
    }

    const pickup = await Pickup.findOneAndUpdate(
      { listingId: listing._id },
      {
        $set: {
          listingId: listing._id,
          userId: listing.userId,
          companyId: listing.review.companyId,
          scheduledFor: parsed.data.scheduledFor,
          address: parsed.data.address,
          contactPhone: parsed.data.contactPhone,
          status: "scheduled"
        }
      },
      { upsert: true, new: true }
    ).lean();

    listing.status = "pickup_scheduled";
    await listing.save();

    res.json({ pickup, listing: await Listing.findById(listing._id).lean() });
  }
);

// User/company can view pickup details for a listing they are part of
listingsRouter.get("/:id/pickup", requireAuth(), async (req, res) => {
  const listing = await Listing.findById(req.params.id).lean();
  if (!listing) return res.status(404).json({ error: "Listing not found" });

  const userId = String(req.user._id);
  const allowed =
    userId === String(listing.userId) ||
    userId === String(listing.review?.companyId) ||
    req.user.role === "admin";
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const pickup = await Pickup.findOne({ listingId: listing._id }).lean();
  res.json({ pickup });
});

const courierSchema = z.object({
  provider: z.string().min(1).max(120),
  trackingId: z.string().max(120).optional().default(""),
  trackingUrl: z.string().max(255).optional().default("")
});

// Company assigns delivery person/courier
listingsRouter.post("/:id/pickup/courier", requireAuth(), requireRole("company"), async (req, res) => {
  const parsed = courierSchema.safeParse(req.body);
  if (!parsed.success) {
    const err = parsed.error.issues[0];
    return res.status(400).json({ error: `Validation error: ${err.message}` });
  }

  const listing = await Listing.findById(req.params.id);
  if (!listing) return res.status(404).json({ error: "Listing not found" });

  if (String(listing.review?.companyId) !== String(req.user._id)) {
    return res.status(403).json({ error: "Only the reviewing company can assign a courier" });
  }

  const pickup = await Pickup.findOne({ listingId: listing._id });
  if (!pickup) return res.status(404).json({ error: "Pickup not found" });

  if (pickup.status === "scheduled") {
    pickup.status = "in_transit";
  }

  pickup.courier = {
    provider: parsed.data.provider,
    trackingId: parsed.data.trackingId,
    trackingUrl: parsed.data.trackingUrl
  };
  await pickup.save();

  if (listing.status === "pickup_scheduled") {
    listing.status = "picked_up";
    await listing.save();
  }

  res.json({ pickup, listing: await Listing.findById(listing._id).lean() });
});

// Company marks pickup as physically received
listingsRouter.post("/:id/pickup/receive", requireAuth(), requireRole("company"), async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return res.status(404).json({ error: "Listing not found" });

  if (String(listing.review?.companyId) !== String(req.user._id)) {
    return res.status(403).json({ error: "Only the managing company can receive this item" });
  }

  const pickup = await Pickup.findOne({ listingId: listing._id });
  if (!pickup) return res.status(404).json({ error: "Pickup not found" });

  pickup.status = "delivered";
  await pickup.save();

  listing.status = "received";
  await listing.save();

  res.json({ pickup, listing: await Listing.findById(listing._id).lean() });
});

// Final QA & Points Awarding
const verifySchema = z.object({
  pointsAwarded: z.coerce.number().min(0).max(5000).optional(),
  note: z.string().max(500).optional().default(""),
  qualityGrade: z.enum(["A", "B", "C", "D"]).optional().default("B"),
  weightKg: z.coerce.number().min(0).max(200).optional()
});

listingsRouter.post(
  "/:id/verify",
  requireAuth(),
  requireRole("company"),
  async (req, res) => {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input", detail: parsed.error.issues[0]?.message });

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    if (String(listing.review?.companyId) !== String(req.user._id)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (listing.status !== "received") {
      return res.status(400).json({ error: "Item must be received before final verification" });
    }

    if (typeof parsed.data.weightKg === "number") listing.weightKg = parsed.data.weightKg;
    listing.grade = {
      qualityGrade: parsed.data.qualityGrade,
      notes: parsed.data.note || ""
    };

    listing.status = "completed";
    
    // Perform points math
    const company = await User.findById(req.user._id).lean();
    const rules = company.companyProfile?.pointsRules;
    const base = rules?.basePointsPerKg ?? 200;
    const mult = rules?.conditionMultipliers?.[listing.condition] ?? 1.0;
    const gradeMult = parsed.data.qualityGrade === "A" ? 1.2 : parsed.data.qualityGrade === "B" ? 1.0 : parsed.data.qualityGrade === "C" ? 0.8 : 0.6;
    const computed = Math.round((listing.weightKg || 0) * base * mult * gradeMult);
    const manual = typeof parsed.data.pointsAwarded === "number" ? parsed.data.pointsAwarded : null;
    
    listing.review.pointsAwarded = manual ?? computed;
    await listing.save();

    if (listing.review.pointsAwarded > 0) {
      const updatedUser = await User.findOneAndUpdate(
        { _id: listing.userId },
        { $inc: { pointsBalance: listing.review.pointsAwarded } },
        { new: true }
      ).lean();
      
      const { PointsLedger } = await import("../models/PointsLedger.js");

      if (updatedUser) {
        await PointsLedger.create({
          userId: updatedUser._id,
          type: "earn",
          amount: listing.review.pointsAwarded,
          balanceAfter: updatedUser.pointsBalance,
          reason: "Points awarded for finalized fabric receipt",
          ref: { kind: "listing", id: String(listing._id) }
        });
      }
    }

    const updated = await Listing.findById(listing._id).lean();
    res.json({ listing: updated });
  }
);
