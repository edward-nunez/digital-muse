import Phaser, { Physics } from "phaser";

import "./style.css";
import { StartScene } from "./scenes/StartScene";
import { AuthScene } from "./scenes/AuthScene";
import { PetCreationScene } from "./scenes/PetCreationScene";
import { HomeScene } from "./scenes/HomeScene";
import { CareScene } from "./scenes/CareScene";
import { LoadingScreen } from "./scenes/LoadingScreen";
import { TrainScene } from "./scenes/TrainScene";
import { ExploreScene } from "./scenes/ExploreScene";
import { PlayScene } from "./scenes/PlayScene";
import { OnlineBattleScene } from "./scenes/OnlineBattleScene";

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
    AuthScene,
    PetCreationScene,
    HomeScene,
    CareScene,
    TrainScene,
    ExploreScene,
    PlayScene,
    OnlineBattleScene,
    LoadingScreen,
  ],
};

const game = new Phaser.Game(config);
