/**
 * PetReactionSystem Examples
 * Demonstrates how to use the pet reaction system for various game events
 */

import { PetReactionSystem } from './PetReactionSystem.js';

/**
 * Example: Initialize the reaction system in your scene
 */
export function initializePetReactions(scene, pet) {
  const reactionSystem = new PetReactionSystem(scene, pet);
  return reactionSystem;
}

/**
 * Example: Trigger reactions during quiz
 */
export async function handleQuizAnswer(reactionSystem, isCorrect) {
  if (isCorrect) {
    // Positive quiz reaction
    await reactionSystem.triggerReaction('quizWin');
  } else {
    // Negative quiz reaction
    await reactionSystem.triggerReaction('quizLose');
  }
}

/**
 * Example: Trigger reactions during battle
 */
export async function handleBattleResult(reactionSystem, isVictory) {
  if (isVictory) {
    await reactionSystem.triggerReaction('battleVictory');
  } else {
    await reactionSystem.triggerReaction('battleDefeat');
  }
}

/**
 * Example: Trigger reactions for gesture interactions
 */
export function handlePetGesture(reactionSystem, gestureType) {
  if (gestureType === 'reward') {
    // Vertical swipe - reward
    reactionSystem.quickReaction('reward');
  } else if (gestureType === 'punish') {
    // Horizontal swipe - punish
    reactionSystem.quickReaction('punish');
  }
}

/**
 * Example: Trigger idle reactions periodically
 */
export function triggerIdleChat(reactionSystem) {
  reactionSystem.quickReaction('idle', { animOnly: false });
}

/**
 * Example: Trigger care/play reactions
 */
export async function playWithPet(reactionSystem) {
  await reactionSystem.triggerReaction('play');
}

/**
 * Example: Trigger neglect reaction when pet mood is very low
 */
export function checkPetNeglect(reactionSystem, pet) {
  if (pet.profile?.stats?.vitals?.mood < 20) {
    reactionSystem.quickReaction('neglect');
  }
}

/**
 * Example: Trigger reaction chain for special events
 */
export async function celebrateGameMilestone(reactionSystem) {
  // Multiple reactions in sequence
  await reactionSystem.triggerReactionChain([
    'battleVictory',
    'play',
    'reward',
  ], 800); // 800ms between each
}

/**
 * Example: Custom reaction with override message
 */
export async function customReaction(reactionSystem, type, customMessage) {
  await reactionSystem.triggerReaction(type, {
    message: customMessage,
    duration: 2500,
  });
}

/**
 * Example: Usage in PlayScene
 * 
 * In your scene's create() method:
 * ```
 * import { PetReactionSystem } from '../systems/PetReactionSystem.js';
 * 
 * create() {
 *   // ... existing scene setup
 *   
 *   // Initialize pet reaction system
 *   this.petReactionSystem = new PetReactionSystem(this, this.pet);
 *   this.pet.reactionSystem = this.petReactionSystem;
 *   
 *   // Pass it to QuizSystem for automatic reactions
 *   this.quizSystem = new QuizSystem(this, this.pet, this.chalkboard, this.petReactionSystem);
 * }
 * 
 * // Then use it in event handlers
 * this.events.on('quiz:complete', () => {
 *   if (this.petReactionSystem) {
 *     const finalScore = this.quizSystem.score;
 *     const maxScore = this.quizSystem.questions.length;
 *     if (finalScore >= maxScore * 0.8) {
 *       this.petReactionSystem.triggerReaction('battleVictory');
 *     } else {
 *       this.petReactionSystem.triggerReaction('battleDefeat');
 *     }
 *   }
 * });
 * ```
 */

/**
 * Available Reaction Types:
 * 
 * GAME RESULTS:
 * - quizWin: Positive quiz answer (message, attack animation, mood +15, alignment +10)
 * - quizLose: Negative quiz answer (message, wounded animation, mood -10, alignment -5)
 * 
 * BATTLE RESULTS:
 * - battleVictory: Won a battle (message, attack + walk animations, mood +20, alignment +15)
 * - battleDefeat: Lost a battle (message, wounded animation, mood -15, alignment -10)
 * 
 * INTERACTIONS:
 * - reward: Positive gesture/petting (message, attack animation, mood +12, alignment +10)
 * - punish: Negative gesture/hitting (message, wounded animation, mood -12, alignment -10)
 * 
 * NEUTRAL:
 * - idle: Neutral/thinking (message, idle animation, no stat changes)
 * - play: Playing together (message, walk animation, mood +8, alignment +5)
 * - neglect: Pet feeling lonely (message, wounded animation, mood -8, alignment -5)
 * 
 * REACTION MESSAGES:
 * Each reaction type has multiple random messages that vary each time it's triggered.
 * Examples:
 *   quizWin: "You got it right!", "Amazing answer!", "Perfect!", etc.
 *   quizLose: "Oh no...", "Not quite...", "Hmm, nope!", etc.
 *   reward: "That feels nice!", "Hehe!", "I like that!", etc.
 *   punish: "Ouch!", "Why?!", "That hurt!", etc.
 *   idle: "*yawn*", "...", "Hmm?", etc.
 */
