export class Clipboard {
  /**
   * Reusable clipboard overlay entity for displaying formatted data.
   *
   * scene: Phaser.Scene
   * opts: {
   *   title: 'Pet Status' (default),
   *   boardWidth: 520 (default, max-clamped to 520px),
   *   boardHeight: 620 (default, max-clamped to 620px),
   *   boardColor: 0x8c5b3b (default),
   *   boardStroke: { width: 2, color: 0x5f3a21 } (default),
   *   paperColor: 0xf7f5e7 (default),
   *   paperStroke: { width: 1, color: 0xded9c8 } (default),
   *   clipColor: 0xb9b2b6 (default),
   *   clipStroke: { width: 2, color: 0x7a7078 } (default),
   *   clipInnerColor: 0x736a72 (default),
   *   titleFont: '24px Arial' (default),
   *   titleColor: '#4a3626' (default),
   *   textFont: '18px Arial' (default),
   *   textColor: '#2f2a25' (default),
   *   textLineSpacing: 6 (default),
   *   animDuration: 500 (show duration, ms),
   *   hideAnimDuration: 400 (hide duration, ms),
   *   backdropColor: 0x000000 (default),
   *   backdropAlpha: 0.45 (default),
   *   depth: 1005 (default),
   *   backdropDepth: 1004 (default)
   * }
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.title = opts.title ?? "Pet Status";
    this.boardWidth = Math.min(opts.boardWidth ?? 520, 520);
    this.boardHeight = opts.boardHeight ?? 620;
    this.boardColor = opts.boardColor ?? 0x8c5b3b;
    this.boardStroke = opts.boardStroke ?? { width: 2, color: 0x5f3a21 };
    this.paperColor = opts.paperColor ?? 0xf7f5e7;
    this.paperStroke = opts.paperStroke ?? { width: 1, color: 0xded9c8 };
    this.clipColor = opts.clipColor ?? 0xb9b2b6;
    this.clipStroke = opts.clipStroke ?? { width: 2, color: 0x7a7078 };
    this.clipInnerColor = opts.clipInnerColor ?? 0x736a72;
    this.titleFont = opts.titleFont ?? "24px Arial";
    this.titleColor = opts.titleColor ?? "#4a3626";
    this.textFont = opts.textFont ?? "18px Arial";
    this.textColor = opts.textColor ?? "#2f2a25";
    this.textLineSpacing = opts.textLineSpacing ?? 6;
    this.animDuration = opts.animDuration ?? 500;
    this.hideAnimDuration = opts.hideAnimDuration ?? 400;
    this.backdropColor = opts.backdropColor ?? 0x000000;
    this.backdropAlpha = opts.backdropAlpha ?? 0.45;
    this.depth = opts.depth ?? 1005;
    this.backdropDepth = opts.backdropDepth ?? 1004;

    this.container = null;
    this.backdrop = null;
    this.textElement = null;
    this.isVisible = false;
    this.tween = null;

    this._setup();
  }

  _setup() {
    const cam = this.scene.cameras.main;

    // Backdrop (dimming overlay)
    this.backdrop = this.scene.add
      .rectangle(
        cam.centerX,
        cam.centerY,
        cam.width,
        cam.height,
        this.backdropColor,
        this.backdropAlpha
      )
      .setScrollFactor(0)
      .setDepth(this.backdropDepth)
      .setAlpha(0)
      .setVisible(false)
      .setInteractive();
    this.backdrop.on("pointerdown", () => this.hide());

    // Calculate positions
    const menuHeight = 120; // Account for menu buttons at top
    this.homeY = cam.centerY + menuHeight;
    this.hiddenY = cam.height + this.boardHeight / 2;

    // Clipboard container
    this.container = this.scene.add
      .container(cam.centerX, this.hiddenY)
      .setDepth(this.depth)
      .setAlpha(0)
      .setVisible(false)
      .setScrollFactor(0);

    const clipboardImage = this.scene.add
      .image(0, -120, "clipboard")
      .setScale(1)
      .setScrollFactor(0);

    const shadow = this.scene.add
      .image(5, -110, "clipboard")
      .setAlpha(0.2)
      .setTint(0x000000)
      .setScrollFactor(0);

    const titleText = this.scene.add
      .text(0, -this.boardHeight / 2 + 30, this.title, {
        font: this.titleFont,
        color: this.titleColor,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.textElementTopLeft = this.scene.add
      .text(-240, -210, "", {
        font: this.textFont,
        color: this.textColor,
        align: "left",
        wordWrap: { width: this.boardWidth - 120, useAdvancedWrap: true },
        lineSpacing: this.textLineSpacing,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.textElementTopRight = this.scene.add
      .text(100, -210, "", {
        font: this.textFont,
        color: this.textColor,
        align: "left",
        wordWrap: { width: this.boardWidth - 120, useAdvancedWrap: true },
        lineSpacing: this.textLineSpacing,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.textElementCenter = this.scene.add
      .text(-145, -160, "", {
        font: this.textFont,
        color: this.textColor,
        align: "left",
        wordWrap: { width: this.boardWidth - 120, useAdvancedWrap: true },
        lineSpacing: this.textLineSpacing,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.textElementBottomLeft = this.scene.add
      .text(-240, -30, "", {
        font: this.textFont,
        color: this.textColor,
        align: "left",
        wordWrap: { width: this.boardWidth - 120, useAdvancedWrap: true },
        lineSpacing: this.textLineSpacing,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.textElementBottomRight = this.scene.add
      .text(100, -10, "", {
        font: this.textFont,
        color: this.textColor,
        align: "left",
        wordWrap: { width: this.boardWidth - 120, useAdvancedWrap: true },
        lineSpacing: this.textLineSpacing,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    this.container.add([
      shadow,
      clipboardImage,
      titleText,
      this.textElementTopLeft,
      this.textElementTopRight,
      this.textElementCenter,
      this.textElementBottomLeft,
      this.textElementBottomRight,
    ]);
  }

  /**
   * Show the clipboard with content
   * @param {object} profile - Profile data to display
   */
  show(profile) {
    if (this.isVisible) {
      this.setContent(content);
      return;
    }

    if (this.tween) {
      this.tween.stop();
      return;
    }
    const content = this.formatStatsText(profile);

    if (this.scene.sound) {
      const sfx =
        this.scene.sound.get("OpenClipboardSfx") ||
        this.scene.sound.add("OpenClipboardSfx");
      if (sfx) sfx.play({ volume: 0.9 });
    }

    this.setContent(content);

    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.container.setY(this.hiddenY);

    // Fade in backdrop
    if (this.backdrop) {
      this.backdrop.setVisible(true);
      this.backdrop.setInteractive();
      this.scene.tweens.add({
        targets: this.backdrop,
        alpha: this.backdropAlpha,
        duration: 250,
        ease: "Cubic.easeOut",
      });
    }

    // Slide up container
    this.tween = this.scene.tweens.add({
      targets: this.container,
      y: this.homeY,
      alpha: 1,
      duration: this.animDuration,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.isVisible = true;
        this.tween = null;
      },
    });
  }

  /**
   * Hide the clipboard
   */
  hide() {
    if (!this.isVisible || !this.container) return;

    if (this.scene.sound) {
      const sfx =
        this.scene.sound.get("CloseClipboardSfx") ||
        this.scene.sound.add("CloseClipboardSfx");
      if (sfx) sfx.play({ volume: 0.9 });
    }

    if (this.tween) {
      this.tween.stop();
    }

    this.tween = this.scene.tweens.add({
      targets: this.container,
      y: this.hiddenY,
      alpha: 0,
      duration: this.hideAnimDuration,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.isVisible = false;
        this.container.setVisible(false);
        this.container.setAlpha(0);
        this.container.setY(this.hiddenY);
        this.tween = null;
      },
    });

    if (this.backdrop) {
      this.scene.tweens.add({
        targets: this.backdrop,
        alpha: 0,
        duration: 250,
        ease: "Cubic.easeIn",
        onComplete: () => {
          this.backdrop.setVisible(false);
          this.backdrop.disableInteractive();
        },
      });
    }
  }

  formatStatsText(profile) {
    const content = {
      topLeft: [],
      topRight: [],
      center: [],
      bottomLeft: [],
      bottomRight: [],
    };

    content.topLeft.push(`Name: ${profile.name}`);
    content.topLeft.push(`Class: ${profile.className}`);
    content.topRight.push(`Personality: ${profile.personality}`);
    content.topRight.push(`Alignment: ${profile.alignment}`);
    content.center.push(
      `HP: ${profile.stats.vitals.hp}  MP: ${profile.stats.vitals.mp}  Mood: ${profile.stats.vitals.mood} Hunger: ${profile.stats.vitals.hunger}`
    );

    const stats = profile.stats || {};
    content.bottomLeft = this.objectToTextLines("Attributes", stats.attributes);
    content.bottomRight = this.objectToTextLines("Physical", stats.physical);
    content.bottomRight.push(...this.objectToTextLines("Magic", stats.magic));

    return content;
  }

  objectToTextLines(sectionName, section) {
    const formatKey = (key) =>
      (() => {
        const spaced = key.replace(/([A-Z])/g, " $1").trim();
        if (spaced.length <= 3) {
          return spaced.toUpperCase();
        }
        return spaced.replace(/^./, (c) => c.toUpperCase());
      })();

    const stats = section || {};
    const lines = [sectionName];

    Object.keys(stats).forEach((key) => {
      lines.push(`${formatKey(key)}: ${stats[key]}`);
    });
    return lines;
  }

  /**
   * Update the displayed content
   * @param {object} content - The text content to display
   */
  setContent(content) {
    if (this.textElementTopLeft) {
      this.textElementTopLeft.setText(content.topLeft);
    }
    if (this.textElementTopRight) {
      this.textElementTopRight.setText(content.topRight);
    }
    if (this.textElementCenter) {
      this.textElementCenter.setText(content.center);
    }
    if (this.textElementBottomLeft) {
      this.textElementBottomLeft.setText(content.bottomLeft);
    }
    if (this.textElementBottomRight) {
      this.textElementBottomRight.setText(content.bottomRight);
    }
  }

  /**
   * Toggle visibility
   */
  toggle(content = "") {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show(content);
    }
  }

  /**
   * Destroy clipboard and clean up
   */
  destroy() {
    if (this.tween) {
      this.tween.stop();
      this.tween = null;
    }
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    if (this.backdrop) {
      this.backdrop.destroy();
      this.backdrop = null;
    }
    this.textElement = null;
    this.isVisible = false;
  }
}
