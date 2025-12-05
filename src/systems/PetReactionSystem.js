/**
 * PetReactionSystem - Manages pet reactions and chat bubbles for various game events.
 * Reactions include animations and contextual messages for:
 * - Game results (positive/negative)
 * - Battle results (victory/defeat)
 * - Reward/Punishment gestures
 * - Idle/neutral states
 */
export class PetReactionSystem {
  constructor(scene, pet) {
    this.scene = scene;
    this.pet = pet;

    this.activeChat = null;
    this.chatDuration = 3000; // 3 seconds default
    this.reactions = this._defineReactions();
  }

  _defineReactions() {
    return {
      // Game Results
      quizWin: {
        type: 'positive',
        messages: [
          "You got it right!",
          "Amazing answer!",
          "Perfect!",
          "Brilliant!",
          "Excellent work!",
        ],
        animations: ['pet_attack', 'pet_idle'],
        moodDelta: 15,
        alignmentDelta: 10,
      },
      quizLose: {
        type: 'negative',
        messages: [
          "Oh no...",
          "Not quite...",
          "Hmm, nope!",
          "That wasn't it...",
          "Try again!",
        ],
        animations: ['pet_wounded', 'pet_idle'],
        moodDelta: -10,
        alignmentDelta: -5,
      },

      // Battle Results
      battleVictory: {
        type: 'positive',
        messages: [
          "We won!",
          "Victory!",
          "That was awesome!",
          "We crushed it!",
          "Go team!",
        ],
        animations: ['pet_attack', 'pet_walk'],
        moodDelta: 20,
        alignmentDelta: 15,
      },
      battleDefeat: {
        type: 'negative',
        messages: [
          "We lost...",
          "Better luck next time...",
          "That was tough...",
          "We'll get them next time!",
          "Oof...",
        ],
        animations: ['pet_wounded', 'pet_idle'],
        moodDelta: -15,
        alignmentDelta: -10,
      },

      // Reward Gesture (vertical swipe)
      reward: {
        type: 'positive',
        messages: [
          "That feels nice!",
          "Hehe!",
          "I like that!",
          "More please!",
          "Ahhh, so good!",
          "You're the best!",
        ],
        animations: ['pet_attack'],
        moodDelta: 12,
        alignmentDelta: 10,
      },

      // Punishment Gesture (horizontal swipe)
      punish: {
        type: 'negative',
        messages: [
          "Ouch!",
          "Why?!",
          "That hurt!",
          "Hey, be nice!",
          "Oof!",
          "Stop that!",
        ],
        animations: ['pet_wounded'],
        moodDelta: -12,
        alignmentDelta: -10,
      },

      // Idle Neutral
      idle: {
        type: 'neutral',
        messages: [
          "*yawn*",
          "...",
          "Hmm?",
          "*blink*",
          "What's up?",
        ],
        animations: ['pet_idle'],
        moodDelta: 0,
        alignmentDelta: 0,
      },

      // Care/Play interactions
      play: {
        type: 'positive',
        messages: [
          "Wheee!",
          "This is fun!",
          "Let's play!",
          "Yay!",
          "I'm having a blast!",
        ],
        animations: ['pet_walk'],
        moodDelta: 8,
        alignmentDelta: 5,
      },

      // Neglect
      neglect: {
        type: 'negative',
        messages: [
          "...I'm sad.",
          "I'm lonely...",
          "Anyone there?",
          "Why did you leave?",
          "I miss you...",
        ],
        animations: ['pet_wounded'],
        moodDelta: -8,
        alignmentDelta: -5,
      },
    };
  }

  /**
   * Trigger a reaction for the pet
   * @param {string} reactionType - Key from reactions object
   * @param {object} opts - Optional overrides { message, duration, animOnly, animationDelay }
   */
  async triggerReaction(reactionType, opts = {}) {
    const reaction = this.reactions[reactionType];

    if (!reaction) {
      console.warn(`Unknown reaction type: ${reactionType}`);
      return;
    }

    // Get message
    const message =
      opts.message ||
      reaction.messages[Math.floor(Math.random() * reaction.messages.length)];

    // Show chat bubble immediately (unless animOnly is true)
    if (!opts.animOnly) {
      this._showChatBubble(message, opts.duration || this.chatDuration);
    }

    // Play animations in parallel with chat bubble
    this._playAnimationSequence(reaction.animations);

    // Hold for animation delay (let animation display for specified time)
    if (opts.animationDelay) {
      await new Promise(resolve => 
        this.scene.time.delayedCall(opts.animationDelay, resolve)
      );
    }

    // Apply mood/alignment changes
    if (this.pet.profile) {
      if (reaction.moodDelta !== 0) {
        const currentMood = Number(this.pet.profile.stats?.vitals?.mood ?? 0);
        if (this.pet.profile.stats && this.pet.profile.stats.vitals) {
          this.pet.profile.stats.vitals.mood = Phaser.Math.Clamp(
            currentMood + reaction.moodDelta,
            0,
            100
          );
        }
      }

      if (reaction.alignmentDelta !== 0 && typeof this.pet.profile.alignment === 'number') {
        this.pet.profile.alignment = Phaser.Math.Clamp(
          this.pet.profile.alignment + reaction.alignmentDelta,
          -100,
          100
        );
      }
    }
  }

