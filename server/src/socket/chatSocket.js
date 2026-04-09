import { verifyJwt } from "../lib/jwt.js";
import { Conversation } from "../models/Conversation.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { User } from "../models/User.js";

async function assertParticipant(conversationId, userId) {
  const c = await Conversation.findById(conversationId).lean();
  if (!c) return null;
  const uid = String(userId);
  if (String(c.userId) !== uid && String(c.companyId) !== uid) return null;
  return c;
}

export function setupChatSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));
      const decoded = verifyJwt(token);
      socket.userId = decoded.sub;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("chat:join", async ({ conversationId }, ack) => {
      try {
        const c = await assertParticipant(conversationId, socket.userId);
        if (!c) {
          ack?.({ ok: false, error: "Not allowed" });
          return;
        }
        socket.join(`conv:${conversationId}`);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false, error: "Failed" });
      }
    });

    socket.on("chat:leave", ({ conversationId }) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on("chat:send", async ({ conversationId, body }, ack) => {
      try {
        const text = String(body || "").trim();
        if (!text || text.length > 4000) {
          ack?.({ ok: false, error: "Invalid message" });
          return;
        }
        const c = await assertParticipant(conversationId, socket.userId);
        if (!c) {
          ack?.({ ok: false, error: "Not allowed" });
          return;
        }

        const msg = await ChatMessage.create({
          conversationId: c._id,
          senderId: socket.userId,
          body: text
        });

        await Conversation.updateOne(
          { _id: c._id },
          { lastMessageAt: new Date(), lastMessagePreview: text.slice(0, 120) }
        );

        const sender = await User.findById(socket.userId).select("name").lean();

        const payload = {
          _id: msg._id,
          conversationId: String(c._id),
          body: msg.body,
          createdAt: msg.createdAt,
          senderId: String(socket.userId),
          senderName: sender?.name || ""
        };

        io.to(`conv:${conversationId}`).emit("chat:message", payload);
        ack?.({ ok: true, message: payload });
      } catch {
        ack?.({ ok: false, error: "Failed to send" });
      }
    });
  });
}
