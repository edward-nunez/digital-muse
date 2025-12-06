import { Router } from "express";
import { redis, ensureRedis } from "../lib/redis.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

router.get("/redis", async (req, res) => {
  try {
    await ensureRedis();
    const pong = await redis.ping();
    res.json({ status: "ok", redis: pong });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

export default router;
