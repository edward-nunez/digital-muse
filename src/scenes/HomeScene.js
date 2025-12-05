import { Cursor } from "../entities/Cursor.js";
import { DefaultMenu } from "../entities/DefaultMenu.js";
import { goToScene } from "../utils/sceneHelpers.js";

export class HomeScene extends Phaser.Scene {
  constructor() {
    super({
      key: "HomeScene",
    });
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
    this.load.image("HomeBg", "assets/backgrounds/HomeBg.png");
    this.load.audio("HomeBgMusic", "/assets/sounds/music/HomeBgMusic.mp3");
    this.load.audio("SlapSfx", "/assets/sounds/sfx/SlapSfx.ogg");
    this.load.audio("RubSfx", "/assets/sounds/sfx/RubSfx.wav");


    // pet sprite sheet: 128x16 with 8 frames of 16x16
    this.load.spritesheet("pet", "assets/sprites/petSheet.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image("cursor", "assets/sprites/cursorSheet.png");
  }
  create() {
    // Add background image
    const bg = this.add.image(0, 0, "HomeBg");
    bg.setOrigin(0, 0);
    this.bgMusic = this.sound
      .add("HomeBgMusic")
      .setLoop(true)
      .setVolume(0.5)
      .play();

    // Camera setup
    const cam = this.cameras.main;

    // adjust bounds: horizontal free within margins, vertical limited to 240-600
    this.petMinX = 50;
    this.petMaxX = cam.width - 50;
    this.petMinY = 240;
    // cap max Y to 600 but also keep a small bottom margin so sprite isn't clipped
    this.petMaxY = Math.min(cam.height - 50, 600);

    // Create cursor entity
    this.cursor = new Cursor(this, { assetKey: "cursor", scale: 1 });

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

      // Defer Pet creation to the next tick so the scene's animation system is ready
      this.time.delayedCall(0, () => {
        this.pet = PetStore.getOrCreateInstance(
          this,
          cam.centerX,
          cam.centerY,
          opts
        );

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

    this.menu = new DefaultMenu(this, {
      options: [
        { label: "Chat", x: 60, y: 30 },
        { label: "Explore", x: cam.width - 60, y: 30 },

        { label: "Play", x: cam.centerX - 300, y: cam.height - 30 },
        { label: "Sleep", x: cam.centerX - 180, y: cam.height - 30 },
        { label: "Clean", x: cam.centerX - 60, y: cam.height - 30 },
        { label: "Toilet", x: cam.centerX + 60, y: cam.height - 30 },
        { label: "Train", x: cam.centerX + 180, y: cam.height - 30 },
        { label: "Care", x: cam.centerX + 300, y: cam.height - 30 },
      ],
      onOptionClick: (option) => {
        // Handle menu option clicks via shared helper
        switch (option) {
          case "Chat":
            goToScene(this, "ChatScene", { fade: true, fadeDuration: 400 });
            break;
          case "Explore":
            goToScene(this, "ExploreScene", { fade: true, fadeDuration: 400 });
            break;
          case "Care":
            goToScene(this, "CareScene", { fade: true, fadeDuration: 400 });
            break;
          case "Train":
            goToScene(this, "TrainScene", { fade: true, fadeDuration: 400 });
            break;
          case "Play":
            goToScene(this, "PlayScene", { fade: true, fadeDuration: 400 });
            break;
          case "Sleep":
            console.log("Sleep option selected");
            break;
          case "Clean":
            console.log("Clean option selected");
            break;
          case "Toilet":
            console.log("Toilet option selected");
            break;
        }
      },
    });
  }
  update(time, delta) {
    if (this.pet && typeof this.pet.update === "function") {
      this.pet.update(time, delta);
    }
  }
}
