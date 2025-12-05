export class HomeMenu {
  /**
   * scene: Phaser.Scene
   * opts: { onOptionClick }
   *   onOptionClick: callback(option) when button clicked
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.onOptionClick = opts.onOptionClick ?? (() => {});

    this.buttons = [];
    this.container = null;

    this._create();
  }

  _create() {
    // Create a container to hold all menu elements
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(1001); // ensure on top

    const cam = this.scene.cameras.main;
    const padding = 20;
    const btnWidth = 100;
    const btnHeight = 40;

    // Button positions: Chat (top-left), Explore (top-right), Play/Sleep/Clean/Toilet/Train/Care (bottom center row)
    const positions = {
      'Chat': { x: padding + btnWidth / 2, y: padding + btnHeight / 2 },
      'Explore': { x: cam.width - padding - btnWidth / 2, y: padding + btnHeight / 2 },
      'Play': { x: cam.centerX - 240, y: cam.height - padding - btnHeight / 2 },
      'Sleep': { x: cam.centerX - 120, y: cam.height - padding - btnHeight / 2 },
      'Clean': { x: cam.centerX, y: cam.height - padding - btnHeight / 2 },
      'Toilet': { x: cam.centerX + 120, y: cam.height - padding - btnHeight / 2 },
      'Train': { x: cam.centerX + 240, y: cam.height - padding - btnHeight / 2 },
      'Care': { x: cam.centerX + 360, y: cam.height - padding - btnHeight / 2 }
    };

    const options = ['Chat', 'Explore', 'Play', 'Sleep', 'Clean', 'Toilet', 'Train', 'Care'];

    // Create buttons for each option
    options.forEach((option) => {
      const pos = positions[option];

      // Button background
      const btn = this.scene.add.rectangle(
        pos.x,
        pos.y,
        btnWidth,
        btnHeight,
        0x333333,
        0.8
      );
      btn.setStrokeStyle(1, 0x00ff00);
      btn.setInteractive();
      btn.setData('option', option);
      this.container.add(btn);

      // Button text
      const txt = this.scene.add.text(pos.x, pos.y, option, {
        font: '14px Arial',
        color: '#00ff00',
        align: 'center'
      }).setOrigin(0.5);
      this.container.add(txt);

      // Button hover/click handlers
      btn.on('pointerover', () => {
        btn.setFillStyle(0x444444, 0.9);
        txt.setColor('#ffff00');
      });

      btn.on('pointerout', () => {
        btn.setFillStyle(0x333333, 0.8);
        txt.setColor('#00ff00');
      });

      btn.on('pointerdown', () => {
        console.log(`Menu option clicked: ${option}`);
        this.onOptionClick(option);
      });

      this.buttons.push({ btn, txt, option });
    });
  }

  /**
   * Show or hide the menu
   */
  setVisible(visible) {
    this.container.setVisible(visible);
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
