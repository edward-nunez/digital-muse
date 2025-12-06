import { Cursor } from "../entities/Cursor.js";
import { goToScene } from "../utils/sceneHelpers.js";
import { socketService } from "../services/SocketService.js";
import { apiClient } from "../services/APIClient.js";

export class StartScene extends Phaser.Scene {
  constructor() {
    super("Start");
  }

  preload() {
    this.load.image("cursor", "assets/sprites/cursorSheet.png");
    this.load.audio("MenuBgMusic", "assets/sounds/music/MenuBgMusic.mp3");
  }

  create() {
    // Initialize socket connection early
    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
    socketService.connect(socketUrl);
    console.log("[StartScene] Socket connection initiated");

    // Defer the rest so we can await session checks
    this.handleEntry();
  }

  async handleEntry() {
    const userJson = localStorage.getItem("user");
    const petJson = localStorage.getItem("currentPet");

    if (!userJson) {
      goToScene(this, "Auth", { fade: true });
      return;
    }

    const sessionOk = await this.ensureSession();
    if (!sessionOk) return;

    if (!petJson) {
      goToScene(this, "PetCreation", { fade: true });
      return;
    }

    // User and pet exist, proceed with game
    // Prepare background music but don't auto-play (may be suspended by browser)
    this.bgMusic = this.sound.add("MenuBgMusic", { loop: true, volume: 0.5 });

    // Title
    this.add
      .text(400, 250, "Digital Muse", { fontSize: "48px", color: "#fff" })
      .setOrigin(0.5);

    // Start button
    let button = this.add
      .text(400, 400, "Start", { fontSize: "32px", color: "#0f0" })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Helper to resume audio context and play music (returns a Promise)
    const resumeAndPlay = () => {
      const ctx = this.sound && this.sound.context;
      if (ctx && ctx.state === 'suspended') {
        return ctx.resume().then(() => {
          if (!this.bgMusic.isPlaying) this.bgMusic.play();
        }).catch((err) => {
          console.warn('AudioContext resume failed:', err);
        });
      }
      // If already running, just play
      if (!this.bgMusic.isPlaying) this.bgMusic.play();
      return Promise.resolve();
    };

    // If the AudioContext is suspended, show a small prompt and wait for user gesture
    this._audioPrompt = null;
    const audioCtx = this.sound && this.sound.context;
    if (audioCtx && audioCtx.state === 'suspended') {
      this._audioPrompt = this.add
        .text(400, 520, 'Click anywhere to enable audio', { fontSize: '16px', color: '#fff' })
        .setOrigin(0.5);

      // Resume on first pointerdown or keydown
      this.input.once('pointerdown', () => {
        resumeAndPlay().then(() => {
          if (this._audioPrompt) { this._audioPrompt.destroy(); this._audioPrompt = null; }
        });
      });
      this.input.keyboard.once('keydown', () => {
        resumeAndPlay().then(() => {
          if (this._audioPrompt) { this._audioPrompt.destroy(); this._audioPrompt = null; }
        });
      });
    } else {
      // Audio is allowed; play immediately
      if (!this.bgMusic.isPlaying) this.bgMusic.play();
    }

    // When Start is clicked, ensure audio is resumed/playing before transitioning
    button.on("pointerdown", () => {
      resumeAndPlay().then(() => {
        // Use shared helper to stop/fade music and switch scene
        goToScene(this, "HomeScene", { fade: true, fadeDuration: 400 });
      });
    });

    // Create cursor entity
    this.cursor = new Cursor(this, { assetKey: "cursor", scale: 1 });

    // Also ensure music stops if this scene is shutdown for any other reason
    this.events.on('shutdown', () => {
      try {
        if (this.bgMusic && this.bgMusic.isPlaying) {
          this.bgMusic.stop();
        }
      } catch (e) {
        console.warn('Failed to stop bgMusic on shutdown:', e);
      }
    });
  }

  async ensureSession() {
    try {
      const { user } = await apiClient.getMe();
      localStorage.setItem("user", JSON.stringify(user));
      return true;
    } catch (err) {
      console.error("[StartScene] Session check failed:", err);
      localStorage.removeItem("user");
      localStorage.removeItem("currentPet");
      goToScene(this, "Auth", { fade: true });
      return false;
    }
  }
}
