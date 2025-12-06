import { Router } from "express";
import { z } from "zod";
import { createUser, verifyUser, getUserById } from "../services/userService.js";
import { ensureCsrfToken } from "../middleware/csrf.js";
import { validate } from "../middleware/validate.js";

const router = Router();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(20),
  password: z.string().min(6),
  profile: z.object({}).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/signup", validate(signupSchema), async (req, res, next) => {
  try {
    const { email, username, password, profile = {}, role = "user" } = req.body;
    const user = await createUser({ email, username, password, role, profile });
    req.session.user = user;
    const csrfToken = ensureCsrfToken(req, res);
    res.status(201).json({ user, csrfToken });
  } catch (err) {
    next(err);
  }
});

router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await verifyUser(email, password);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    req.session.user = user;
    const csrfToken = ensureCsrfToken(req, res);
    res.json({ user, csrfToken });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/me", async (req, res) => {
  const sessionUser = req.session?.user;
  if (!sessionUser) return res.status(401).json({ error: "Unauthorized" });
  // Optionally refresh user from store
  const user = await getUserById(sessionUser.id);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.session.user = { id: user.id, email: user.email, username: user.username, role: user.role, rank: user.rank, battlePoints: user.battlePoints, profile: user.profile, createdAt: user.createdAt };
  const csrfToken = ensureCsrfToken(req, res);
  res.json({ user: req.session.user, csrfToken });
});

// Issue/refresh CSRF token explicitly
router.get("/csrf", (req, res) => {
  const csrfToken = ensureCsrfToken(req, res);
  res.json({ csrfToken });
});

export default router;
