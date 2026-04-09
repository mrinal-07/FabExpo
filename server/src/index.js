import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { Server } from "socket.io";

import { connectDb } from "./lib/db.js";
import { authRouter } from "./routes/auth.js";
import { meRouter } from "./routes/me.js";
import { listingsRouter } from "./routes/listings.js";
import { redemptionsRouter } from "./routes/redemptions.js";
import { chatRouter } from "./routes/chat.js";
import { companyRouter } from "./routes/company.js";
import { setupChatSocket } from "./socket/chatSocket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, "../.env")
});

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
function isAllowedOrigin(origin) {
  if (!origin) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      if (origin === clientOrigin) return callback(null, true);
      callback(null, false);
    },
    credentials: true
  })
);

const uploadDir = process.env.UPLOAD_DIR || "uploads";
const uploadsPath = path.join(__dirname, "..", uploadDir);

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use("/uploads", express.static(uploadsPath));

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Fabric Reuse API. Use /health or start the React app.",
    health: "/health",
    frontend: clientOrigin
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT || 5000);

await connectDb();

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin) || origin === clientOrigin) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true
  }
});

app.set("io", io);
setupChatSocket(io);

app.use("/api/auth", authRouter);
app.use("/api/me", meRouter);
app.use("/api/listings", listingsRouter);
app.use("/api/redemptions", redemptionsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/company", companyRouter);

httpServer.listen(port, () => {
  console.log(`API + WebSocket listening on http://localhost:${port}`);
});
