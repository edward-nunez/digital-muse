/**
 * QuizSystem - Manages quiz logic, questions, scoring, and pet behavior during quiz.
 * Handles 10 questions with feedback and final results.
 */
import { PetReactionSystem } from "./PetReactionSystem.js";

export class QuizSystem {
  constructor(scene, pet, chalkboard, reactionSystem = null) {
    this.scene = scene;
    this.pet = pet;
    this.chalkboard = chalkboard;
    this.reactionSystem = reactionSystem || new PetReactionSystem(scene, pet);

    this.currentQuestionIndex = 0;
    this.score = 0;
    this.isActive = false;
    this.isPaused = false;

    const allQuestions = this._generateQuestions();
    this.questions = this._selectRandomQuestions(allQuestions, 10);
    this._setupEventListeners();
  }

  _setupEventListeners() {
    this.scene.events.on("quiz:answerSelected", (data) => {
      if (this.isPaused) return;
      this._handleAnswerSelection(data);
    });

    // Hook into the scene update to freeze pet during quiz
    this.originalUpdate = this.pet.update.bind(this.pet);
    this.pet.update = (time, delta) => {
      // If quiz is active and pet is locked, don't update pet movement
      if (this.isActive && this.petLocked) {
        // Keep velocity at zero to prevent any movement
        this.pet.vx = 0;
        this.pet.vy = 0;
        // Return early to skip normal update logic
        return;
      }
      // Otherwise, use original update
      this.originalUpdate(time, delta);
    };
  }

  async startQuiz() {
    if (this.isActive) return;

    this.isActive = true;
    this.score = 0;
    this.currentQuestionIndex = 0;
    this.petLocked = false;

    // Move pet to the right side and keep it idle
    await this._movePetToRightSide();

    // Slide in the chalkboard
    await this.chalkboard.slideIn();

    // Run through questions
    await this._runQuestions();

    // Show results
    await this.chalkboard.showResults(this.score, this.questions.length);

    // Clean up
    await this.endQuiz();
  }

