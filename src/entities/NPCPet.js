// NPCPet - lightweight NPC wrapper reusing the base pet spritesheet with per-NPC tints/keys
export class NPCPet {
  constructor(scene, opts) {
    this.scene = scene;
    this.key = opts.key;
    this.className = opts.className;
    this.tint = opts.tint ?? 0xffffff;
    this.name = opts.name ?? "";

    // Ensure unique animations per NPC to avoid key collisions
    this._ensureAnims();

    // Create sprite using shared pet spritesheet
    this.sprite = scene.add.sprite(opts.x ?? 0, opts.y ?? 0, "pet");
    this.sprite.setScale(opts.scale ?? 10);
    this.sprite.setTint(this.tint);
    this.sprite.setDepth(opts.depth ?? 50);

    this.playIdle();
  }

  _ensureAnims() {
    const a = this.scene.anims;
    const baseKey = (suffix) => `${this.key}_${suffix}`;

    if (!a.exists(baseKey("idle"))) {
      a.create({
        key: baseKey("idle"),
        frames: [
          { key: "pet", frame: 0, duration: 600 },
          { key: "pet", frame: 1, duration: 400 },
        ],
        repeat: -1,
      });
    }

    if (!a.exists(baseKey("talk"))) {
      a.create({
        key: baseKey("talk"),
        frames: a.generateFrameNumbers("pet", { start: 0, end: 1 }),
        frameRate: 2,
        repeat: -1,
      });
    }

    if (!a.exists(baseKey("battle"))) {
      a.create({
        key: baseKey("battle"),
        frames: a.generateFrameNumbers("pet", { start: 0, end: 3 }),
        frameRate: 6,
        repeat: 0,
      });
    }

    this.animKeys = {
      idle: baseKey("idle"),
      talk: baseKey("talk"),
      battle: baseKey("battle"),
    };
  }

  playIdle() {
    this.sprite.play(this.animKeys.idle);
  }

  playTalk() {
    this.sprite.play(this.animKeys.talk);
  }

  playBattle() {
    this.sprite.play(this.animKeys.battle);
  }

  destroy() {
    if (this.sprite) this.sprite.destroy();
  }
}