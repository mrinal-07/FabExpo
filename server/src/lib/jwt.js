import jwt from "jsonwebtoken";

export function signJwt(payload, options = {}) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in environment");
  return jwt.sign(payload, secret, { expiresIn: "7d", ...options });
}

export function verifyJwt(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in environment");
  return jwt.verify(token, secret);
}

