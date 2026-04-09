export function requireAdminKey(req, res, next) {
  const key = process.env.ADMIN_KEY;
  if (!key) {
    return res.status(503).json({ error: "Admin uploads disabled. Set ADMIN_KEY in server/.env" });
  }
  const provided = req.headers["x-admin-key"];
  if (provided !== key) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
