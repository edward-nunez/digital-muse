export class DefaultMenu {
  /**
   * Reusable menu class for scene overlays.
   *
   * scene: Phaser.Scene
   * opts: {
   *   options: [
   *     { label: 'Home', x: 50, y: 30 },
   *     { label: 'Care', x: 750, y: 30 },
   *     { label: 'Stats', x: 400, y: 550 }
   *   ],
   *   onOptionClick: callback(label) when button clicked,
   *   buttonWidth: 100 (default),
   *   buttonHeight: 40 (default),
   *   buttonColor: 0x333333 (default),
   *   buttonAlpha: 0.8 (default),
   *   buttonStroke: { width: 1, color: 0x00ff00 } (default),
   *   hoverColor: 0x444444 (default),
   *   hoverAlpha: 0.9 (default),
   *   textFont: '14px Arial' (default),
   *   textColor: '#00ff00' (default),
   *   hoverTextColor: '#ffff00' (default),
   *   depth: 1001 (default)
   * }
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.onOptionClick = opts.onOptionClick ?? (() => {});

    // Parse options with sensible defaults
    this.options = opts.options ?? [];
    this.buttonWidth = opts.buttonWidth ?? 100;
    this.buttonHeight = opts.buttonHeight ?? 40;
    this.buttonColor = opts.buttonColor ?? 0x333333;
    this.buttonAlpha = opts.buttonAlpha ?? 0.8;
    this.buttonStroke = opts.buttonStroke ?? { width: 1, color: 0x00ff00 };
    this.hoverColor = opts.hoverColor ?? 0x444444;
    this.hoverAlpha = opts.hoverAlpha ?? 0.9;
    this.textFont = opts.textFont ?? "14px Arial";
    this.textColor = opts.textColor ?? "#00ff00";
    this.hoverTextColor = opts.hoverTextColor ?? "#ffff00";
    this.depth = opts.depth ?? 1001;

    this.buttons = [];
    this.container = null;

    this._create();
  }

  _create() {
    // Create a container to hold all menu elements
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(this.depth);

    // Create buttons for each option
    this.options.forEach((optionConfig) => {
      const { label, x, y } = optionConfig;

      if (!label || x === undefined || y === undefined) {
        console.warn(
          "Menu option must have label, x, and y properties",
          optionConfig
        );
        return;
      }

      // Button background
      const btn = this.scene.add.rectangle(
        x,
        y,
        this.buttonWidth,
        this.buttonHeight,
        this.buttonColor,
        this.buttonAlpha
      );
      btn.setStrokeStyle(this.buttonStroke.width, this.buttonStroke.color);
      btn.setInteractive();
      btn.setData("option", label);
      this.container.add(btn);

      // Button text
      const txt = this.scene.add
        .text(x, y, label, {
          font: this.textFont,
          color: this.textColor,
          align: "center",
        })
        .setOrigin(0.5);
      this.container.add(txt);

      // Button hover/click handlers
      btn.on("pointerover", () => {
        if (!btn.input || !btn.input.enabled) return;
        btn.setFillStyle(this.hoverColor, this.hoverAlpha);
        txt.setColor(this.hoverTextColor);
      });

      btn.on("pointerout", () => {
        if (!btn.input || !btn.input.enabled) return;
        btn.setFillStyle(this.buttonColor, this.buttonAlpha);
        txt.setColor(this.textColor);
      });

      btn.on("pointerdown", () => {
        console.log(`Menu option clicked: ${label}`);
        this.onOptionClick(label);
      });

      this.buttons.push({ btn, txt, label });
    });
  }

  /**
   * Show or hide the menu
   */
  setVisible(visible) {
    this.container.setVisible(visible);
  }

  /**
   * Enable/disable all buttons (for modal dialogs)
   */
  setEnabled(enabled) {
    this.buttons.forEach(({ btn, txt }) => {
      btn.disableInteractive();
      if (enabled) {
        btn.setInteractive({ useHandCursor: true });
      }
      txt.setAlpha(enabled ? 1 : 0.5);
      btn.setAlpha(enabled ? this.buttonAlpha : this.buttonAlpha * 0.5);
    });
  }

  /**
   * Destroy the menu and clean up
   */
  destroy() {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    this.buttons = [];
  }
}
