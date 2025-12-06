import { socketService } from "./SocketService.js";

// MultiplayerSync bridges socket events to Phaser event system
export class MultiplayerSync {
  constructor(scene, pet) {
    this.scene = scene;
    this.pet = pet;
    this.locationUpdateTimer = null;
    this.updateInterval = 150; // ms between location broadcasts
    this.lastSentPosition = { x: 0, y: 0 };
    this.positionThreshold = 5; // pixels moved before sending update

    this._setupSocketListeners();
    this._startLocationSync();
  }

  _setupSocketListeners() {
    // Listen for other players' pet updates
    socketService.on("pet:updated", (data) => {
      const { petId, state, timestamp } = data;
      
      // Ignore our own updates
      if (petId === this.pet?.profile?.id) return;

      // Emit Phaser event so scenes can react
      this.scene.events.emit("multiplayer:pet:updated", { petId, state, timestamp });
      console.log("[MultiplayerSync] Pet updated:", petId, state);
    });

    // Listen for location updates from other pets
    socketService.on("location:updated", (data) => {
      const { petId, x, y, scene, timestamp } = data;
      
      // Ignore our own updates
      if (petId === this.pet?.profile?.id) return;

      this.scene.events.emit("multiplayer:location:updated", { petId, x, y, scene, timestamp });
    });

    // Listen for reactions
    socketService.on("pet:reaction", (data) => {
      const { petId, reaction, timestamp } = data;
      
      if (petId === this.pet?.profile?.id) return;

      this.scene.events.emit("multiplayer:pet:reaction", { petId, reaction, timestamp });
    });

    // Listen for battle events
    socketService.on("battle:started", (data) => {
      this.scene.events.emit("multiplayer:battle:started", data);
      console.log("[MultiplayerSync] Battle started:", data);
    });

    socketService.on("battle:action", (data) => {
      this.scene.events.emit("multiplayer:battle:action", data);
    });
  }

  _startLocationSync() {
    // Throttled location broadcasting
    if (this.locationUpdateTimer) {
      this.locationUpdateTimer.remove();
    }

    this.locationUpdateTimer = this.scene.time.addEvent({
      delay: this.updateInterval,
      callback: () => this._broadcastLocation(),
      loop: true,
    });
  }

  _broadcastLocation() {
    if (!this.pet?.sprite || !socketService.isConnected()) return;

    const petId = this.pet.profile?.id;
    if (!petId) return;

    const currentX = Math.round(this.pet.sprite.x);
    const currentY = Math.round(this.pet.sprite.y);

    // Only send if moved significantly
    const dx = Math.abs(currentX - this.lastSentPosition.x);
    const dy = Math.abs(currentY - this.lastSentPosition.y);

    if (dx > this.positionThreshold || dy > this.positionThreshold) {
      socketService.updateLocation(petId, currentX, currentY, this.scene.scene.key);
      this.lastSentPosition = { x: currentX, y: currentY };
    }
  }

  // Broadcast pet state changes (stats, mood, etc.)
  broadcastPetState(state) {
    const petId = this.pet?.profile?.id;
    if (!petId || !socketService.isConnected()) return;

    socketService.updatePetState(petId, state);
  }

  // Broadcast pet reaction
  broadcastReaction(reaction) {
    const petId = this.pet?.profile?.id;
    if (!petId || !socketService.isConnected()) return;

    socketService.sendReaction(petId, reaction);
  }

  // Start battle with another pet
  startBattle(opponentId) {
    const petId = this.pet?.profile?.id;
    if (!petId || !socketService.isConnected()) return;

    socketService.startBattle(petId, opponentId);
  }

  // Stop location sync (call on scene shutdown)
  destroy() {
    if (this.locationUpdateTimer) {
      this.locationUpdateTimer.remove();
      this.locationUpdateTimer = null;
    }

    // Clean up socket listeners (optional, depends on if you want global persistence)
    // For scene-specific cleanup, remove listeners here
    // socketService.removeAllListeners("pet:updated");
    // socketService.removeAllListeners("location:updated");
    // etc.
  }
}
