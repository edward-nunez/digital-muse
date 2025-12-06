import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = createClient({ url: redisUrl });

redis.on("connect", () => {
  console.log("[redis] connected");
});

redis.on("error", (err) => {
  console.error("[redis] error", err);
});

let connectPromise;
export async function ensureRedis() {
  if (!connectPromise) {
    connectPromise = redis.connect().catch((err) => {
      connectPromise = undefined;
      throw err;
    });
  }
  return connectPromise;
}
