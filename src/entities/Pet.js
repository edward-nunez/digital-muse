export class Pet {
  /**
   * scene: Phaser.Scene
   * x,y: initial position
   * opts: { scale, minSpeed, maxSpeed, changeIntervalMin, changeIntervalMax, idleChance, idleMin, idleMax }
   */
  // added optional profile param (last arg)
  constructor(scene, x = 0, y = 0, opts = {}, profile = null) {
    this.scene = scene;
    this.sprite = scene.add.sprite(x, y, "pet");
    this.sprite.setScale(opts.scale ?? 10);
    this.sprite.setInteractive({ cursor: 'pointer' });

    // attach profile (plain data object with name/stats)
    this.profile = profile;

    // Optional reaction system (can be set after construction)
    this.reactionSystem = null;

    // Add physics body for collisions/overlaps
    scene.physics.world.enable(this.sprite);
    this.sprite.body.setCollideWorldBounds(false); // cursor can go anywhere
    this.sprite.body.moves = false; // static body; we move it manually

    this.minSpeed = opts.minSpeed ?? 1.5;
    this.maxSpeed = opts.maxSpeed ?? 3;

    this.changeIntervalMin = opts.changeIntervalMin ?? 800;
    this.changeIntervalMax = opts.changeIntervalMax ?? 2500;

    this.idleChance = opts.idleChance ?? 0.35;
    this.idleMin = opts.idleMin ?? 800;
    this.idleMax = opts.idleMax ?? 3000;

    this.nextChangeTime = 0;
    this.state = "moving";

    // velocity in pixels/sec
    this.vx = 0;
    this.vy = 0;

    // logical bounds (will be set by scene)
    const cam = this.scene.cameras.main;
    this.bounds = { minX: 0, maxX: cam.width, minY: 0, maxY: cam.height };

    this._gesture = {
      active: false,
      lastX: 0,
      lastY: 0,
      totalX: 0,
      totalY: 0,
      resolved: false,
    };

    this._movementSnapshot = {
      vx: 0,
      vy: 0,
      state: 'moving',
    };

    this._resumeTimer = null;

    this._ensureAnims();
    this._initMovement();
    this._setupGestureInput();
  }

  _ensureAnims() {
    // define animations if not present
    const a = this.scene.anims;
    if (!a.exists("pet_idle")) {
      a.create({
        key: "pet_idle",
        frames: [
          { key: "pet", frame: 0, duration: 600 },
          { key: "pet", frame: 1, duration: 400 },
        ],
        repeat: -1,
      });
    }
    if (!a.exists("pet_walk")) {
      a.create({
        key: "pet_walk",
        frames: a.generateFrameNumbers("pet", { start: 0, end: 2 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    if (!a.exists("pet_attack")) {
      a.create({
        key: "pet_attack",
        frames: a.generateFrameNumbers("pet", { start: 0, end: 3 }),
        frameRate: 8,
        repeat: 0,
      });
    }
    if (!a.exists("pet_wounded")) {
      a.create({
        key: "pet_wounded",
        frames: a.generateFrameNumbers("pet", { start: 0, end: 4 }),
        frameRate: 6,
        repeat: 0,
      });
    }
  }

  _initMovement() {
    const speed = Phaser.Math.RND.realInRange(
      this.minSpeed * 30,
      this.maxSpeed * 30
    );
    const angle = Phaser.Math.RND.realInRange(0, Math.PI * 2);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    if (Math.random() < this.idleChance) {
      this.state = "idle";
      this.vx = 0;
      this.vy = 0;
      this.nextChangeTime =
        this.scene.time.now +
        Phaser.Math.RND.between(this.idleMin, this.idleMax);
      if (this.sprite.anims && typeof this.sprite.play === 'function') {
        this.sprite.play("pet_idle");
      } else {
        console.debug('[Pet] _initMovement skipped initial pet_idle play - anims missing');
      }
    } else {
      this.state = "moving";
      this.nextChangeTime =
        this.scene.time.now +
        Phaser.Math.RND.between(this.changeIntervalMin, this.changeIntervalMax);
      if (this.sprite.anims && typeof this.sprite.play === 'function') {
        this.sprite.play("pet_walk");
      } else {
        console.debug('[Pet] _initMovement skipped initial pet_walk play - anims missing');
      }
    }

    this.sprite.setFlipX(this.vx > 0);
  }

  setBounds(minX, maxX, minY, maxY) {
    this.bounds = { minX, maxX, minY, maxY };
    // clamp position
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x, minX, maxX);
    this.sprite.y = Phaser.Math.Clamp(this.sprite.y, minY, maxY);
  }

  /**
   * time: current time (ms)
   * delta: ms since last frame
   */
  update(time, delta) {
    // move
    this.sprite.x += this.vx * (delta / 1000);
    this.sprite.y += this.vy * (delta / 1000);

    // If this sprite has an arcade body, sync the body with the display position
    if (
      this.sprite.body &&
      typeof this.sprite.body.updateFromGameObject === "function"
    ) {
      this.sprite.body.updateFromGameObject();
    }

    // bounds reflection and ensure walking animation
    if (this.sprite.x <= this.bounds.minX) {
      this.sprite.x = this.bounds.minX;
      this.vx = Math.abs(this.vx);
      this._ensureWalking();
    } else if (this.sprite.x >= this.bounds.maxX) {
      this.sprite.x = this.bounds.maxX;
      this.vx = -Math.abs(this.vx);
      this._ensureWalking();
    }

    if (this.sprite.y <= this.bounds.minY) {
      this.sprite.y = this.bounds.minY;
      this.vy = Math.abs(this.vy);
      this._ensureWalking();
    } else if (this.sprite.y >= this.bounds.maxY) {
      this.sprite.y = this.bounds.maxY;
      this.vy = -Math.abs(this.vy);
      this._ensureWalking();
    }

    // Timer for random state change
    if (time >= this.nextChangeTime) {
      if (this.state === "idle") {
        // start moving again
        const angle = Phaser.Math.RND.realInRange(0, Math.PI * 2);
        const speed = Phaser.Math.RND.realInRange(
          this.minSpeed * 30,
          this.maxSpeed * 30
        );
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.state = "moving";
        this.nextChangeTime =
          time +
          Phaser.Math.RND.between(
            this.changeIntervalMin,
            this.changeIntervalMax
          );
        this._ensureWalking();
      } else {
        // currently moving: either change direction or go idle
        if (Math.random() < this.idleChance) {
          this.state = "idle";
          this.vx = 0;
          this.vy = 0;
          this.nextChangeTime =
            time + Phaser.Math.RND.between(this.idleMin, this.idleMax);
          this._ensureIdle();
        } else {
          const angle = Phaser.Math.RND.realInRange(0, Math.PI * 2);
          const speed = Phaser.Math.RND.realInRange(
            this.minSpeed * 30,
            this.maxSpeed * 30
          );
          this.vx = Math.cos(angle) * speed;
          this.vy = Math.sin(angle) * speed;
          this.state = "moving";
          this.nextChangeTime =
            time +
            Phaser.Math.RND.between(
              this.changeIntervalMin,
              this.changeIntervalMax
            );
          this._ensureWalking();
        }
      }
    }

    // flip based on vx (small threshold)
    const flipThreshold = 5;
    if (this.state === "moving") {
      const shouldFlip = this.vx > flipThreshold;
      if (this.sprite.flipX !== shouldFlip) this.sprite.setFlipX(shouldFlip);
    }

    // keep name text positioned above sprite if present
    if (this.nameText) {
      this.nameText.x = this.sprite.x;
      this.nameText.y = this.sprite.y - (this.sprite.displayHeight / 2) - 6;
    }
  }

  _ensureWalking() {
    this.state = "moving";
    if (this.sprite && this.sprite.anims && typeof this.sprite.play === 'function') {
      if (this.sprite.anims.currentAnim?.key !== "pet_walk") {
        this.sprite.play("pet_walk");
      }
    } else {
      // Debug log for transient cases where sprite is not ready to play animations
      console.debug('[Pet] _ensureWalking skipped - sprite/play not available', {
        name: this.profile?.name ?? '<unknown>',
        x: this.sprite?.x,
        y: this.sprite?.y,
        state: this.state,
      });
    }
  }

  _ensureIdle() {
    this.state = "idle";
    if (this.sprite && this.sprite.anims && typeof this.sprite.play === 'function') {
      if (this.sprite.anims.currentAnim?.key !== "pet_idle") {
        this.sprite.play("pet_idle");
      }
    } else {
      // Debug log for transient cases where sprite is not ready to play animations
      console.debug('[Pet] _ensureIdle skipped - sprite/play not available', {
        name: this.profile?.name ?? '<unknown>',
        x: this.sprite?.x,
        y: this.sprite?.y,
        state: this.state,
      });
    }
  }

  _setupGestureInput() {
    const isPointerOverPet = (pointer) => {
      if (!this.sprite) return false;
      const b = this.sprite.getBounds();
      return b.contains(pointer.x, pointer.y);
    };

    this._startGesture = (pointer) => {
      this._gesture.active = true;
      this._gesture.lastX = pointer.x;
      this._gesture.lastY = pointer.y;
      this._gesture.totalX = 0;
      this._gesture.totalY = 0;
      this._gesture.resolved = false;

      this._movementSnapshot.vx = this.vx;
      this._movementSnapshot.vy = this.vy;
      this._movementSnapshot.state = this.state;
      this.vx = 0;
      this.vy = 0;
      this.state = 'idle';
      this._ensureIdle();

      if (this._resumeTimer) {
        this._resumeTimer.remove();
        this._resumeTimer = null;
      }
    };

    this._onPointerDown = (pointer) => {
      // reset tracking; gesture will start once pointer moves over pet while held
      this._gesture.active = false;
      this._gesture.lastX = pointer.x;
      this._gesture.lastY = pointer.y;
      this._gesture.totalX = 0;
      this._gesture.totalY = 0;
      this._gesture.resolved = false;

      if (this._resumeTimer) {
        this._resumeTimer.remove();
        this._resumeTimer = null;
      }
    };

    this._onPointerMove = (pointer) => {
      if (!pointer.isDown) return;

      if (!this._gesture.active && isPointerOverPet(pointer)) {
        this._startGesture(pointer);
      }

      if (!this._gesture.active) return;
      const dx = pointer.x - this._gesture.lastX;
      const dy = pointer.y - this._gesture.lastY;
      this._gesture.lastX = pointer.x;
      this._gesture.lastY = pointer.y;
      this._gesture.totalX += Math.abs(dx);
      this._gesture.totalY += Math.abs(dy);

      if (this._gesture.resolved) return;

      const threshold = 45; // pixels of dominant movement
      const horizontalDominant =
        this._gesture.totalX >= threshold &&
        this._gesture.totalX > this._gesture.totalY * 1.25;
      const verticalDominant =
        this._gesture.totalY >= threshold &&
        this._gesture.totalY > this._gesture.totalX * 1.25;

      if (horizontalDominant) {
        const goingRight = dx > 0;
        this._applyPunish(goingRight ? 1 : -1);
        this._gesture.resolved = true;
      } else if (verticalDominant) {
        this._applyReward();
        this._gesture.resolved = true;
      }
    };

    this._onPointerUp = () => {
      this._gesture.active = false;
      this._gesture.resolved = false;
      this._gesture.totalX = 0;
      this._gesture.totalY = 0;

      // resume previous movement after a short delay
      if (this._resumeTimer) {
        this._resumeTimer.remove();
      }
      this._resumeTimer = this.scene.time.addEvent({
        delay: 600,
        callback: () => {
          this.vx = this._movementSnapshot.vx;
          this.vy = this._movementSnapshot.vy;
          this.state = this._movementSnapshot.state;
          if (this.state === 'moving') {
            this._ensureWalking();
          } else {
            this._ensureIdle();
          }
          this._resumeTimer = null;
        },
      });
    };

    this.scene.input.on('pointerdown', this._onPointerDown);
    this.scene.input.on('pointermove', this._onPointerMove);
    this.scene.input.on('pointerup', this._onPointerUp);
    this.scene.input.on('pointerupoutside', this._onPointerUp);
  }

  _applyMoodAlignment(deltaMood, deltaAlignment) {
    if (!this.profile) return;
    if (this.profile.stats && this.profile.stats.vitals) {
      const currentMood = Number(this.profile.stats.vitals.mood ?? 0);
      this.profile.stats.vitals.mood = Phaser.Math.Clamp(
        currentMood + deltaMood,
        0,
        100
      );
    }
    if (typeof this.profile.alignment === 'number') {
      this.profile.alignment = Phaser.Math.Clamp(
        this.profile.alignment + deltaAlignment,
        -100,
        100
      );
    }
  }

  _applyPunish(direction = 0) {
    if (this.profile && this.profile.stats && this.profile.stats.vitals) {
      const currentMood = Number(this.profile.stats.vitals.mood ?? 0);
      if (currentMood <= 0) {
        if (typeof this.profile.neglectCount !== 'number') {
          this.profile.neglectCount = 0;
        }
        this.profile.neglectCount += 1;
        console.log(`Pet neglect count increased to ${this.profile.neglectCount}`);
      }
    }

    if (direction !== 0 && this.sprite) {
      this.sprite.setFlipX(direction > 0);
    }

    // Trigger punishment reaction
    if (this.reactionSystem) {
      this.reactionSystem.quickReaction('punish');
    } else {
      this._applyMoodAlignment(-10, -8);
      this.playWounded();
    }

    if (this.scene.sound) {
      const sfx = this.scene.sound.get('SlapSfx') || this.scene.sound.add('SlapSfx');
      if (sfx) sfx.play({ volume: 0.9 });
    }
    console.log('Pet punished: mood and alignment decreased');
  }

  _applyReward() {
    // Trigger reward reaction
    if (this.reactionSystem) {
      this.reactionSystem.quickReaction('reward');
    } else {
      this._applyMoodAlignment(10, 8);
      this.playAttack();
    }

    if (this.scene.sound) {
      const sfx = this.scene.sound.get('RubSfx') || this.scene.sound.add('RubSfx');
      if (sfx) sfx.play({ volume: 0.9 });
    }
    console.log('Pet rewarded: mood and alignment increased');
  }

  playAttack() {
    if (this.sprite && this.sprite.anims && typeof this.sprite.play === 'function') {
      this.sprite.play("pet_attack");
    } else {
      console.debug('[Pet] playAttack skipped - anims/play missing');
    }
  }

  playWounded() {
    if (this.sprite && this.sprite.anims && typeof this.sprite.play === 'function') {
      this.sprite.play("pet_wounded");
    } else {
      console.debug('[Pet] playWounded skipped - anims/play missing');
    }
  }

  destroy() {
    if (this._onPointerDown) this.scene.input.off('pointerdown', this._onPointerDown);
    if (this._onPointerMove) this.scene.input.off('pointermove', this._onPointerMove);
    if (this._onPointerUp) {
      this.scene.input.off('pointerup', this._onPointerUp);
      this.scene.input.off('pointerupoutside', this._onPointerUp);
    }

    this.sprite.destroy();
  }
}
