export class Cursor {
  /**
   * scene: Phaser.Scene (must have physics enabled)
   * opts: { assetKey, scale, offset }
   *   assetKey: sprite/image key (default 'cursor')
   *   scale: sprite scale (default 1)
   *   offset: { x, y } offset from actual mouse position (default { x: 0, y: 0 })
   */
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.assetKey = opts.assetKey ?? 'cursor';
    this.scale = opts.scale ?? 1;
    this.offset = opts.offset ?? { x: 0, y: 0 };

    // Create sprite at initial mouse position
    const pointerX = scene.input.mousePointer?.x ?? scene.cameras.main.centerX;
    const pointerY = scene.input.mousePointer?.y ?? scene.cameras.main.centerY;

    this.sprite = scene.add.sprite(pointerX, pointerY, this.assetKey);
    this.sprite.setScale(this.scale);
    this.sprite.setDepth(1010); // ensure cursor is always on top

    // Add physics body for collisions/overlaps
    scene.physics.world.enable(this.sprite);
    this.sprite.body.setCollideWorldBounds(false); // cursor can go anywhere
    this.sprite.body.moves = false; // static body; we move it manually

    // Callbacks for interactions
    this.onOverlapCallbacks = [];
    this.onClickCallbacks = [];

    this._setupInput();
  }

  _setupInput() {
    // Track mouse movement
    this._onPointerMove = (pointer) => {
      this.sprite.x = pointer.x + this.offset.x;
      this.sprite.y = pointer.y + this.offset.y;
    };
    this.scene.input.on('pointermove', this._onPointerMove);

    // Track mouse clicks
    this._onPointerDown = (pointer) => {
      this.onClickCallbacks.forEach(cb => cb(this, pointer));
    };
    this.scene.input.on('pointerdown', this._onPointerDown);
  }

  /**
   * Register a callback when cursor clicks
   */
  onCursorClick(callback) {
    this.onClickCallbacks.push(callback);
  }

  /**
   * Register a callback for overlap detection (call manually from scene)
   */
  onOverlap(callback) {
    this.onOverlapCallbacks.push(callback);
  }

  /**
   * Check overlap with another sprite/body
   */
  checkOverlapWith(target) {
    if (!this.sprite || !target) return false;
    // Use the scene's arcade physics overlap check which returns boolean
    try {
      return !!this.scene.physics.overlap(this.sprite, target);
    } catch (e) {
      return false;
    }
  }

  /**
   * Get current world position
   */
  getPosition() {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  /**
   * Show/hide cursor
   */
  setVisible(visible) {
    this.sprite.setVisible(visible);
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this._onPointerMove) this.scene.input.off('pointermove', this._onPointerMove);
    if (this._onPointerDown) this.scene.input.off('pointerdown', this._onPointerDown);
    this.sprite.destroy();
  }
}
