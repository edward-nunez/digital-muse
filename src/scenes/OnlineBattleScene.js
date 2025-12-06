import { Cursor } from "../entities/Cursor.js";
import { socketService } from "../services/SocketService.js";
import { goToScene } from "../utils/sceneHelpers.js";

export class OnlineBattleScene extends Phaser.Scene {
  constructor() {
    super({ key: "OnlineBattleScene" });
  }
  
  init() {
    this.lobby = [];
    this.currentPlayer = null;
    this.inBattle = false;
    this.battleData = null;
  }

  preload() {
    this.load.image("BattleBg", "assets/backgrounds/BattleBg.png");
    this.load.audio("BattleBgMusic", "assets/sounds/music/BattleBgMusic.mp3");
    this.load.spritesheet("pet", "assets/sprites/petSheet.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image("cursor", "assets/sprites/cursorSheet.png");
  }
  
  create() {
    const bg = this.add.image(0, 0, "BattleBg");
    bg.setOrigin(0, 0);
    this.bgMusic = this.sound
      .add("BattleBgMusic")
      .setLoop(true)
      .setVolume(0.5)
      .play();

    const cam = this.cameras.main;
    this.cursor = new Cursor(this, { assetKey: "cursor", scale: 1 });

    // Get current pet from store
    import("../state/PetStore.js").then(({ PetStore }) => {
      this.currentPlayer = {
        petId: PetStore.profile?.id || "local-pet",
        name: PetStore.profile?.name || "Your Pet",
        stats: PetStore.profile?.stats || {},
      };

      // Initialize multiplayer for this scene only
      this._initializeMultiplayer();
      this._createLobbyUI();
    });

    // Back button
    const backBtn = this.add
      .text(20, 20, "← Back", { fontSize: "20px", color: "#ffffff" })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this._leaveLobby();
        goToScene(this, "HomeScene", { fade: true });
      });
  }

  _initializeMultiplayer() {
    if (!socketService.isConnected()) {
      const socketUrl = import.meta.env.DIGITALMUSE_API_URL || "http://localhost:3000";
      socketService.connect(socketUrl);
    }

    // Join battle lobby
    socketService.emit("lobby:join", {
      petId: this.currentPlayer.petId,
      name: this.currentPlayer.name,
      stats: this.currentPlayer.stats,
    });

    // Listen for lobby updates
    socketService.on("lobby:updated", (data) => {
      this.lobby = data.players || [];
      this._refreshLobbyList();
    });

    // Listen for battle invitations
    socketService.on("battle:invited", (data) => {
      this._showBattleInvite(data);
    });

    // Listen for battle start
    socketService.on("battle:started", (data) => {
      this._startBattle(data);
    });

    // Listen for battle actions
    socketService.on("battle:action", (data) => {
      this._handleBattleAction(data);
    });

    // Listen for battle end
    socketService.on("battle:ended", (data) => {
      this._endBattle(data);
    });
  }

  _createLobbyUI() {
    const cam = this.cameras.main;

    // Title
    this.add
      .text(cam.centerX, 60, "Online Battle Lobby", {
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Lobby list container
    this.lobbyContainer = this.add.container(50, 120);
    this._refreshLobbyList();

    // Status text
    this.statusText = this.add
      .text(cam.centerX, cam.height - 40, "Waiting for players...", {
        fontSize: "16px",
        color: "#00ff00",
      })
      .setOrigin(0.5);
  }

  _refreshLobbyList() {
    if (!this.lobbyContainer) return;

    this.lobbyContainer.removeAll(true);

    const header = this.add.text(0, 0, "Players Online:", {
      fontSize: "20px",
      color: "#ffff00",
      fontStyle: "bold",
    });
    this.lobbyContainer.add(header);

    if (this.lobby.length === 0) {
      const emptyText = this.add.text(0, 40, "No players online", {
        fontSize: "16px",
        color: "#888888",
      });
      this.lobbyContainer.add(emptyText);
      return;
    }

    this.lobby.forEach((player, index) => {
      const yPos = 40 + index * 60;

      // Player card background
      const cardBg = this.add.rectangle(200, yPos + 20, 400, 50, 0x1a1a2e, 0.8);
      cardBg.setStrokeStyle(2, 0x4a5568);
      this.lobbyContainer.add(cardBg);

      // Player name
      const nameText = this.add.text(20, yPos, player.name || "Unknown", {
        fontSize: "18px",
        color: "#ffffff",
      });
      this.lobbyContainer.add(nameText);

      // Challenge button (only if not self)
      if (player.petId !== this.currentPlayer.petId) {
        const challengeBtn = this.add
          .text(350, yPos, "Challenge", {
            fontSize: "16px",
            color: "#00ff00",
            backgroundColor: "#2d3748",
            padding: { x: 10, y: 5 },
          })
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => {
            this._challengePlayer(player);
          })
          .on("pointerover", function() {
            this.setStyle({ color: "#ffffff", backgroundColor: "#00ff00" });
          })
          .on("pointerout", function() {
            this.setStyle({ color: "#00ff00", backgroundColor: "#2d3748" });
          });
        this.lobbyContainer.add(challengeBtn);
      } else {
        const youLabel = this.add.text(350, yPos, "(You)", {
          fontSize: "16px",
          color: "#888888",
          fontStyle: "italic",
        });
        this.lobbyContainer.add(youLabel);
      }
    });
  }

  _challengePlayer(player) {
    socketService.emit("battle:challenge", {
      challengerId: this.currentPlayer.petId,
      challengerName: this.currentPlayer.name,
      opponentId: player.petId,
    });
    this.statusText.setText(`Challenge sent to ${player.name}...`);
  }

  _showBattleInvite(data) {
    const cam = this.cameras.main;

    // Create invite modal
    const overlay = this.add.rectangle(
      cam.centerX,
      cam.centerY,
      cam.width,
      cam.height,
      0x000000,
      0.7
    ).setDepth(1000);

    const panel = this.add.container(cam.centerX, cam.centerY).setDepth(1001);

    const bg = this.add.rectangle(0, 0, 400, 200, 0x1a1a2e, 1);
    bg.setStrokeStyle(3, 0xffaa00);
    panel.add(bg);

    const title = this.add.text(0, -60, "Battle Invitation!", {
      fontSize: "24px",
      color: "#ffaa00",
      fontStyle: "bold",
    }).setOrigin(0.5);
    panel.add(title);

    const message = this.add.text(0, -20, `${data.challengerName} wants to battle!`, {
      fontSize: "18px",
      color: "#ffffff",
    }).setOrigin(0.5);
    panel.add(message);

    // Accept button
    const acceptBtn = this.add
      .text(-80, 50, "Accept", {
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: "#00aa00",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        socketService.emit("battle:accept", {
          battleId: data.battleId,
          accepterId: this.currentPlayer.petId,
        });
        overlay.destroy();
        panel.destroy();
      });
    panel.add(acceptBtn);

    // Decline button
    const declineBtn = this.add
      .text(80, 50, "Decline", {
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: "#aa0000",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        socketService.emit("battle:decline", {
          battleId: data.battleId,
        });
        overlay.destroy();
        panel.destroy();
      });
    panel.add(declineBtn);
  }

  _startBattle(data) {
    this.inBattle = true;
    this.battleData = data;
    this.statusText.setText("Battle started!");
    
    // Hide lobby UI
    if (this.lobbyContainer) {
      this.lobbyContainer.setVisible(false);
    }

    // TODO: Implement battle UI here
    console.log("[OnlineBattleScene] Battle started:", data);
  }

  _handleBattleAction(data) {
    // TODO: Handle battle actions (attacks, items, etc.)
    console.log("[OnlineBattleScene] Battle action:", data);
  }

  _endBattle(data) {
    this.inBattle = false;
    this.statusText.setText(data.winner === this.currentPlayer.petId ? "You won!" : "You lost!");
    
    // Show lobby again after delay
    this.time.delayedCall(3000, () => {
      if (this.lobbyContainer) {
        this.lobbyContainer.setVisible(true);
      }
      this.statusText.setText("Waiting for players...");
    });
  }

  _leaveLobby() {
    if (socketService.isConnected()) {
      socketService.emit("lobby:leave", {
        petId: this.currentPlayer?.petId,
      });
    }
  }

  shutdown() {
    this._leaveLobby();
    
    // Clean up socket listeners
    socketService.off("lobby:updated");
    socketService.off("battle:invited");
    socketService.off("battle:started");
    socketService.off("battle:action");
    socketService.off("battle:ended");
    
    if (this.bgMusic && this.bgMusic.isPlaying) {
      this.bgMusic.stop();
    }
  }

  update(time, delta) {
    // Update logic for the scene
  }
}
