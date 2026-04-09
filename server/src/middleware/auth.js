import { verifyJwt } from "../lib/jwt.js";
import { User } from "../models/User.js";

export function requireAuth() {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization || "";
      const [scheme, token] = header.split(" ");
      if (scheme !== "Bearer" || !token) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const decoded = verifyJwt(token);
      const user = await User.findById(decoded.sub).lean();
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      req.user = user;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  };
}

export function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

