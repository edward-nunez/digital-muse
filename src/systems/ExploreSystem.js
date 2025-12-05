import { NPCPet } from "../entities/NPCPet.js";

// ExploreSystem - manages Walk and Search events
// Walk: random NPC encounter (Friend/Cleric dialogue puzzle or Rival/Rogue battle hook)
// Search: random item find or trap disarm challenge
export class ExploreSystem {
  constructor(scene, pet) {
    this.scene = scene;
    this.pet = pet;
    this.dialogueActive = false;
    this.originalUpdate = null;

    this.friendConfig = {
      key: "npc_friend",
      name: "Friend",
      className: "Cleric",
      tint: 0x7fd7ff,
    };

    this.rivalConfig = {
      key: "npc_rival",
      name: "Rival",
      className: "Rogue",
      tint: 0xff7f7f,
    };

    this.dialoguePuzzles = [
      {
        question: "A path splits into three: wisdom, courage, and wealth. Which leads to peace?",
        options: ["Wisdom", "Courage", "Wealth"],
        correctIndex: 0,
      },
      {
        question: "I heal the broken yet cannot heal myself. What am I?",
        options: ["Time", "Cleric", "Hope"],
        correctIndex: 2,
      },
      {
        question: "Silence is my ally, light is my bane. What am I?",
        options: ["Shadow", "Secret", "Fear"],
        correctIndex: 1,
      },
    ];

    this.items = ["Ancient Coin", "Healing Herb", "Shiny Pebble", "Old Key", "Glowing Rune"];
    this.traps = ["snare", "poison needle", "sleep gas", "curse sigil"];
  }

  // Public API
  handleWalk() {
    // disable menu during event
    this.scene.menu?.setEnabled?.(false);
    const roll = Math.random();
    if (roll < 0.5) {
      this._spawnFriendDialogue();
    } else {
      this._spawnRivalEncounter();
    }
  }

  handleSearch() {
    // disable menu during event
    this.scene.menu?.setEnabled?.(false);
    const roll = Math.random();
    if (roll < 0.55) {
      this._foundItem();
    } else {
      this._trapEvent();
    }
    // re-enable after search event completes
    this.scene.menu?.setEnabled?.(true);
  }

  // --- Walk helpers ---
  _spawnFriendDialogue() {
    const npc = this._createNPC(this.friendConfig);
    npc.playTalk();

    const puzzle = Phaser.Utils.Array.GetRandom(this.dialoguePuzzles);
    this._showDialoguePanel({
      npc,
      title: `${npc.name} the ${npc.className}`,
      text: puzzle.question,
      options: puzzle.options,
      onSelect: (index) => {
        const correct = index === puzzle.correctIndex;
        this._toast(correct ? "Friend smiles: That's right." : "Friend sighs: Not quite.");
        npc.destroy();
      },
    });
  }

  _spawnRivalEncounter() {
    const npc = this._createNPC(this.rivalConfig);
    npc.playBattle();
    this._showDialoguePanel({
      npc,
      title: `${npc.name} the ${npc.className}`,
      text: "Rival blocks your path. What do you do?",
      options: ["Stand ground", "Retreat", "Taunt"],
      onSelect: () => {
        console.log("battle starts");
        npc.destroy();
      },
    });
  }

  // --- Search helpers ---
  _foundItem() {
    const item = Phaser.Utils.Array.GetRandom(this.items);
    this._toast(`Found item: ${item}`);
  }

  _trapEvent() {
    const trap = Phaser.Utils.Array.GetRandom(this.traps);
    const success = Math.random() < 0.55;
    if (success) {
      this._toast(`You disarmed the ${trap}!`);
    } else {
      const effects = ["damaged", "cursed", "sick"];
      const effect = Phaser.Utils.Array.GetRandom(effects);
      this._toast(`Trap (${trap}) sprung! Pet is ${effect}.`);
      console.log(`Trap consequence: pet is ${effect}`);
    }
  }

  // --- UI helpers ---
  _lockPet() {
    // Save and override pet update to freeze movement
    this.originalUpdate = this.pet.update.bind(this.pet);
    this.pet.update = (time, delta) => {
      // Keep velocity at zero during dialogue
      this.pet.vx = 0;
      this.pet.vy = 0;
      return;
    };
    
    // Ensure idle state and animation
    this.pet.state = "idle";
    this.pet._ensureIdle();
    this.dialogueActive = true;
  }

