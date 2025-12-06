export function requireAuth(req, res, next) {
  const user = req.session?.user || null;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    const user = req.session?.user || null;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== role) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}
