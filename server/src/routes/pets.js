import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createPet,
  getPetById,
  getPetsByUserId,
  updatePet,
  deletePet,
} from "../services/petService.js";
import { updateUser } from "../services/userService.js";

const router = Router();

// Validation schemas
const createPetSchema = z.object({
  name: z.string().min(1).max(50),
  species: z.string().optional(),
  profile: z.object({
    alignment: z.number().min(-100).max(100).optional(),
    stats: z.object({
      vitals: z.object({
        hunger: z.number().min(0).max(100).optional(),
        happiness: z.number().min(0).max(100).optional(),
        energy: z.number().min(0).max(100).optional(),
        mood: z.number().min(0).max(100).optional(),
      }).optional(),
    }).optional(),
  }).optional(),
});

const updatePetSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  profile: z.object({
    alignment: z.number().min(-100).max(100).optional(),
    stats: z.object({
      vitals: z.object({
        hunger: z.number().min(0).max(100).optional(),
        happiness: z.number().min(0).max(100).optional(),
        energy: z.number().min(0).max(100).optional(),
        mood: z.number().min(0).max(100).optional(),
      }).optional(),
    }).optional(),
  }).optional(),
});

// Get all pets for current user
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const pets = await getPetsByUserId(userId);
    res.json({ pets });
  } catch (err) {
    next(err);
  }
});

// Create new pet
router.post("/", requireAuth, validate(createPetSchema), async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const { name, species, profile } = req.body;
    const pet = await createPet({ ownerId: userId, name, species, profile });
    res.status(201).json({ pet });
  } catch (err) {
    next(err);
  }
});

// Get pet by ID
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const pet = await getPetById(req.params.id);
    if (!pet) return res.status(404).json({ error: "Pet not found" });
    if (pet.ownerId !== userId) return res.status(403).json({ error: "Forbidden" });
    res.json({ pet });
  } catch (err) {
    next(err);
  }
});

// Update pet
router.patch("/:id", requireAuth, validate(updatePetSchema), async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const pet = await getPetById(req.params.id);
    if (!pet) return res.status(404).json({ error: "Pet not found" });
    if (pet.ownerId !== userId) return res.status(403).json({ error: "Forbidden" });
    
    const updated = await updatePet(req.params.id, req.body);
    res.json({ pet: updated });
  } catch (err) {
    next(err);
  }
});

// Delete pet
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const pet = await getPetById(req.params.id);
    if (!pet) return res.status(404).json({ error: "Pet not found" });
    if (pet.ownerId !== userId) return res.status(403).json({ error: "Forbidden" });
    
    await deletePet(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Update player rank and battle points after a battle
router.patch("/user/stats", requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id;
    const { rankGain = 0, battlePointsGain = 0 } = req.body;
    
    const updated = await updateUser(userId, {
      rank: Math.max(0, (req.session.user.rank || 0) + rankGain),
      battlePoints: Math.max(0, (req.session.user.battlePoints || 0) + battlePointsGain),
    });
    
    if (!updated) return res.status(404).json({ error: "User not found" });
    
    req.session.user = updated;
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
