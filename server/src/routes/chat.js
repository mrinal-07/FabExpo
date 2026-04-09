import express from "express";
import { z } from "zod";

import { Conversation } from "../models/Conversation.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const chatRouter = express.Router();

async function assertParticipant(conversationId, userId) {
  const c = await Conversation.findById(conversationId).lean();
  if (!c) return null;
  const uid = String(userId);
  if (String(c.userId) !== uid && String(c.companyId) !== uid) return null;
  return c;
}

chatRouter.get("/companies", requireAuth(), requireRole("user"), async (req, res) => {
  const companies = await User.find({ role: "company" })
    .select("name email")
    .sort({ name: 1 })
    .lean();
  res.json({ companies });
});

chatRouter.get("/users", requireAuth(), requireRole("company"), async (req, res) => {
  const users = await User.find({ role: "user" })
    .select("name email")
    .sort({ name: 1 })
    .limit(100)
    .lean();
  res.json({ users });
});

const createSchema = z.union([
  z.object({ companyId: z.string().min(1) }),
  z.object({ userId: z.string().min(1) })
]);

chatRouter.post("/conversations", requireAuth(), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  if ("companyId" in parsed.data) {
    if (req.user.role !== "user") return res.status(403).json({ error: "Only users can start via companyId" });
    const company = await User.findOne({ _id: parsed.data.companyId, role: "company" }).lean();
    if (!company) return res.status(404).json({ error: "Company not found" });

    let conv = await Conversation.findOne({
      userId: req.user._id,
      companyId: company._id
    });
    if (!conv) {
      conv = await Conversation.create({
        userId: req.user._id,
        companyId: company._id
      });
    }
    return res.json({ conversation: conv });
  }

  if ("userId" in parsed.data) {
    if (req.user.role !== "company") return res.status(403).json({ error: "Only companies can start via userId" });
    const u = await User.findOne({ _id: parsed.data.userId, role: "user" }).lean();
    if (!u) return res.status(404).json({ error: "User not found" });

    let conv = await Conversation.findOne({
      userId: u._id,
      companyId: req.user._id
    });
    if (!conv) {
      conv = await Conversation.create({
        userId: u._id,
        companyId: req.user._id
      });
    }
    return res.json({ conversation: conv });
  }

  return res.status(400).json({ error: "Invalid body" });
});

chatRouter.get("/conversations", requireAuth(), async (req, res) => {
  let populatePath;
  let query;
  if (req.user.role === "user") {
    query = { userId: req.user._id };
    populatePath = "companyId";
  } else if (req.user.role === "company") {
    query = { companyId: req.user._id };
    populatePath = "userId";
  } else {
    return res.status(403).json({ error: "Forbidden" });
  }

  const rows = await Conversation.find(query)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .populate(populatePath, "name email")
    .lean();

  const conversations = rows.map((row) => {
    const other = row[populatePath];
    return {
      _id: row._id,
      lastMessageAt: row.lastMessageAt,
      lastMessagePreview: row.lastMessagePreview,
      otherParty: other
        ? { id: other._id, name: other.name, email: other.email }
        : null
    };
  });

  res.json({ conversations });
});

chatRouter.get("/conversations/:id/messages", requireAuth(), async (req, res) => {
  const c = await assertParticipant(req.params.id, req.user._id);
  if (!c) return res.status(404).json({ error: "Conversation not found" });

  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const messages = await ChatMessage.find({ conversationId: c._id })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate("senderId", "name")
    .lean();

  const out = messages.map((m) => ({
    _id: m._id,
    body: m.body,
    createdAt: m.createdAt,
    senderId: m.senderId?._id,
    senderName: m.senderId?.name
  }));

  res.json({ messages: out });
});

const messageBodySchema = z.object({
  body: z.string().min(1).max(4000)
});

chatRouter.post("/conversations/:id/messages", requireAuth(), async (req, res) => {
  const parsed = messageBodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid message" });

  const c = await assertParticipant(req.params.id, req.user._id);
  if (!c) return res.status(404).json({ error: "Conversation not found" });

  const msg = await ChatMessage.create({
    conversationId: c._id,
    senderId: req.user._id,
    body: parsed.data.body
  });

  const preview = parsed.data.body.slice(0, 120);
  await Conversation.updateOne(
    { _id: c._id },
    { lastMessageAt: new Date(), lastMessagePreview: preview }
  );

  const io = req.app.get("io");
  const payload = {
    _id: msg._id,
    conversationId: String(c._id),
    body: msg.body,
    createdAt: msg.createdAt,
    senderId: String(req.user._id),
    senderName: req.user.name
  };
  if (io) io.to(`conv:${c._id}`).emit("chat:message", payload);

  res.status(201).json({ message: payload });
});