  /**
   * Play a sequence of animations with smooth transitions
   */
  async _playAnimationSequence(animations) {
    if (!animations || animations.length === 0) return;

    for (const anim of animations) {
      await this._playAnimation(anim);
    }
  }

  /**
   * Play a single animation and wait for completion
   */
  _playAnimation(animKey) {
    return new Promise((resolve) => {
      if (!this.pet.sprite || !this.pet.sprite.anims) {
        resolve();
        return;
      }

      this.pet.sprite.play(animKey);

      // Wait for animation to complete, then hold last frame for 2 seconds
      this.pet.sprite.once('animationcomplete', () => {
        // Hold the last frame for 2 seconds before resolving
        this.scene.time.delayedCall(2000, resolve);
      });

      // Fallback timeout in case animation doesn't complete
      setTimeout(resolve, 3500);
    });
  }

  /**
   * Display a chat bubble above the pet
   */
  _showChatBubble(message, duration = this.chatDuration) {
    // Remove existing chat if present
    if (this.activeChat) {
      this.activeChat.destroy();
      this.activeChat = null;
    }

    const petX = this.pet.sprite.x;
    const petY = this.pet.sprite.y - (this.pet.sprite.displayHeight / 2) - 40;

    // Create chat bubble container
    const bubbleGroup = this.scene.add.container(petX, petY);
    bubbleGroup.setDepth(101); // Above other UI

    // Bubble background
    const padding = 12;
    const textWidth = message.length * 6; // Rough estimate
    const bubbleWidth = Math.min(Math.max(textWidth + padding * 2, 80), 200);
    const bubbleHeight = 50;

    // Chat bubble shape with rounded corners and tail
    const graphics = this.scene.make.graphics(
      { x: 0, y: 0, add: false },
      false
    );
    graphics.fillStyle(0xffffff, 0.95);
    graphics.lineStyle(2, 0x333333, 1);

    // Draw rounded rectangle
    graphics.fillRoundedRect(
      -bubbleWidth / 2,
      -bubbleHeight / 2,
      bubbleWidth,
      bubbleHeight,
      8
    );
    graphics.strokeRoundedRect(
      -bubbleWidth / 2,
      -bubbleHeight / 2,
      bubbleWidth,
      bubbleHeight,
      8
    );

    // Draw tail pointing to pet
    graphics.fillStyle(0xffffff, 0.95);
    graphics.fillTriangleShape(
      new Phaser.Geom.Triangle(
        -8,
        bubbleHeight / 2 - 2,
        8,
        bubbleHeight / 2 - 2,
        0,
        bubbleHeight / 2 + 12
      )
    );
    graphics.strokeTriangleShape(
      new Phaser.Geom.Triangle(
        -8,
        bubbleHeight / 2 - 2,
        8,
        bubbleHeight / 2 - 2,
        0,
        bubbleHeight / 2 + 12
      )
    );

    bubbleGroup.add(graphics);

    // Chat text
    const chatText = this.scene.add.text(0, 0, message, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#333333',
      align: 'center',
      wordWrap: { width: bubbleWidth - padding * 2 },
    });
    chatText.setOrigin(0.5);
    bubbleGroup.add(chatText);

    this.activeChat = bubbleGroup;

    // Fade out and remove after duration
    this.scene.tweens.add({
      targets: bubbleGroup,
      alpha: 0,
      duration: 500,
      delay: duration - 500,
      ease: 'Quad.easeIn',
      onComplete: () => {
        bubbleGroup.destroy();
        if (this.activeChat === bubbleGroup) {
          this.activeChat = null;
        }
      },
    });
  }

  /**
   * Quick reaction without waiting for animations
   */
  quickReaction(reactionType, opts = {}) {
    const reaction = this.reactions[reactionType];
    if (!reaction) return;

    const message =
      opts.message ||
      reaction.messages[Math.floor(Math.random() * reaction.messages.length)];

    this._showChatBubble(message, opts.duration || this.chatDuration);

    if (reaction.animations && reaction.animations.length > 0) {
      const anim = reaction.animations[0];
      if (this.pet.sprite && this.pet.sprite.anims) {
        this.pet.sprite.play(anim);
      }
    }
  }

  /**
   * Trigger multiple reactions in sequence
   */
  async triggerReactionChain(reactionTypes, delayBetween = 500) {
    for (let i = 0; i < reactionTypes.length; i++) {
      if (i > 0) {
        await new Promise((resolve) =>
          this.scene.time.delayedCall(delayBetween, resolve)
        );
      }
      await this.triggerReaction(reactionTypes[i]);
    }
  }

  /**
   * Update chat bubble position to follow pet
   * Call this from scene's update loop
   */
  update() {
    if (this.activeChat && this.pet && this.pet.sprite) {
      const petX = this.pet.sprite.x;
      const petY = this.pet.sprite.y - (this.pet.sprite.displayHeight / 2) - 40;
      this.activeChat.x = petX;
      this.activeChat.y = petY;
    }
  }

  destroy() {
    if (this.activeChat) {
      this.activeChat.destroy();
      this.activeChat = null;
    }
  }
}
