import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import petsRouter from "./pets.js";
import socketRouter from "./socket.js";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/pets", petsRouter);
router.use("/socket", socketRouter);

export default router;
