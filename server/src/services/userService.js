import crypto from "crypto";
import bcrypt from "bcrypt";
import { redis, ensureRedis } from "../lib/redis.js";

const USER_KEY = (id) => `user:${id}`;
const USER_EMAIL_KEY = (email) => `user:email:${email.toLowerCase()}`;
const USERNAME_KEY = (username) => `user:username:${username.toLowerCase()}`;

export async function createUser({ email, password, username, role = "user", profile = {} }) {
  await ensureRedis();
  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = username.toLowerCase();
  
  const existingEmailId = await redis.get(USER_EMAIL_KEY(normalizedEmail));
  if (existingEmailId) {
    const err = new Error("Email already in use");
    err.status = 400;
    throw err;
  }
  
  const existingUsernameId = await redis.get(USERNAME_KEY(normalizedUsername));
  if (existingUsernameId) {
    const err = new Error("Username already in use");
    err.status = 400;
    throw err;
  }
  
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = {
    id,
    email: normalizedEmail,
    username,
    passwordHash,
    role,
    rank: 0,
    battlePoints: 0,
    profile,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await redis.multi()
    .set(USER_KEY(id), JSON.stringify(user))
    .set(USER_EMAIL_KEY(normalizedEmail), id)
    .set(USERNAME_KEY(normalizedUsername), id)
    .exec();
  return sanitizeUser(user);
}

export async function getUserByEmail(email) {
  await ensureRedis();
  const id = await redis.get(USER_EMAIL_KEY(email.toLowerCase()));
  if (!id) return null;
  return getUserById(id);
}

export async function getUserById(id) {
  await ensureRedis();
  const raw = await redis.get(USER_KEY(id));
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function verifyUser(email, password) {
  const user = await getUserByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return sanitizeUser(user);
}

export async function updateUser(id, updates) {
  await ensureRedis();
  const user = await getUserById(id);
  if (!user) return null;
  
  const updated = {
    ...user,
    ...updates,
    id: user.id,
    email: user.email,
    username: user.username,
    passwordHash: user.passwordHash,
    updatedAt: new Date().toISOString(),
  };
  
  await redis.set(USER_KEY(id), JSON.stringify(updated));
  return sanitizeUser(updated);
}

function sanitizeUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}
