import { Cursor } from "../entities/Cursor.js";
import { DefaultMenu } from "../entities/DefaultMenu.js";
import { ExploreSystem } from "../systems/ExploreSystem.js";
import { goToScene } from "../utils/sceneHelpers.js";

export class ExploreScene extends Phaser.Scene {
  constructor() {
    super({ key: "ExploreScene" });
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
    this.load.image("ExploreBg", "assets/backgrounds/ExploreBg.png");
    this.load.audio("ExploreBgMusic", "assets/sounds/music/ExploreBgMusic.mp3");

    // pet sprite sheet: 128x16 with 8 frames of 16x16
    this.load.spritesheet("pet", "assets/sprites/petSheet.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image("cursor", "assets/sprites/cursorSheet.png");
  }
  create() {
    // Add background image
    const bg = this.add.image(0, 0, "ExploreBg");
    bg.setOrigin(0, 0);
    this.bgMusic = this.sound
      .add("ExploreBgMusic")
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
        import("../systems/PetReactionSystem.js").then(({ PetReactionSystem }) => {
          this.petReactionSystem = new PetReactionSystem(this, this.pet);
          this.pet.reactionSystem = this.petReactionSystem;
          
          // Setup idle reaction timer (suppress during dialogue)
          this._scheduleNextIdleReaction();
        });

        // Initialize explore system once pet exists
        this.exploreSystem = new ExploreSystem(this, this.pet);

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
        { label: "Walk", x: cam.centerX, y: 30 },
        { label: "Search", x: cam.width - 60, y: 30 },
      ],
      onOptionClick: (option) => {
        console.log(`Menu option clicked: ${option}`);
        if (option === "Home") {
          goToScene(this, "HomeScene", { fade: true, fadeDuration: 400 });
        }
        if (option === "Walk") {
          if (this.exploreSystem) {
            this.exploreSystem.handleWalk();
          }
        }
        if (option === "Search") {
          if (this.exploreSystem) {
            this.exploreSystem.handleSearch();
          }
        }
      },
    });
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
    // Only trigger if scene is in neutral state (dialogue not active)
    if (this._isSceneNeutral() && this.petReactionSystem) {
      this.petReactionSystem.quickReaction('idle');
    }
    
    // Schedule next reaction
    this._scheduleNextIdleReaction();
  }

  _isSceneNeutral() {
    // Check if dialogue is not active
    return !(this.exploreSystem && this.exploreSystem.dialogueActive);
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
    // Clean up resources when scene is shut down
    if (this._idleReactionTimer) {
      this._idleReactionTimer.remove();
      this._idleReactionTimer = null;
    }
    if (this.petReactionSystem) {
      this.petReactionSystem.destroy();
    }
  }
}