/**
 * QUIZ SYSTEM USAGE GUIDE
 * 
 * This file shows how to use and extend the quiz system.
 * It's a reference guide, not imported by the game.
 */

// ============================================
// BASIC USAGE (Already implemented in PlayScene)
// ============================================

/*
import { Chalkboard } from "../entities/Chalkboard.js";
import { QuizSystem } from "../systems/QuizSystem.js";

// In your scene's create():
this.chalkboard = new Chalkboard(this, {
  width: 500,
  height: 500,
  y: this.cameras.main.centerY,
  slideInDuration: 400,
  slideOutDuration: 300,
});

this.quizSystem = new QuizSystem(this, this.pet, this.chalkboard);

// Start quiz:
this.quizSystem.startQuiz();
*/

// ============================================
// CUSTOMIZATION EXAMPLES
// ============================================

/**
 * Example: Creating a custom question set
 */
export const CUSTOM_QUESTIONS = [
  {
    question: "What does 'HTTP' stand for?",
    answers: [
      { text: "HyperText Transfer Protocol", isCorrect: true },
      { text: "High Tech Transfer Process", isCorrect: false },
      { text: "Home Terminal Transfer Protocol", isCorrect: false },
      { text: "Hyperlink Test Transfer Protocol", isCorrect: false },
    ],
  },
  {
    question: "Which data structure uses LIFO?",
    answers: [
      { text: "Queue", isCorrect: false },
      { text: "Stack", isCorrect: true },
      { text: "Tree", isCorrect: false },
      { text: "Graph", isCorrect: false },
    ],
  },
  // ... add more questions
];

/**
 * Example: Extended QuizSystem with custom questions
 */
export class CustomQuizSystem {
  constructor(scene, pet, chalkboard, customQuestions = []) {
    this.scene = scene;
    this.pet = pet;
    this.chalkboard = chalkboard;
    this.customQuestions = customQuestions;
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.isActive = false;
  }

  // Override question generation
  _generateQuestions() {
    return this.customQuestions.length > 0
      ? this.customQuestions
      : this._defaultQuestions();
  }

  _defaultQuestions() {
    // Fallback to default questions
    return [
      /* default questions */
    ];
  }

  // ... rest of QuizSystem methods
}

/**
 * Example: Theme customization
 */
export const CHALKBOARD_THEMES = {
  DEFAULT: {
    bgColor: 0x2a1810,
    borderColor: 0xd4a574,
    textColor: "#fff",
    correctColor: 0x4ade80,
    incorrectColor: 0xf87171,
    buttonColor: 0x4a4a4a,
    buttonHoverColor: 0x5a5a5a,
  },

  MODERN: {
    bgColor: 0x1e293b,
    borderColor: 0x64748b,
    textColor: "#e2e8f0",
    correctColor: 0x10b981,
    incorrectColor: 0xef4444,
    buttonColor: 0x334155,
    buttonHoverColor: 0x475569,
  },

  NEON: {
    bgColor: 0x0a0e27,
    borderColor: 0x00ff88,
    textColor: "#00ff88",
    correctColor: 0x00ff88,
    incorrectColor: 0xff0055,
    buttonColor: 0x1a0033,
    buttonHoverColor: 0x330066,
  },

  RETRO: {
    bgColor: 0x2d4a2b,
    borderColor: 0x9bbc0f,
    textColor: "#9bbc0f",
    correctColor: 0x8bce00,
    incorrectColor: 0xff6b35,
    buttonColor: 0x1f3a1d,
    buttonHoverColor: 0x2d5a2b,
  },
};

/**
 * Example: Quiz with difficulty levels
 */
export class DifficultyQuizSystem {
  constructor(scene, pet, chalkboard, difficulty = "normal") {
    this.scene = scene;
    this.pet = pet;
    this.chalkboard = chalkboard;
    this.difficulty = difficulty; // "easy", "normal", "hard"
    this.questionsPerQuiz = difficulty === "easy" ? 5 : difficulty === "hard" ? 15 : 10;
  }

  _getQuestionsByDifficulty() {
    const easyQuestions = [
      {
        question: "What color is the sky?",
        answers: [
          { text: "Blue", isCorrect: true },
          { text: "Red", isCorrect: false },
          { text: "Green", isCorrect: false },
          { text: "Yellow", isCorrect: false },
        ],
      },
      // ... more easy questions
    ];

    const hardQuestions = [
      {
        question: "What is the Heisenberg Uncertainty Principle?",
        answers: [
          { text: "Position and momentum cannot both be known precisely", isCorrect: true },
          { text: "Energy is uncertain", isCorrect: false },
          { text: "Time is relative", isCorrect: false },
          { text: "Particles don't exist", isCorrect: false },
        ],
      },
      // ... more hard questions
    ];

    if (this.difficulty === "easy") return easyQuestions;
    if (this.difficulty === "hard") return hardQuestions;
    return this._defaultQuestions();
  }
}

/**
 * Example: Quiz with rewards system
 */
export class RewardedQuizSystem {
  constructor(scene, pet, chalkboard) {
    this.scene = scene;
    this.pet = pet;
    this.chalkboard = chalkboard;
    this.scoreThresholds = {
      10: { reward: "Excellent!", mood: 20, xp: 100 },
      8: { reward: "Great Job!", mood: 15, xp: 75 },
      6: { reward: "Good Effort", mood: 10, xp: 50 },
      0: { reward: "Keep Trying", mood: 0, xp: 25 },
    };
  }

