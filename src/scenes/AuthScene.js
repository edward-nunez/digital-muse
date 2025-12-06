import { apiClient } from "../services/APIClient.js";
import { goToScene } from "../utils/sceneHelpers.js";

export class AuthScene extends Phaser.Scene {
  constructor() {
    super("Auth");
  }

  create() {
    this.mode = "login"; // 'login' or 'register'
    this.formData = {
      email: "",
      username: "",
      password: "",
      passwordConfirm: "",
    };

    // Fetch CSRF token first
    this.initCsrfToken();

    // Title
    this.titleText = this.add
      .text(400, 50, "Digital Muse - Login", { fontSize: "36px", color: "#fff" })
      .setOrigin(0.5);

    // Form fields
    const startY = 150;
    const spacing = 80;

    // Email
    this.add
      .text(150, startY, "Email:", { fontSize: "18px", color: "#fff" })
      .setOrigin(1, 0.5);
    this.add
      .text(150, startY + 18, "required", { fontSize: "12px", color: "red" })
      .setOrigin(1, 0.5);
    this.emailInput = this.add
      .rectangle(400, startY, 300, 40, 0x333333)
      .setStrokeStyle(2, 0x0f0)
      .setInteractive();
    this.emailText = this.add
      .text(400, startY, "", { fontSize: "18px", color: "#fff", wordWrap: { width: 280 } })
      .setOrigin(0.5);

    // Username (hidden by default)
    this.add
      .text(150, startY + spacing, "Username:", { fontSize: "18px", color: "#fff" })
      .setOrigin(1, 0.5)
      .setName("usernameLabel")
      .setVisible(false);
    this.add
      .text(150, startY + spacing + 18, "required • 3+ chars", { fontSize: "12px", color: "red" })
      .setOrigin(1, 0.5)
      .setName("usernameHint")
      .setVisible(false);
    this.usernameInput = this.add
      .rectangle(400, startY + spacing, 300, 40, 0x333333)
      .setStrokeStyle(2, 0x0f0)
      .setInteractive()
      .setName("usernameInput")
      .setVisible(false);
    this.usernameText = this.add
      .text(400, startY + spacing, "", { fontSize: "18px", color: "#fff" })
      .setOrigin(0.5)
      .setName("usernameText")
      .setVisible(false);

    // Password
    this.add
      .text(150, startY + spacing * 2, "Password:", { fontSize: "18px", color: "#fff" })
      .setOrigin(1, 0.5);
    this.add
      .text(150, startY + spacing * 2 + 18, "required • 6+ chars", { fontSize: "12px", color: "red" })
      .setOrigin(1, 0.5);
    this.passwordInput = this.add
      .rectangle(400, startY + spacing * 2, 300, 40, 0x333333)
      .setStrokeStyle(2, 0x0f0)
      .setInteractive();
    this.passwordText = this.add
      .text(400, startY + spacing * 2, "", { fontSize: "18px", color: "#fff" })
      .setOrigin(0.5);

    // Confirm Password (hidden by default)
    this.add
      .text(150, startY + spacing * 3, "Confirm Password:", { fontSize: "18px", color: "#fff" })
      .setOrigin(1, 0.5)
      .setName("confirmLabel")
      .setVisible(false);
    this.add
      .text(150, startY + spacing * 3 + 18, "required", { fontSize: "12px", color: "red" })
      .setOrigin(1, 0.5)
      .setName("confirmHint")
      .setVisible(false);
    this.confirmInput = this.add
      .rectangle(400, startY + spacing * 3, 300, 40, 0x333333)
      .setStrokeStyle(2, 0x0f0)
      .setInteractive()
      .setName("confirmInput")
      .setVisible(false);
    this.confirmText = this.add
      .text(400, startY + spacing * 3, "", { fontSize: "18px", color: "#fff" })
      .setOrigin(0.5)
      .setName("confirmText")
      .setVisible(false);

    // Error message
    this.errorText = this.add
      .text(400, 500, "", { fontSize: "14px", color: "#f00", wordWrap: { width: 400 } })
      .setOrigin(0.5);

    // Setup input listeners
    this.setupInputListeners();

    // Primary submit button (mode-aware)
    this.loginButton = this.add
      .text(250, 580, "Login", { fontSize: "20px", color: "#0f0" })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        if (this.mode === "login") this.handleLogin();
        else this.handleRegister();
      });

    // Toggle button
    this.toggleButton = this.add
      .text(550, 580, "Register", { fontSize: "20px", color: "#0ff" })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.toggleMode());

    // Keyboard enter to submit
    this.input.keyboard.on("keydown-ENTER", () => {
      if (this.mode === "login") this.handleLogin();
      else this.handleRegister();
    });
  }

  setupInputListeners() {
    // Email input
    this.emailInput.on("pointerdown", () => {
      this.focus = "email";
    });

    // Username input
    this.usernameInput.on("pointerdown", () => {
      this.focus = "username";
    });

    // Password input
    this.passwordInput.on("pointerdown", () => {
      this.focus = "password";
    });

    // Confirm input
    this.confirmInput.on("pointerdown", () => {
      this.focus = "confirm";
    });

    // Keyboard input
    this.input.keyboard.on("keydown", (event) => {
      const key = event.key;

      if (key === "Backspace") {
        if (this.focus === "email") {
          this.formData.email = this.formData.email.slice(0, -1);
          this.emailText.setText(this.formData.email);
        } else if (this.focus === "username") {
          this.formData.username = this.formData.username.slice(0, -1);
          this.usernameText.setText(this.formData.username);
        } else if (this.focus === "password") {
          this.formData.password = this.formData.password.slice(0, -1);
          this.passwordText.setText("*".repeat(this.formData.password.length));
        } else if (this.focus === "confirm") {
          this.formData.passwordConfirm = this.formData.passwordConfirm.slice(0, -1);
          this.confirmText.setText("*".repeat(this.formData.passwordConfirm.length));
        }
      } else if (key.length === 1 && !event.ctrlKey && !event.metaKey) {
        // Add character
        if (this.focus === "email") {
          this.formData.email += key;
          this.emailText.setText(this.formData.email);
        } else if (this.focus === "username") {
          this.formData.username += key;
          this.usernameText.setText(this.formData.username);
        } else if (this.focus === "password") {
          this.formData.password += key;
          this.passwordText.setText("*".repeat(this.formData.password.length));
        } else if (this.focus === "confirm") {
          this.formData.passwordConfirm += key;
          this.confirmText.setText("*".repeat(this.formData.passwordConfirm.length));
        }
      }
    });
  }

  toggleMode() {
    this.mode = this.mode === "login" ? "register" : "login";
    this.titleText.setText(
      this.mode === "login" ? "Digital Muse - Login" : "Digital Muse - Register"
    );

    const usernameLabel = this.children.getByName("usernameLabel");
    const usernameInput = this.children.getByName("usernameInput");
    const usernameText = this.children.getByName("usernameText");
    const usernameHint = this.children.getByName("usernameHint");
    const confirmLabel = this.children.getByName("confirmLabel");
    const confirmInput = this.children.getByName("confirmInput");
    const confirmText = this.children.getByName("confirmText");
    const confirmHint = this.children.getByName("confirmHint");

    if (this.mode === "register") {
      usernameLabel?.setVisible(true);
      usernameInput?.setVisible(true);
      usernameText?.setVisible(true);
      usernameHint?.setVisible(true);
      confirmLabel?.setVisible(true);
      confirmInput?.setVisible(true);
      confirmText?.setVisible(true);
      confirmHint?.setVisible(true);
      this.loginButton.setText("Register");
      this.toggleButton.setText("Login");
    } else {
      usernameLabel?.setVisible(false);
      usernameInput?.setVisible(false);
      usernameText?.setVisible(false);
      usernameHint?.setVisible(false);
      confirmLabel?.setVisible(false);
      confirmInput?.setVisible(false);
      confirmText?.setVisible(false);
      confirmHint?.setVisible(false);
      this.loginButton.setText("Login");
      this.toggleButton.setText("Register");
      this.formData.username = "";
      this.formData.passwordConfirm = "";
    }

    this.errorText.setText("");
    }

    async initCsrfToken() {
      try {
        await apiClient.getCsrfToken();
        console.log("[AuthScene] CSRF token initialized");
      } catch (error) {
        console.error("[AuthScene] Failed to initialize CSRF token:", error);
      }
  }

  async handleLogin() {
    this.errorText.setText("");
    const missing = [];
    if (!this.formData.email) missing.push("Email is required");
    if (!this.formData.password) missing.push("Password is required");
    if (missing.length) {
      this.errorText.setText(missing.join(". "));
      return;
    }

    try {
      const response = await apiClient.login(this.formData.email, this.formData.password);
      console.log("[AuthScene] Login successful", response);

      // Store user data in localStorage or a state manager
      localStorage.setItem("user", JSON.stringify(response.user));

      // Go to pet creation or home scene
      goToScene(this, "PetCreation", { fade: true });
    } catch (error) {
      this.errorText.setText(error.message || "Login failed");
      console.error("[AuthScene] Login error:", error);
    }
  }

  async handleRegister() {
    this.errorText.setText("");
    const missing = [];
    if (!this.formData.email) missing.push("Email is required");
    if (!this.formData.username) missing.push("Username is required");
    if (!this.formData.password) missing.push("Password is required");
    if (!this.formData.passwordConfirm) missing.push("Confirm password is required");
    if (missing.length) {
      this.errorText.setText(missing.join(". "));
      return;
    }

    if (this.formData.username.length < 3) {
      this.errorText.setText("Username must be at least 3 characters");
      return;
    }

    if (this.formData.password.length < 6) {
      this.errorText.setText("Password must be at least 6 characters");
      return;
    }

    if (this.formData.password !== this.formData.passwordConfirm) {
      this.errorText.setText("Passwords do not match");
      return;
    }

    try {
      const response = await apiClient.signup(
        this.formData.email,
        this.formData.username,
        this.formData.password
      );
      console.log("[AuthScene] Registration successful", response);

      // Store user data
      localStorage.setItem("user", JSON.stringify(response.user));

      // Go to pet creation
      goToScene(this, "PetCreation", { fade: true });
    } catch (error) {
      this.errorText.setText(error.message || "Registration failed");
      console.error("[AuthScene] Registration error:", error);
    }
  }
}
