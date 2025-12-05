import { Cursor } from "../entities/Cursor.js";
import { DefaultMenu } from "../entities/DefaultMenu.js";
import { Chalkboard } from "../entities/Chalkboard.js";
import { QuizSystem } from "../systems/QuizSystem.js";
import { PetReactionSystem } from "../systems/PetReactionSystem.js";
import { goToScene } from "../utils/sceneHelpers.js";

export class PlayScene extends Phaser.Scene {
  constructor() {
    super({ key: "PlayScene" });
  }
  init() {
    // Initialization code for the scene
    this.petMinSpeed = 1.5;
    this.petMaxSpeed = 3;

    // Movement bounds (will be adjusted in create to camera size)
    this.petMinY = 230;
    this.petMaxY = 510;
    this.petMinX = 50;
    this.petMaxX = 750;

    // Direction change interval (ms)
    this.changeIntervalMin = 800; // ms
    this.changeIntervalMax = 2500; // ms
    this.nextChangeTime = 0;

    // Idle/stop behavior
    this.idleChance = 0.35; // chance to go idle when change occurs
    this.idleMin = 800; // ms
    this.idleMax = 3000; // ms
  }

  preload() {
    // Load assets needed for the scene
    this.load.image("PlaySceneBg", "assets/backgrounds/PlayScene.png");
    this.load.audio(
      "PlaySceneBgMusic",
      "assets/sounds/music/GoodEventBgMusic.mp3"
    );

    // pet sprite sheet: 128x16 with 8 frames of 16x16
    this.load.spritesheet("pet", "assets/sprites/petSheet.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image("cursor", "assets/sprites/cursorSheet.png");
  }
  create() {
    // Add background image
    const bg = this.add.image(0, 0, "PlaySceneBg");
    bg.setOrigin(0, 0);
    this.bgMusic = this.sound
      .add("PlaySceneBgMusic")
      .setLoop(true)
      .setVolume(0.5)
      .play();

    // Camera setup
    const cam = this.cameras.main;

    // Create cursor entity
    this.cursor = new Cursor(this, { assetKey: "cursor", scale: 1 });

    // adjust bounds: horizontal free within margins, vertical limited to 240-600
    this.petMinX = 50;
    this.petMaxX = cam.width - 50;
    this.petMinY = 240;
    // cap max Y to 600 but also keep a small bottom margin so sprite isn't clipped
    this.petMaxY = Math.min(cam.height - 50, 600);

    // create Pet entity and hand it configuration
    // Use PetStore to persist profile and reuse instance between scenes
    import("../state/PetStore.js").then(({ PetStore }) => {
      this._petStore = PetStore;
      this.petProfile = PetStore.getProfile();
      const opts = {
        scale: 10,
        minSpeed: this.petMinSpeed,
        maxSpeed: this.petMaxSpeed,
        changeIntervalMin: this.changeIntervalMin,
        changeIntervalMax: this.changeIntervalMax,
        idleChance: this.idleChance,
        idleMin: this.idleMin,
        idleMax: this.idleMax,
      };

      // Defer Pet creation to the next tick so animations and plugins are ready
      this.time.delayedCall(0, () => {
        this.pet = PetStore.getOrCreateInstance(
          this,
          cam.centerX,
          cam.centerY,
          opts
        );

        // Initialize pet reaction system
        this.petReactionSystem = new PetReactionSystem(this, this.pet);
        this.pet.reactionSystem = this.petReactionSystem;

        // Setup idle reaction timer
        this._scheduleNextIdleReaction();

        // Setup cursor-pet interaction
        // Use pointer coords so clicks only trigger when pointer is over the pet
        this.cursor.onCursorClick((cursor, pointer) => {
          if (!this.pet || !this.pet.sprite) return;
          const bounds = this.pet.sprite.getBounds();
          if (bounds.contains(pointer.x, pointer.y)) {
            console.log("Pet clicked!");
            // Trigger pet animations or interactions here
            // this.pet.playAttack();
          }
        });

        // apply bounds
        this.pet.setBounds(
          this.petMinX,
          this.petMaxX,
          this.petMinY,
          this.petMaxY
        );
      });
    });

    // Setup default menu
    this.menu = new DefaultMenu(this, {
      options: [
        { label: "Home", x: 60, y: 30 },
        // { label: "Fetch", x: cam.centerX, y: 30 },
        { label: "Quiz", x: cam.width - 60, y: 30 },
      ],
      onOptionClick: (option) => {
        if (option === "Home") {
          goToScene(this, "HomeScene", { fade: true, fadeDuration: 400 });
        } else if (option === "Quiz") {
          this._startQuiz();
        }
      },
    });

    // Initialize quiz system (but don't start it yet)
    this.chalkboard = null;
    this.quizSystem = null;
  }

  _scheduleNextIdleReaction() {
    // Schedule next idle reaction between 10-30 seconds
    const delay = Phaser.Math.Between(10000, 30000);
    
    if (this._idleReactionTimer) {
      this._idleReactionTimer.remove();
    }
    
    this._idleReactionTimer = this.time.delayedCall(delay, () => {
      this._triggerIdleReaction();
    });
  }

  _triggerIdleReaction() {
    // Only trigger if scene is in neutral state (no active quiz)
    if (this._isSceneNeutral() && this.petReactionSystem) {
      this.petReactionSystem.quickReaction('idle');
    }
    
    // Schedule next reaction
    this._scheduleNextIdleReaction();
  }

  _isSceneNeutral() {
    // Check if quiz is not active
    return !(this.quizSystem && this.quizSystem.isActive);
  }

  _startQuiz() {
    if (this.quizSystem && this.quizSystem.isActive) return;

    // Create chalkboard if not exists
    if (!this.chalkboard) {
      this.chalkboard = new Chalkboard(this, {
        width: 500,
        height: 500,
        y: this.cameras.main.centerY + 20,
      });
    }

    // Create quiz system if not exists
    if (!this.quizSystem) {
      this.quizSystem = new QuizSystem(
        this,
        this.pet,
        this.chalkboard,
        this.petReactionSystem
      );
    }

    // Start the quiz
    this.quizSystem.startQuiz();
  }
  update(time, delta) {
    // Update logic for the scene
    if (this.pet && typeof this.pet.update === "function") {
      this.pet.update(time, delta);
    }
    if (this.petReactionSystem && typeof this.petReactionSystem.update === "function") {
      this.petReactionSystem.update();
    }
  }

  shutdown() {
    // Clean up quiz system on scene shutdown
    if (this.quizSystem) {
      this.quizSystem.destroy();
    }
    if (this.chalkboard) {
      this.chalkboard.destroy();
    }
    if (this._idleReactionTimer) {
      this._idleReactionTimer.remove();
      this._idleReactionTimer = null;
    }
    if (this.petReactionSystem) {
      this.petReactionSystem.destroy();
    }
  }
}
