import { Cursor } from "../entities/Cursor.js";
import { DefaultMenu } from "../entities/DefaultMenu.js";
import { Clipboard } from "../entities/Clipboard.js";
import { goToScene } from "../utils/sceneHelpers.js";

export class CareScene extends Phaser.Scene {
  constructor() {
    super({ key: "CareScene" });
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
    this.load.image("CareBg", "assets/backgrounds/CareBg.png");
    this.load.image("clipboard", "assets/sprites/Clipboard.png");
    this.load.audio("CareBgMusic", "assets/sounds/music/CareBgMusic.mp3");
    this.load.audio("OpenClipboardSfx", "assets/sounds/sfx/OpenClipboardSfx.ogg");
    this.load.audio("CloseClipboardSfx", "assets/sounds/sfx/CloseClipboardSfx.ogg");

    // pet sprite sheet: 128x16 with 8 frames of 16x16
    this.load.spritesheet("pet", "assets/sprites/petSheet.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image("cursor", "assets/sprites/cursorSheet.png");
  }
  create() {
    // Add background image
    const bg = this.add.image(0, 0, "CareBg");
    bg.setOrigin(0, 0);
    this.bgMusic = this.sound
      .add("CareBgMusic")
      .setLoop(true)
      .setVolume(0.5)
      .play();

    // Camera setup
    const cam = this.cameras.main;

    // Setup clipboard for stats display
    this.statsClipboard = new Clipboard(this, {
      title: "Pet Status",
      boardWidth: Math.min(520, cam.width * 0.68),
      boardHeight: cam.height,
    });

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
        { label: "Stats", x: cam.centerX, y: 30 },
        { label: "Medic", x: cam.width - 60, y: 30 },
      ],
      onOptionClick: (option) => {
        if (option === "Home") {
          goToScene(this, "HomeScene", { fade: true, fadeDuration: 400 });
        } else if (option === "Stats") {
          this.statsClipboard.show(this.petProfile);
        } else if (option === "Medic") {
          console.log("Medic option clicked");
        }
      },
    });
  }

  update(time, delta) {
    // Update logic for the scene
    if (this.pet && typeof this.pet.update === "function") {
      this.pet.update(time, delta);
    }
  }
}
