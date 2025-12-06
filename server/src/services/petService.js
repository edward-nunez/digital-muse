import crypto from "crypto";
import { redis, ensureRedis } from "../lib/redis.js";

const PET_KEY = (id) => `pet:${id}`;
const USER_PETS_KEY = (userId) => `user:${userId}:pets`;

export async function createPet({ ownerId, name, className = "Paladin", personality = "Friendly", profile = {} }) {
  await ensureRedis();
  const id = crypto.randomUUID();
  const pet = {
    id,
    ownerId,
    name,
    className,
    personality,
    alignment: profile.alignment ?? 0,
    neglectCount: 0,
    level: profile.level ?? 1,
    experience: profile.experience ?? 0,
    stats: profile.stats ?? {
      attributes: {
        strength: 5,
        dexterity: 5,
        constitution: 5,
        intelligence: 5,
        wisdom: 5,
        charisma: 5,
        luck: 5,
      },
      vitals: {
        hp: 100,
        mp: 30,
        energy: 50,
        mood: 100,
        hunger: 100,
      },
      physical: {
        attack: 10,
        defense: 5,
        speed: 10,
        accuracy: 90,
        critical: 5,
        evasion: 5,
      },
      magic: {
        magicAttack: 8,
        magicDefense: 4,
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await redis.multi()
    .set(PET_KEY(id), JSON.stringify(pet))
    .sAdd(USER_PETS_KEY(ownerId), id)
    .exec();
  
  return pet;
}

export async function getPetById(id) {
  await ensureRedis();
  const raw = await redis.get(PET_KEY(id));
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function getPetsByUserId(userId) {
  await ensureRedis();
  const ids = await redis.sMembers(USER_PETS_KEY(userId));
  if (!ids.length) return [];
  
  const multi = redis.multi();
  ids.forEach(id => multi.get(PET_KEY(id)));
  const results = await multi.exec();
  
  return results
    .map((raw) => (!raw) ? null : JSON.parse(raw))
    .filter(Boolean);
}

export async function updatePet(id, updates) {
  await ensureRedis();
  const pet = await getPetById(id);
  if (!pet) return null;
  
  const updated = {
    ...pet,
    ...updates,
    id: pet.id, // prevent id override
    ownerId: pet.ownerId, // prevent owner override
    updatedAt: new Date().toISOString(),
  };
  
  await redis.set(PET_KEY(id), JSON.stringify(updated));
  return updated;
}

export async function deletePet(id) {
  await ensureRedis();
  const pet = await getPetById(id);
  if (!pet) return false;
  
  await redis.multi()
    .del(PET_KEY(id))
    .sRem(USER_PETS_KEY(pet.ownerId), id)
    .exec();
  
  return true;
}
