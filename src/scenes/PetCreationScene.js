import { PetProfile } from "../state/PetProfile.js";
import { apiClient } from "../services/APIClient.js";
import { goToScene } from "../utils/sceneHelpers.js";

export class PetCreationScene extends Phaser.Scene {
  constructor() {
    super("PetCreation");
  }

  create() {
    // If no cached user, send to auth without pinging /me
    const userJson = localStorage.getItem("user");
    if (!userJson) {
      goToScene(this, "Auth", { fade: true });
      return;
    }

    this.user = JSON.parse(userJson);

    // Title
    this.add
      .text(400, 50, "Create Your Pet", { fontSize: "36px", color: "#fff" })
      .setOrigin(0.5);

    // Pet name input
    this.add
      .text(150, 150, "Pet Name:", { fontSize: "18px", color: "#fff" })
      .setOrigin(1, 0.5);
    this.nameInput = this.add
      .rectangle(400, 150, 300, 40, 0x333333)
      .setStrokeStyle(2, 0x0f0)
      .setInteractive();
    this.nameText = this.add
      .text(400, 150, "", { fontSize: "18px", color: "#fff" })
      .setOrigin(0.5);

    this.petName = "";
    this.nameInput.on("pointerdown", () => (this.focus = "name"));

    // Class selection
    this.add
      .text(150, 230, "Class:", { fontSize: "18px", color: "#fff" })
      .setOrigin(1, 0.5);

    const classes = ["Paladin", "Mage", "Rogue", "Cleric"];
    this.selectedClass = "Paladin";
    const classButtons = [];

    classes.forEach((cls, i) => {
      const btn = this.add
        .text(250 + i * 60, 230, cls.slice(0, 3), {
          fontSize: "14px",
          color: cls === this.selectedClass ? "#0f0" : "#fff",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          classButtons.forEach((b) => b.setColor("#fff"));
          btn.setColor("#0f0");
          this.selectedClass = cls;
        });
      classButtons.push(btn);
    });

    // Personality selection
    this.add
      .text(150, 310, "Personality:", { fontSize: "18px", color: "#fff" })
      .setOrigin(1, 0.5);

    const personalities = ["Friendly", "Curious", "Brave", "Shy"];
    this.selectedPersonality = "Friendly";
    const personalityButtons = [];

    personalities.forEach((pers, i) => {
      const btn = this.add
        .text(250 + i * 60, 310, pers.slice(0, 3), {
          fontSize: "14px",
          color: pers === this.selectedPersonality ? "#0f0" : "#fff",
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          personalityButtons.forEach((b) => b.setColor("#fff"));
          btn.setColor("#0f0");
          this.selectedPersonality = pers;
        });
      personalityButtons.push(btn);
    });

    // Error message
    this.errorText = this.add
      .text(400, 380, "", { fontSize: "14px", color: "#f00" })
      .setOrigin(0.5);

    // Ensure we still have a valid server session; redirect if not
    this.ensureSession();

    // Create pet button
    this.add
      .text(400, 450, "Create Pet", { fontSize: "24px", color: "#0f0" })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.handleCreatePet());

    // Keyboard input
    this.input.keyboard.on("keydown", (event) => {
      if (this.focus === "name") {
        if (event.key === "Backspace") {
          this.petName = this.petName.slice(0, -1);
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          this.petName += event.key;
        }
        this.nameText.setText(this.petName);
      }
    });

    this.focus = "name";
  }

  async ensureSession() {
    try {
      const { user } = await apiClient.getMe();
      this.user = user;
      localStorage.setItem("user", JSON.stringify(user));
      return true;
    } catch (error) {
      console.error("[PetCreationScene] Session check failed:", error);
      this.errorText?.setText("Session expired. Please log in again.");
      goToScene(this, "Auth", { fade: true });
      return false;
    }
  }

  async handleCreatePet() {
    this.errorText.setText("");

    const hasSession = await this.ensureSession();
    if (!hasSession) return;

    if (!this.petName.trim()) {
      this.errorText.setText("Pet name is required");
      return;
    }

    try {
      // Create pet on server
      const response = await apiClient.createPet(
        this.petName,
        this.selectedClass,
        this.selectedPersonality,
        {}
      );

      console.log("[PetCreationScene] Pet created:", response);

      // Store pet data
      localStorage.setItem("currentPet", JSON.stringify(response.pet));

      // Go to game
      goToScene(this, "HomeScene", { fade: true });
    } catch (error) {
      if (error.message?.includes("Unauthorized")) {
        this.errorText.setText("Session expired. Please log in again.");
        console.error("[PetCreationScene] Unauthorized:", error);
        goToScene(this, "Auth", { fade: true });
        return;
      }

      this.errorText.setText(error.message || "Failed to create pet");
      console.error("[PetCreationScene] Error:", error);
    }
  }
}
