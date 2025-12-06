import { Server } from "socket.io";
import { getUserById } from "../services/userService.js";
import { getPetById } from "../services/petService.js";

export function setupSocketIO(httpServer) {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
    process.env.CORS_ORIGIN,
  ].filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Socket.io session middleware - extract user from cookie
  io.use(async (socket, next) => {
    try {
      const sessionCookie = socket.handshake.headers.cookie;
      if (!sessionCookie) {
        return next(new Error("Authentication required"));
      }

      // Parse session cookie (basic approach; enhance with session store lookup if needed)
      const sessionId = parseCookie(sessionCookie, "dm.sid");
      if (!sessionId) {
        return next(new Error("Invalid session"));
      }

      // For now, attach sessionId; enhance later to decode and verify session from Redis
      socket.sessionId = sessionId;
      socket.authenticated = true;
      next();
    } catch (err) {
      next(new Error("Authentication failed"));
    }
  });

  // Store active lobby and battles
  const lobby = new Map(); // socketId -> player info
  const battles = new Map(); // battleId -> battle data

  io.on("connection", (socket) => {
    console.log(`[socket.io] client connected: ${socket.id}`);

    // Join user-specific room for targeted messages
    socket.on("join:user", (userId) => {
      socket.join(`user:${userId}`);
      console.log(`[socket.io] ${socket.id} joined user:${userId}`);
    });

    // Join pet-specific room
    socket.on("join:pet", (petId) => {
      socket.join(`pet:${petId}`);
      console.log(`[socket.io] ${socket.id} joined pet:${petId}`);
    });

    // Lobby management
    socket.on("lobby:join", (data) => {
      const player = {
        socketId: socket.id,
        petId: data.petId,
        name: data.name,
        stats: data.stats,
      };
      lobby.set(socket.id, player);
      socket.join("lobby");
      
      // Broadcast updated lobby to all
      const players = Array.from(lobby.values());
      io.to("lobby").emit("lobby:updated", { players });
      console.log(`[socket.io] ${data.name} joined lobby`);
    });

    socket.on("lobby:leave", () => {
      lobby.delete(socket.id);
      socket.leave("lobby");
      
      // Broadcast updated lobby
      const players = Array.from(lobby.values());
      io.to("lobby").emit("lobby:updated", { players });
    });

    // Battle challenges
    socket.on("battle:challenge", (data) => {
      const { challengerId, challengerName, opponentId } = data;
      const opponent = Array.from(lobby.values()).find(p => p.petId === opponentId);
      
      if (!opponent) {
        return socket.emit("error", { message: "Opponent not found" });
      }

      const battleId = `battle_${Date.now()}`;
      
      // Send invite to opponent
      io.to(opponent.socketId).emit("battle:invited", {
        battleId,
        challengerId,
        challengerName,
      });
    });

    socket.on("battle:accept", (data) => {
      const { battleId, accepterId } = data;
      const challenger = Array.from(lobby.values()).find(p => 
        p.socketId !== socket.id // Find the other player
      );
      const accepter = lobby.get(socket.id);

      if (!challenger || !accepter) {
        return socket.emit("error", { message: "Battle setup failed" });
      }

      // Create battle
      const battle = {
        id: battleId,
        player1: challenger,
        player2: accepter,
        startTime: Date.now(),
      };
      battles.set(battleId, battle);

      // Join both to battle room
      socket.join(`battle:${battleId}`);
      io.sockets.sockets.get(challenger.socketId)?.join(`battle:${battleId}`);

      // Notify both players
      io.to(`battle:${battleId}`).emit("battle:started", {
        battleId,
        player1: challenger,
        player2: accepter,
      });

      console.log(`[socket.io] Battle started: ${battleId}`);
    });

    socket.on("battle:decline", (data) => {
      const { battleId } = data;
      // Notify challenger that battle was declined
      socket.broadcast.emit("battle:declined", { battleId });
    });

    socket.on("battle:action", (data) => {
      const { battleId, action } = data;
      // Broadcast action to battle room
      socket.to(`battle:${battleId}`).emit("battle:action", data);
    });

    socket.on("battle:end", (data) => {
      const { battleId, winner } = data;
      io.to(`battle:${battleId}`).emit("battle:ended", { battleId, winner });
      battles.delete(battleId);
    });

    // Broadcast pet state updates to all clients watching this pet
    socket.on("pet:update", async (data) => {
      const { petId, state } = data;
      if (!petId || !state) return;

      // Verify ownership before broadcasting (optional security layer)
      const pet = await getPetById(petId);
      if (!pet) return socket.emit("error", { message: "Pet not found" });

      // Broadcast to all in the pet room
      io.to(`pet:${petId}`).emit("pet:updated", { petId, state, timestamp: Date.now() });
    });

    // Chat/reactions
    socket.on("pet:reaction", (data) => {
      const { petId, reaction } = data;
      io.to(`pet:${petId}`).emit("pet:reaction", { petId, reaction, timestamp: Date.now() });
    });

    // Multiplayer location sync
    socket.on("location:update", (data) => {
      const { petId, x, y, scene } = data;
      socket.to(`pet:${petId}`).emit("location:updated", { petId, x, y, scene, timestamp: Date.now() });
    });

    socket.on("disconnect", () => {
      // Clean up lobby
      const player = lobby.get(socket.id);
      if (player) {
        lobby.delete(socket.id);
        const players = Array.from(lobby.values());
        io.to("lobby").emit("lobby:updated", { players });
        console.log(`[socket.io] ${player.name} left lobby`);
      }
      
      console.log(`[socket.io] client disconnected: ${socket.id}`);
    });
  });

  console.log("[socket.io] initialized");
  return io;
}

// Helper to parse cookies
function parseCookie(cookieHeader, name) {
  const cookies = cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
  return cookies[name] || null;
}
