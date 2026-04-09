import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

export function createMulter() {
  const uploadDir = process.env.UPLOAD_DIR || "uploads";
  const root = path.join(__dirname, "..", "..", uploadDir);
  ensureDirExists(root);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, root),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").slice(0, 10) || ".jpg";
      const safeExt = ext.match(/^\.[a-z0-9]+$/i) ? ext : ".jpg";
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
      cb(null, name);
    }
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype?.startsWith("image/")) return cb(new Error("Only images allowed"));
      cb(null, true);
    }
  });
}

