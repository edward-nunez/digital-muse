import Phaser, { Physics } from "phaser";

import "./style.css";
import { StartScene } from "./scenes/StartScene";
import { HomeScene } from "./scenes/HomeScene";
import { CareScene } from "./scenes/CareScene";
import { LoadingScreen } from "./scenes/LoadingScreen";
import { TrainScene } from "./scenes/TrainScene";
import { ExploreScene } from "./scenes/ExploreScene";
import { PlayScene } from "./scenes/PlayScene";

const config = {
  type: Phaser.WEBGL,
  title: "Digital Muse",
  description: "Virtual Pet Game",
  canvas: document.getElementById("gameCanvas"),
  scale: {
    width: 800,
    height: 600,
  },
  render: {
    pixelArt: true,
    antialias: false,
    antialiasGL: false,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: true,
    },
  },
  scene: [
    StartScene,
    HomeScene,
    CareScene,
    TrainScene,
    ExploreScene,
    PlayScene,
    LoadingScreen,
  ],
};

const game = new Phaser.Game(config);
