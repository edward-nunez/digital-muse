import "./style.css";
import Phaser from "phaser";

const sizes = {
  width: 500,
  height: 500,
};

class GameScene extends Phaser.Scene {
  constructor() {
    super("scene-game");
  }

  preload() {}

  create() {}

  update() {}
}

const config = {
  type: Phaser.WEBGL,
  title: "Digital Muse",
  description: "",
  width: sizes.width,
  height: sizes.height,
  canvas: gameCanvas,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: speedDown },
      debug: true,
    },
  },
  scene: [GameScene],
};

const game = new Phaser.Game(config);