  async _movePetToRightSide() {
    if (!this.pet || !this.pet.sprite) return;

    // Save original state for restoration
    this.petOriginalVx = this.pet.vx;
    this.petOriginalVy = this.pet.vy;
    this.petOriginalState = this.pet.state;

    // Stop pet movement and move to right side
    this.pet.vx = 0;
    this.pet.vy = 0;
    this.pet.state = "idle";

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.pet.sprite,
        x: this.scene.cameras.main.width - 140,
        y: 480,
        duration: 500,
        ease: "Quad.easeInOut",
        onComplete: () => {
          // Lock pet in idle state - prevent any movement
          this.pet.vx = 0;
          this.pet.vy = 0;
          this.pet.state = "idle";
          // Reset flip to normal (facing left)
          this.pet.sprite.setFlipX(false);
          this.pet._ensureIdle();
          this.petLocked = true;
          resolve();
        },
      });
    });
  }

  _selectRandomQuestions(questions, count) {
    // Fisher-Yates shuffle algorithm
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  async _runQuestions() {
    for (let i = 0; i < this.questions.length; i++) {
      this.currentQuestionIndex = i;

      // Display current question
      this.chalkboard.displayQuestion(
        this.questions[i],
        i + 1,
        this.questions.length
      );

      // Wait for answer
      await this._waitForAnswer();

      if (!this.isActive) break;

      // Brief delay before next question
      await new Promise((resolve) => {
        this.scene.time.delayedCall(500, resolve);
      });
    }
  }

  _waitForAnswer() {
    this.isPaused = false;

    return new Promise((resolve) => {
      const onAnswerSelected = async (data) => {
        this.isPaused = true;

        const { answer, bgElement } = data;
        const isCorrect = answer.isCorrect;

        // Show feedback
        await this.chalkboard.showFeedback(isCorrect, { bgElement });

        // Update score
        if (isCorrect) {
          this.score += 1;
          this.chalkboard.updateScore(this.score);
        }

        // Trigger reaction in parallel (don't await)
        if (this.reactionSystem) {
          const reactionType = isCorrect ? "quizWin" : "quizLose";
          this.reactionSystem.triggerReaction(reactionType, {
            duration: 2000,
            animationDelay: 1000,
          });
        }

        // Unsubscribe from this answer
        this.scene.events.off("quiz:answerSelected", onAnswerSelected);

        resolve();
      };

      this.scene.events.once("quiz:answerSelected", onAnswerSelected);
    });
  }

  async _handleAnswerSelection(data) {
    // Handled in _waitForAnswer
  }

  async endQuiz() {
    this.isActive = false;
    this.petLocked = false;

    // Slide out chalkboard
    await this.chalkboard.slideOut();

    // Restore pet's original update method
    if (this.pet && this.originalUpdate) {
      this.pet.update = this.originalUpdate;
    }

    // Return pet to original behavior - restore movement
    if (this.pet) {
      this.pet._initMovement();
    }
  }

  _generateQuestions() {
    // 10 sample trivia questions (can be expanded or randomized)
    return [
      {
        question:
          "What is the primary difference between serif and sans-serif fonts?",
        answers: [
          {
            text: "Serif fonts have decorative strokes, sans-serif do not",
            isCorrect: true,
          },
          {
            text: "Serif fonts are italic, sans-serif are bold",
            isCorrect: false,
          },
          {
            text: "Serif fonts are monospaced, sans-serif are proportional",
            isCorrect: false,
          },
          {
            text: "Serif fonts are vector, sans-serif are raster",
            isCorrect: false,
          },
        ],
      },
      {
        question: "In typography, what does 'kerning' refer to?",
        answers: [
          { text: "Adjusting space between pairs of letters", isCorrect: true },
          { text: "Line spacing between text rows", isCorrect: false },
          { text: "Font size measurement", isCorrect: false },
          { text: "Color contrast in text", isCorrect: false },
        ],
      },
      {
        question:
          "Which font format is commonly used for web typography due to its scalability?",
        answers: [
          { text: "WOFF", isCorrect: true },
          { text: "Bitmap", isCorrect: false },
          { text: "PostScript", isCorrect: false },
          { text: "Raster", isCorrect: false },
        ],
      },
      {
        question: "What is 'leading' in font design?",
        answers: [
          { text: "Vertical space between lines of text", isCorrect: true },
          { text: "Horizontal space between characters", isCorrect: false },
          { text: "Font weight variation", isCorrect: false },
          { text: "Italic slant angle", isCorrect: false },
        ],
      },
      {
        question: "Which term describes the thickness of font strokes?",
        answers: [
          { text: "Weight", isCorrect: true },
          { text: "Ascender", isCorrect: false },
          { text: "Baseline", isCorrect: false },
          { text: "Cap height", isCorrect: false },
        ],
      },
      {
        question: "In interactive multimedia, why are variable fonts useful?",
        answers: [
          {
            text: "They allow dynamic adjustments in weight and width",
            isCorrect: true,
          },
          { text: "They are fixed-size only", isCorrect: false },
          { text: "They support raster images", isCorrect: false },
          { text: "They are audio-compatible", isCorrect: false },
        ],
      },
      {
        question: "What is x-height in typography?",
        answers: [
          { text: "Height of lowercase letters like 'x'", isCorrect: true },
          { text: "Total font size", isCorrect: false },
          { text: "Space above baseline", isCorrect: false },
          { text: "Descender length", isCorrect: false },
        ],
      },
      {
        question: "Which font type is best for readability on screens?",
        answers: [
          { text: "Sans-serif", isCorrect: true },
          { text: "Serif", isCorrect: false },
          { text: "Script", isCorrect: false },
          { text: "Display", isCorrect: false },
        ],
      },
      {
        question: "What does AAC stand for in audio formats?",
        answers: [
          { text: "Advanced Audio Coding", isCorrect: true },
          { text: "Audio Analog Conversion", isCorrect: false },
          { text: "Adaptive Audio Compression", isCorrect: false },
          { text: "Acoustic Audio Channel", isCorrect: false },
        ],
      },
      {
        question: "What is the sampling rate in digital audio?",
        answers: [
          { text: "Number of samples per second", isCorrect: true },
          { text: "Bit depth per channel", isCorrect: false },
          { text: "Frequency range", isCorrect: false },
          { text: "Compression ratio", isCorrect: false },
        ],
      },
      {
        question: "Which audio format is lossless?",
        answers: [
          { text: "FLAC", isCorrect: true },
          { text: "MP3", isCorrect: false },
          { text: "OGG", isCorrect: false },
          { text: "AAC", isCorrect: false },
        ],
      },
      {
        question: "In multimedia, what is MIDI used for?",
        answers: [
          {
            text: "Musical Instrument Digital Interface for synthesized sound",
            isCorrect: true,
          },
          { text: "High-fidelity audio recording", isCorrect: false },
          { text: "Voice compression", isCorrect: false },
          { text: "Streaming video audio", isCorrect: false },
        ],
      },
      {
        question: "What does bit depth affect in audio?",
        answers: [
          { text: "Dynamic range and noise floor", isCorrect: true },
          { text: "Frequency response", isCorrect: false },
          { text: "File size only", isCorrect: false },
          { text: "Stereo channels", isCorrect: false },
        ],
      },
      {
        question: "Which is a common audio codec for web streaming?",
        answers: [
          { text: "Opus", isCorrect: true },
          { text: "WAV", isCorrect: false },
          { text: "AIFF", isCorrect: false },
          { text: "PCM", isCorrect: false },
        ],
      },
      {
        question: "What is audio normalization?",
        answers: [
          { text: "Adjusting volume to a standard level", isCorrect: true },
          { text: "Converting to mono", isCorrect: false },
          { text: "Adding reverb", isCorrect: false },
          { text: "Pitch shifting", isCorrect: false },
        ],
      },
      {
        question: "In interactive media, what is spatial audio?",
        answers: [
          { text: "3D sound positioning", isCorrect: true },
          { text: "Mono playback", isCorrect: false },
          { text: "High bitrate", isCorrect: false },
          { text: "Lossy compression", isCorrect: false },
        ],
      },
      {
        question: "What is text encoding in multimedia?",
        answers: [
          { text: "Method to represent characters digitally", isCorrect: true },
          { text: "Font styling", isCorrect: false },
          { text: "Audio transcription", isCorrect: false },
          { text: "Image captioning", isCorrect: false },
        ],
      },
      {
        question: "Which standard ensures text accessibility in multimedia?",
        answers: [
          { text: "WCAG", isCorrect: true },
          { text: "HTML5", isCorrect: false },
          { text: "CSS3", isCorrect: false },
          { text: "JSON", isCorrect: false },
        ],
      },
      {
        question: "What is hypertext in interactive multimedia?",
        answers: [
          { text: "Linked text for navigation", isCorrect: true },
          { text: "Bold text", isCorrect: false },
          { text: "Scrolling text", isCorrect: false },
          { text: "Encrypted text", isCorrect: false },
        ],
      },
      {
        question: "In text layout, what is justification?",
        answers: [
          { text: "Aligning text to both margins", isCorrect: true },
          { text: "Centering text", isCorrect: false },
          { text: "Left alignment only", isCorrect: false },
          { text: "Italicizing text", isCorrect: false },
        ],
      },
      {
        question: "What does OCR stand for in text processing?",
        answers: [
          { text: "Optical Character Recognition", isCorrect: true },
          { text: "Online Content Rendering", isCorrect: false },
          { text: "Object Code Reading", isCorrect: false },
          { text: "Output Character Resolution", isCorrect: false },
        ],
      },
      {
        question: "In multimedia, what is subtitle synchronization?",
        answers: [
          { text: "Timing text with video/audio", isCorrect: true },
          { text: "Font color change", isCorrect: false },
          { text: "Text animation", isCorrect: false },
          { text: "Hyperlink embedding", isCorrect: false },
        ],
      },
      {
        question: "What is ligature in text design?",
        answers: [
          { text: "Combined glyphs for better aesthetics", isCorrect: true },
          { text: "Space between words", isCorrect: false },
          { text: "Bullet points", isCorrect: false },
          { text: "Number formatting", isCorrect: false },
        ],
      },
      {
        question: "Which text format supports rich styling?",
        answers: [
          { text: "RTF", isCorrect: true },
          { text: "TXT", isCorrect: false },
          { text: "CSV", isCorrect: false },
          { text: "XML", isCorrect: false },
        ],
      },
      {
        question: "What distinguishes raster from vector images?",
        answers: [
          {
            text: "Raster are pixel-based, vector are path-based",
            isCorrect: true,
          },
          {
            text: "Raster scale without loss, vector do not",
            isCorrect: false,
          },
          { text: "Raster for animations, vector for audio", isCorrect: false },
          { text: "Raster are compressed, vector are not", isCorrect: false },
        ],
      },
      {
        question: "Which image format supports transparency?",
        answers: [
          { text: "PNG", isCorrect: true },
          { text: "JPEG", isCorrect: false },
          { text: "BMP", isCorrect: false },
          { text: "TIFF", isCorrect: false },
        ],
      },
      {
        question: "What is DPI in images?",
        answers: [
          { text: "Dots Per Inch for print resolution", isCorrect: true },
          { text: "Digital Pixel Intensity", isCorrect: false },
          { text: "Data Processing Image", isCorrect: false },
          { text: "Dynamic Palette Index", isCorrect: false },
        ],
      },
      {
        question: "In multimedia, what is image compression?",
        answers: [
          {
            text: "Reducing file size while maintaining quality",
            isCorrect: true,
          },
          { text: "Increasing resolution", isCorrect: false },
          { text: "Adding filters", isCorrect: false },
          { text: "Converting to vector", isCorrect: false },
        ],
      },
      {
        question: "What color mode is used for web images?",
        answers: [
          { text: "RGB", isCorrect: true },
          { text: "CMYK", isCorrect: false },
          { text: "Grayscale", isCorrect: false },
          { text: "Indexed", isCorrect: false },
        ],
      },
      {
        question: "Which format is best for animated images?",
        answers: [
          { text: "GIF", isCorrect: true },
          { text: "SVG", isCorrect: false },
          { text: "PSD", isCorrect: false },
          { text: "RAW", isCorrect: false },
        ],
      },
      {
        question: "What is anti-aliasing in images?",
        answers: [
          { text: "Smoothing jagged edges", isCorrect: true },
          { text: "Sharpening details", isCorrect: false },
          { text: "Color correction", isCorrect: false },
          { text: "Layer merging", isCorrect: false },
        ],
      },
      {
        question: "In interactive media, what is sprite?",
        answers: [
          { text: "2D image used in animations/games", isCorrect: true },
          { text: "3D model", isCorrect: false },
          { text: "Audio clip", isCorrect: false },
          { text: "Text overlay", isCorrect: false },
        ],
      },
      {
        question: "What is a common video container format?",
        answers: [
          { text: "MP4", isCorrect: true },
          { text: "H.264", isCorrect: false },
          { text: "VP9", isCorrect: false },
          { text: "AV1", isCorrect: false },
        ],
      },
      {
        question: "What does frame rate measure in video?",
        answers: [
          { text: "Frames per second", isCorrect: true },
          { text: "Resolution pixels", isCorrect: false },
          { text: "Bitrate", isCorrect: false },
          { text: "Aspect ratio", isCorrect: false },
        ],
      },
      {
        question: "Which codec is efficient for streaming?",
        answers: [
          { text: "H.265", isCorrect: true },
          { text: "MPEG-2", isCorrect: false },
          { text: "DV", isCorrect: false },
          { text: "ProRes", isCorrect: false },
        ],
      },
      {
        question: "What is keyframe in video compression?",
        answers: [
          { text: "Complete frame used as reference", isCorrect: true },
          { text: "Audio sync point", isCorrect: false },
          { text: "Transition effect", isCorrect: false },
          { text: "Subtitle layer", isCorrect: false },
        ],
      },
      {
        question: "In multimedia, what is 4K resolution?",
        answers: [
          { text: "3840x2160 pixels", isCorrect: true },
          { text: "1920x1080 pixels", isCorrect: false },
          { text: "1280x720 pixels", isCorrect: false },
          { text: "720x480 pixels", isCorrect: false },
        ],
      },
      {
        question: "What is aspect ratio in video?",
        answers: [
          { text: "Width to height proportion", isCorrect: true },
          { text: "Frame rate", isCorrect: false },
          { text: "Color depth", isCorrect: false },
          { text: "Compression level", isCorrect: false },
        ],
      },
      {
        question: "Which is used for interactive video?",
        answers: [
          { text: "HTML5 video with JavaScript", isCorrect: true },
          { text: "Static MPEG", isCorrect: false },
          { text: "Analog tape", isCorrect: false },
          { text: "DVD format", isCorrect: false },
        ],
      },
      {
        question: "What is bitrate in video?",
        answers: [
          { text: "Data rate per second", isCorrect: true },
          { text: "Frame count", isCorrect: false },
          { text: "Resolution", isCorrect: false },
          { text: "Duration", isCorrect: false },
        ],
      },
      {
        question: "What is tweening in animation?",
        answers: [
          { text: "Generating intermediate frames", isCorrect: true },
          { text: "Drawing every frame manually", isCorrect: false },
          { text: "Adding sound", isCorrect: false },
          { text: "Coloring shapes", isCorrect: false },
        ],
      },
      {
        question: "Which principle of animation is 'squash and stretch'?",
        answers: [
          { text: "Giving illusion of weight and volume", isCorrect: true },
          { text: "Timing actions", isCorrect: false },
          { text: "Overlapping movements", isCorrect: false },
          { text: "Path curvature", isCorrect: false },
        ],
      },
      {
        question: "What is cel animation?",
        answers: [
          {
            text: "Traditional frame-by-frame on transparent sheets",
            isCorrect: true,
          },
          { text: "3D modeling", isCorrect: false },
          { text: "Stop-motion", isCorrect: false },
          { text: "Vector scaling", isCorrect: false },
        ],
      },
      {
        question: "In multimedia, what is easing in animation?",
        answers: [
          { text: "Gradual acceleration/deceleration", isCorrect: true },
          { text: "Constant speed", isCorrect: false },
          { text: "Looping", isCorrect: false },
          { text: "Reversing", isCorrect: false },
        ],
      },
      {
        question: "What format is used for vector animations on web?",
        answers: [
          { text: "SVG", isCorrect: true },
          { text: "GIF", isCorrect: false },
          { text: "APNG", isCorrect: false },
          { text: "WebM", isCorrect: false },
        ],
      },
      {
        question: "What is onion skinning?",
        answers: [
          { text: "Viewing previous/next frames faintly", isCorrect: true },
          { text: "Texturing surfaces", isCorrect: false },
          { text: "Color grading", isCorrect: false },
          { text: "Sound syncing", isCorrect: false },
        ],
      },
      {
        question: "In interactive animation, what is state machine?",
        answers: [
          { text: "Managing different animation states", isCorrect: true },
          { text: "Rendering frames", isCorrect: false },
          { text: "Compressing files", isCorrect: false },
          { text: "Adding effects", isCorrect: false },
        ],
      },
      {
        question: "What is anticipation in animation principles?",
        answers: [
          { text: "Preparing for main action", isCorrect: true },
          { text: "Following through after action", isCorrect: false },
          { text: "Exaggerating poses", isCorrect: false },
          { text: "Straight ahead drawing", isCorrect: false },
        ],
      },
      {
        question: "Which tool is common for 2D animation?",
        answers: [
          { text: "Adobe Animate", isCorrect: true },
          { text: "Maya", isCorrect: false },
          { text: "Blender", isCorrect: false },
          { text: "ZBrush", isCorrect: false },
        ],
      },
      {
        question: "What is morphing in animation?",
        answers: [
          { text: "Transforming one shape into another", isCorrect: true },
          { text: "Rotating objects", isCorrect: false },
          { text: "Scaling uniformly", isCorrect: false },
          { text: "Path following", isCorrect: false },
        ],
      },
    ];
  }

  destroy() {
    this.scene.events.off("quiz:answerSelected");

    // Restore pet's original update method if we modified it
    if (this.pet && this.originalUpdate) {
      this.pet.update = this.originalUpdate;
    }

    this.isActive = false;
    this.petLocked = false;
  }
}
