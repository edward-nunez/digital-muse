import { io } from "socket.io-client";

// Singleton SocketService for managing multiplayer connection
class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.currentUserId = null;
    this.currentPetId = null;
    this.listeners = new Map(); // Track listeners for cleanup
  }

  connect(url = (typeof __API_URL__ !== 'undefined' ? __API_URL__ : null)
    || import.meta.env.VITE_DIGITALMUSE_API_URL
    || import.meta.env.DIGITALMUSE_API_URL
    || "http://localhost:3000", options = {}) {
    if (this.socket) {
      console.log("[SocketService] Already connected");
      return this.socket;
    }

    const defaultOptions = {
      withCredentials: true,
      transports: ["websocket", "polling"],
      ...options,
    };

    this.socket = io(url, defaultOptions);

    this.socket.on("connect", () => {
      this.connected = true;
      console.log("[SocketService] Connected:", this.socket.id);
    });

    this.socket.on("disconnect", (reason) => {
      this.connected = false;
      console.log("[SocketService] Disconnected:", reason);
    });

    this.socket.on("error", (error) => {
      console.error("[SocketService] Error:", error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
      console.log("[SocketService] Disconnected");
    }
  }

  // Join user room
  joinUser(userId) {
    if (!this.socket) return;
    this.currentUserId = userId;
    this.socket.emit("join:user", userId);
    console.log("[SocketService] Joined user room:", userId);
  }

  // Join pet room
  joinPet(petId) {
    if (!this.socket) return;
    this.currentPetId = petId;
    this.socket.emit("join:pet", petId);
    console.log("[SocketService] Joined pet room:", petId);
  }

  // Emit pet state update
  updatePetState(petId, state) {
    if (!this.socket) return;
    this.socket.emit("pet:update", { petId, state });
  }

  // Emit location update (throttled by caller)
  updateLocation(petId, x, y, scene) {
    if (!this.socket) return;
    this.socket.emit("location:update", { petId, x, y, scene });
  }

  // Emit pet reaction
  sendReaction(petId, reaction) {
    if (!this.socket) return;
    this.socket.emit("pet:reaction", { petId, reaction });
  }

  // Start battle
  startBattle(petId, opponentId) {
    if (!this.socket) return;
    this.socket.emit("battle:start", { petId, opponentId });
  }

  // Send battle action
  sendBattleAction(battleId, action) {
    if (!this.socket) return;
    this.socket.emit("battle:action", { battleId, action });
  }

  // Listen to events with cleanup tracking
  on(event, callback) {
    if (!this.socket) return;
    this.socket.on(event, callback);
    
    // Track for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Remove specific listener
  off(event, callback) {
    if (!this.socket) return;
    this.socket.off(event, callback);

    // Remove from tracking
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event) {
    if (!this.socket) return;
    this.socket.off(event);
    this.listeners.delete(event);
  }

  isConnected() {
    return this.connected && this.socket !== null;
  }
}

// Export singleton instance
export const socketService = new SocketService();
