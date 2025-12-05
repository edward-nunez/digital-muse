/**
 * Chalkboard UI for displaying quiz questions and answers.
 * Slides in from the left side of the screen.
 */
export class Chalkboard {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.width = opts.width ?? 500;
    this.height = opts.height ?? 500;
    this.startX = opts.startX ?? -this.width;
    this.targetX = opts.targetX ?? 245;
    this.y = opts.y ?? scene.cameras.main.centerY + 20;

    this.container = null;
    this.isOpen = false;
    this.slideInDuration = opts.slideInDuration ?? 400;
    this.slideOutDuration = opts.slideOutDuration ?? 300;

    this._createBoard();
  }

  _createBoard() {
    // Main container for the chalkboard UI
    this.container = this.scene.add.container(this.startX, this.y);

    // Chalkboard background (dark grey/brown color)
    const bg = this.scene.add.rectangle(0, 0, this.width, this.height, 0x153B15);
    bg.setStrokeStyle(3, 0xd4a574);
    this.container.add(bg);

    // Title text
    this.titleText = this.scene.add.text(0, -this.height / 2 + 30, "Quiz", {
      fontSize: "24px",
      fontFamily: "Arial",
      color: "#fff",
      align: "center",
    });
    this.titleText.setOrigin(0.5);
    this.container.add(this.titleText);

    // Question text
    this.questionText = this.scene.add.text(0, -this.height / 2 + 70, "", {
      fontSize: "14px",
      fontFamily: "Arial",
      color: "#fff",
      align: "center",
      wordWrap: { width: this.width - 40 },
    });
    this.questionText.setOrigin(0.5);
    this.container.add(this.questionText);

    // Question counter
    this.counterText = this.scene.add.text(
      -this.width / 2 + 20,
      -this.height / 2 + 30,
      "1/10",
      {
        fontSize: "12px",
        fontFamily: "Arial",
        color: "#d4a574",
        align: "left",
      }
    );
    this.container.add(this.counterText);

    // Answer buttons container
    this.answersContainer = this.scene.add.container(0, 0);
    this.container.add(this.answersContainer);

    // Progress bar background
    const progressBgY = this.height / 2 - 30;
    this.progressBg = this.scene.add.rectangle(
      0,
      progressBgY,
      this.width - 40,
      10,
      0x725138
    );
    this.progressBg.setStrokeStyle(1, 0xd4a574);
    this.container.add(this.progressBg);

    // Progress bar fill
    this.progressBar = this.scene.add.rectangle(
      -(this.width - 40) / 2,
      progressBgY,
      0,
      10,
      0x4ade80
    );
    this.progressBar.setOrigin(0, 0.5);
    this.container.add(this.progressBar);

    // Score text
    this.scoreText = this.scene.add.text(0, this.height / 2 - 10, "Score: 0", {
      fontSize: "12px",
      fontFamily: "Arial",
      color: "#4ade80",
      align: "center",
    });
    this.scoreText.setOrigin(0.5);
    this.container.add(this.scoreText);

    this.container.setDepth(100);
  }

  slideIn() {
    if (this.isOpen) return;
    this.isOpen = true;

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        x: this.targetX,
        duration: this.slideInDuration,
        ease: "Quad.easeOut",
        onComplete: () => resolve(),
      });
    });
  }

  slideOut() {
    if (!this.isOpen) return Promise.resolve();
    this.isOpen = false;

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        x: this.startX,
        duration: this.slideOutDuration,
        ease: "Quad.easeIn",
        onComplete: () => {
          this.clearAnswers();
          resolve();
        },
      });
    });
  }

  displayQuestion(questionData, questionNumber, totalQuestions) {
    this.questionText.setText(questionData.question);
    this.counterText.setText(`${questionNumber}/${totalQuestions}`);

    this.clearAnswers();
    this.createAnswerButtons(questionData.answers);

    // Update progress bar
    const progress = questionNumber / totalQuestions;
    this.progressBar.setDisplaySize((this.width - 40) * progress, 10);
  }

  createAnswerButtons(answers) {
    this.clearAnswers();

    const buttonWidth = this.width - 60;
    const buttonHeight = 30;
    const spacing = 15;
    const startY = -50;

    answers.forEach((answer, index) => {
      const y = startY + index * (buttonHeight + spacing);

      // Button background
      const btnBg = this.scene.add.rectangle(
        0,
        y,
        buttonWidth,
        buttonHeight,
        0x4a4a4a
      );
      btnBg.setStrokeStyle(2, 0xd4a574);
      btnBg.setInteractive({ useHandCursor: true });
      this.answersContainer.add(btnBg);

      // Button text
      const btnText = this.scene.add.text(0, y, answer.text, {
        fontSize: "12px",
        fontFamily: "Arial",
        color: "#fff",
        align: "center",
        wordWrap: { width: buttonWidth - 20 },
      });
      btnText.setOrigin(0.5);
      this.answersContainer.add(btnText);

      // Button interactivity
      btnBg.on("pointerover", () => {
        btnBg.setFillStyle(0x5a5a5a);
      });
      btnBg.on("pointerout", () => {
        btnBg.setFillStyle(0x4a4a4a);
      });
      btnBg.on("pointerdown", () => {
        this._onAnswerSelected(answer, btnBg, btnText);
      });

      // Store reference for tracking
      btnBg.isCorrect = answer.isCorrect;
      btnBg.answerButton = { bg: btnBg, text: btnText };
    });
  }

  _onAnswerSelected(answer, bgElement, textElement) {
    // Emit event that quiz system will listen for
    this.scene.events.emit("quiz:answerSelected", { answer, bgElement });
  }

  clearAnswers() {
    this.answersContainer.removeAll(true);
  }

  updateScore(score) {
    this.scoreText.setText(`Score: ${score}`);
  }

  showFeedback(isCorrect, answerElements) {
    const { bgElement } = answerElements;
    const color = isCorrect ? 0x4ade80 : 0xf87171;

    bgElement.setFillStyle(color);

    return new Promise((resolve) => {
      this.scene.time.delayedCall(800, () => {
        resolve();
      });
    });
  }

  showResults(finalScore, totalQuestions) {
    return new Promise((resolve) => {
      // Clear current content
      this.clearAnswers();
      this.answersContainer.removeAll(true);

      // Show results
      const resultTitle = this.scene.add.text(0, -100, "Quiz Complete!", {
        fontSize: "20px",
        fontFamily: "Arial",
        color: "#4ade80",
        align: "center",
      });
      resultTitle.setOrigin(0.5);
      this.answersContainer.add(resultTitle);

      const scoreDisplay = this.scene.add.text(
        0,
        -40,
        `Final Score: ${finalScore}/${totalQuestions}`,
        {
          fontSize: "18px",
          fontFamily: "Arial",
          color: "#fff",
          align: "center",
        }
      );
      scoreDisplay.setOrigin(0.5);
      this.answersContainer.add(scoreDisplay);

      const percentage = Math.round((finalScore / totalQuestions) * 100);
      const percentText = this.scene.add.text(0, 20, `${percentage}%`, {
        fontSize: "16px",
        fontFamily: "Arial",
        color: "#d4a574",
        align: "center",
      });
      percentText.setOrigin(0.5);
      this.answersContainer.add(percentText);

      // Close button
      const closeBtn = this.scene.add.rectangle(0, 80, 150, 35, 0x4a4a4a);
      closeBtn.setStrokeStyle(2, 0xd4a574);
      closeBtn.setInteractive({ useHandCursor: true });
      this.answersContainer.add(closeBtn);

      const closeBtnText = this.scene.add.text(0, 80, "Close", {
        fontSize: "14px",
        fontFamily: "Arial",
        color: "#fff",
        align: "center",
      });
      closeBtnText.setOrigin(0.5);
      this.answersContainer.add(closeBtnText);

      closeBtn.on("pointerdown", () => resolve());
      closeBtn.on("pointerover", () => closeBtn.setFillStyle(0x5a5a5a));
      closeBtn.on("pointerout", () => closeBtn.setFillStyle(0x4a4a4a));

      this.scoreText.setText(`Final: ${finalScore}`);
    });
  }

  destroy() {
    if (this.container) {
      this.container.destroy();
    }
  }
}
