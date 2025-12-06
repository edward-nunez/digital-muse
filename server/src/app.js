import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import session from "express-session";
import {RedisStore} from "connect-redis";
import path from "path";
import { fileURLToPath } from "url";

import apiRouter from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";
import { redis, ensureRedis } from "./lib/redis.js";
import csrfProtection from "./middleware/csrf.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "..", "..", "dist");

// Ensure Redis is connected (node-redis client for connect-redis v9)
ensureRedis().catch((err) => {
  console.error("[redis] failed to connect", err);
});

// Core middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:3000",
      process.env.CORS_ORIGIN,
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Sessions backed by Redis
app.set("trust proxy", 1); // needed if behind proxy for secure cookies

// Initialize RedisStore with v9 API (node-redis client)
const redisStore = new RedisStore({
  client: redis,
  prefix: "sess:",
});

app.use(session({
  store: redisStore,
  name: "dm.sid",
  secret: process.env.SESSION_SECRET || "change-me",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

// Attach user from session if present
app.use((req, _res, next) => {
  req.user = req.session?.user || null;
  next();
});

// Basic rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

// API routes (auth routes don't require CSRF)
app.use("/api", apiRouter);

// CSRF protection (double-submit cookie) - only for non-auth, non-health routes
app.use((req, res, next) => {
  if (req.path.startsWith("/api/auth") || req.path.startsWith("/api/health")) {
    return next();
  }
  csrfProtection(req, res, next);
});

// Static serving of built client
app.use(express.static(distPath));

// SPA fallback (only if not an API route)
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(path.join(distPath, "index.html"));
});

// Error handler
app.use(errorHandler);

export default app;
