import { Cursor } from "../entities/Cursor.js";

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: "BattleScene" });
  }
  init() {
    // Initialization code for the scene
  }

  preload() {
    // Load assets needed for the scene
    this.load.image("BattleBg", "assets/backgrounds/BattleBg.png");
    this.load.audio("BattleBgMusic", "assets/sounds/music/BattleBgMusic.mp3");

    // pet sprite sheet: 128x16 with 8 frames of 16x16
    this.load.spritesheet("pet", "assets/sprites/petSheet.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image("cursor", "assets/sprites/cursorSheet.png");
  }
  create() {
    // Add background image
    const bg = this.add.image(0, 0, "BattleBg");
    bg.setOrigin(0, 0);
    this.bgMusic = this.sound
      .add("BattleBgMusic")
      .setLoop(true)
      .setVolume(0.5)
      .play();

    // Camera setup
    const cam = this.cameras.main;

    // Create cursor entity
    this.cursor = new Cursor(this, { assetKey: "cursor", scale: 1 });
  }
  update(time, delta) {
    // Update logic for the scene
  }
}
