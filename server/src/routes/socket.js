import { Router } from "express";

const router = Router();

// Emit real-time event to pet watchers
router.post("/emit/:event", (req, res) => {
  const io = req.app.get("io");
  const { event } = req.params;
  const { room, data } = req.body;

  if (!io) {
    return res.status(500).json({ error: "Socket.io not initialized" });
  }

  if (room) {
    io.to(room).emit(event, data);
  } else {
    io.emit(event, data);
  }

  res.json({ success: true, event, room });
});

export default router;