  _unlockPet() {
    if (this.originalUpdate) {
      this.pet.update = this.originalUpdate;
      this.originalUpdate = null;
    }
    this.pet._initMovement();
    this.dialogueActive = false;
  }

  // --- UI helpers ---
  _positionCharactersAbovePanel(npc, panelY, panelWidth) {
    const cam = this.scene.cameras.main;
    const characterY = panelY - 130;
    const panelCenterX = cam.centerX;
    const petCurrentX = this.pet.sprite.x;


    // Position pet above dialogue
    const petX = panelCenterX - panelWidth / 2 + 80;
    this.pet.sprite.x = petX;
    this.pet.sprite.y = characterY - 60;
    this.pet.sprite.setFlipX(true); // Face towards NPC

    // Position NPC opposite the pet
    const npcX = panelCenterX + panelWidth / 2 - 80;
    if (npc && npc.sprite) {
      npc.sprite.x = npcX;
      npc.sprite.y = characterY - 60;
      npc.sprite.setFlipX(false); // Face towards pet
    }
  }

  // --- UI helpers ---
  _showDialoguePanel({ npc, title, text, options, onSelect }) {
    // Lock pet movement and positioning
    this._lockPet();
    
    // disable menu while dialogue is active
    this.scene.menu?.setEnabled?.(false);
    const cam = this.scene.cameras.main;
    const width = Math.min(520, cam.width * 0.8);
    const height = 200;
    const x = cam.centerX;
    const y = cam.height - height / 2 - 40;

    // Position characters above dialogue
    this._positionCharactersAbovePanel(npc, y, width);

    const panel = this.scene.add.container(x, y);
    panel.setDepth(120);

    const bg = this.scene.add.rectangle(0, 0, width, height, 0x0b1f33, 0.9);
    bg.setStrokeStyle(2, 0x89c2ff, 1);
    panel.add(bg);

    const titleText = this.scene.add.text(0, -height / 2 + 18, title, {
      fontSize: "18px",
      fontFamily: "Arial",
      color: "#ffffff",
    }).setOrigin(0.5, 0.5);
    panel.add(titleText);

    const bodyText = this.scene.add.text(0, -20, text, {
      fontSize: "14px",
      fontFamily: "Arial",
      color: "#d7e8ff",
      wordWrap: { width: width - 40 },
      align: "center",
    }).setOrigin(0.5, 0.5);
    panel.add(bodyText);

    const buttonSpacing = width / Math.max(options.length, 3);
    options.forEach((opt, i) => {
      const btn = this.scene.add.rectangle(
        -width / 2 + buttonSpacing * (i + 0.5),
        height / 2 - 36,
        Math.min(160, buttonSpacing - 20),
        32,
        0x1f3b5a,
        1
      );
      btn.setStrokeStyle(1, 0x89c2ff, 1);
      btn.setInteractive({ useHandCursor: true });

      const label = this.scene.add.text(btn.x, btn.y, opt, {
        fontSize: "14px",
        fontFamily: "Arial",
        color: "#d7e8ff",
        align: "center",
      }).setOrigin(0.5, 0.5);

      btn.on("pointerup", () => {
        onSelect(i);
        panel.destroy();
        // Unlock pet and restore movement
        this._unlockPet();
        // re-enable menu once resolved
        this.scene.menu?.setEnabled?.(true);
      });

      panel.add(btn);
      panel.add(label);
    });
  }

  _toast(message) {
    const cam = this.scene.cameras.main;
    const text = this.scene.add.text(cam.centerX, cam.centerY - 140, message, {
      fontSize: "16px",
      fontFamily: "Arial",
      color: "#ffffff",
      backgroundColor: "#0b1f33",
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5, 0.5);

    text.setDepth(130);
    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      duration: 500,
      delay: 1200,
      ease: "Quad.easeIn",
      onComplete: () => text.destroy(),
    });
  }

  _createNPC(config) {
    // Position NPC near bottom-left by default
    const cam = this.scene.cameras.main;
    const npc = new NPCPet(this.scene, {
      key: config.key,
      name: config.name,
      className: config.className,
      tint: config.tint,
      x: cam.centerX - 160,
      y: cam.height,
      scale: 10,
      depth: 110,
    });
    return npc;
  }
}