  async endQuiz() {
    // Get threshold reward
    const reward = this._getRewardForScore(this.score);

    // Apply mood and XP changes
    if (this.pet && this.pet.profile) {
      this.pet.profile.stats.vitals.mood = Math.min(
        100,
        this.pet.profile.stats.vitals.mood + reward.mood
      );
      // Add XP to profile if it exists
      if (!this.pet.profile.xp) {
        this.pet.profile.xp = 0;
      }
      this.pet.profile.xp += reward.xp;
    }

    // Show reward message
    console.log(`${reward.reward} +${reward.xp} XP`);
  }

  _getRewardForScore(score) {
    for (const [threshold, reward] of Object.entries(this.scoreThresholds)) {
      if (score >= threshold) return reward;
    }
    return this.scoreThresholds[0];
  }
}

/**
 * Example: Progressive quiz (questions get harder)
 */
export class ProgressiveQuizSystem {
  constructor(scene, pet, chalkboard) {
    this.scene = scene;
    this.pet = pet;
    this.chalkboard = chalkboard;
    this.currentStreak = 0;
    this.difficultyMultiplier = 1;
  }

  _getNextQuestion() {
    // Adjust difficulty based on streak
    if (this.currentStreak >= 5) {
      this.difficultyMultiplier = 2; // Hard questions
    } else if (this.currentStreak >= 3) {
      this.difficultyMultiplier = 1.5; // Medium questions
    } else {
      this.difficultyMultiplier = 1; // Easy questions
    }

    // Return appropriately difficult question
    return this._selectQuestionByDifficulty(this.difficultyMultiplier);
  }

  _onCorrectAnswer() {
    this.currentStreak += 1;
    console.log(`Streak: ${this.currentStreak}`);
  }

  _onWrongAnswer() {
    this.currentStreak = 0;
    console.log("Streak reset!");
  }
}

/**
 * Example: Multiplayer quiz (for future implementation)
 */
export class MultiplayerQuizSystem {
  constructor(scene, pet, chalkboard, opponent = null) {
    this.scene = scene;
    this.pet = pet;
    this.chalkboard = chalkboard;
    this.opponent = opponent;
    this.playerScore = 0;
    this.opponentScore = 0;
  }

  async runCompetitiveQuiz() {
    // Show both scores
    // Take turns answering
    // First to 5 correct wins
    // Display winner
  }
}

/**
 * Example: Quick quiz (3 questions instead of 10)
 */
export async function startQuickQuiz(scene, pet) {
  const chalkboard = new Chalkboard(scene, {
    width: 500,
    height: 500,
  });

  const quickQuizSystem = new QuickQuizSystem(scene, pet, chalkboard);
  await quickQuizSystem.startQuiz();
}

class QuickQuizSystem {
  constructor(scene, pet, chalkboard) {
    this.scene = scene;
    this.pet = pet;
    this.chalkboard = chalkboard;
  }

  _generateQuestions() {
    // Return only 3 random questions instead of 10
    const allQuestions = [
      /* all questions */
    ];
    return allQuestions.slice(0, 3);
  }
}

/**
 * Example: Daily quiz challenge
 */
export class DailyQuizChallenge {
  static getDailyQuestions() {
    // Return a consistent set of questions based on the day
    const day = new Date().toDateString();
    const seed = this._hashString(day);
    return this._generateSeededQuestions(seed);
  }

  static _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  static _generateSeededQuestions(seed) {
    // Use seed to generate deterministic questions
    // Same seed = same questions
    return [];
  }
}

// ============================================
// INTEGRATION EXAMPLES
// ============================================

/**
 * Example: Add quiz to HomeScene
 */
export function addQuizToHomeScene() {
  /*
  const homeSceneCode = `
    _startQuiz() {
      if (!this.chalkboard) {
        this.chalkboard = new Chalkboard(this);
      }
      if (!this.quizSystem) {
        this.quizSystem = new QuizSystem(this, this.pet, this.chalkboard);
      }
      this.quizSystem.startQuiz();
    }
  `;
  */
}

/**
 * Example: Track quiz statistics
 */
export class QuizStatistics {
  constructor() {
    this.totalQuizzes = 0;
    this.totalQuestions = 0;
    this.totalCorrect = 0;
    this.bestScore = 0;
    this.quizHistory = [];
  }

  recordQuiz(score, totalQuestions) {
    this.totalQuizzes += 1;
    this.totalQuestions += totalQuestions;
    this.totalCorrect += score;
    this.bestScore = Math.max(this.bestScore, score);

    this.quizHistory.push({
      date: new Date(),
      score,
      totalQuestions,
      percentage: Math.round((score / totalQuestions) * 100),
    });
  }

  getAverageScore() {
    return this.totalQuizzes > 0 ? this.totalCorrect / this.totalQuizzes : 0;
  }

  getAccuracy() {
    return this.totalQuestions > 0
      ? Math.round((this.totalCorrect / this.totalQuestions) * 100)
      : 0;
  }
}
