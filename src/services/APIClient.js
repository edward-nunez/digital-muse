// API client for REST endpoints
class APIClient {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000";
    this.csrfToken = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add CSRF token if available
    if (this.csrfToken) {
      headers["x-csrf-token"] = this.csrfToken;
    }

    const config = {
      ...options,
      headers,
      credentials: "include", // send cookies
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // Store CSRF token if returned
      if (data.csrfToken) {
        this.csrfToken = data.csrfToken;
      }

      if (!response.ok) {
        const issues = Array.isArray(data.issues)
          ? data.issues
          : Array.isArray(data.details)
            ? data.details
            : [];

        const issueText = issues
          .map((d) => d.message || d.path?.join?.("."))
          .filter(Boolean)
          .join(", ");

        const detail = issueText ? `: ${issueText}` : "";
        throw new Error((data.error || `HTTP ${response.status}`) + detail);
      }

      return data;
    } catch (error) {
      console.error(`[APIClient] Request failed:`, error);
      throw error;
    }
  }

  // Auth endpoints
  async signup(email, username, password, profile = {}) {
    return this.request("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, username, password, profile }),
    });
  }

  async login(email, password) {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request("/api/auth/logout", { method: "POST" });
  }

  async getMe() {
    return this.request("/api/auth/me");
  }

  async getCsrfToken() {
    return this.request("/api/auth/csrf");
  }

  // Pet endpoints
  async getPets() {
    return this.request("/api/pets");
  }

  async createPet(name, className = "Paladin", personality = "Friendly", profile = {}) {
    return this.request("/api/pets", {
      method: "POST",
      body: JSON.stringify({ name, className, personality, profile }),
    });
  }

  async getPet(petId) {
    return this.request(`/api/pets/${petId}`);
  }

  async updatePet(petId, updates) {
    return this.request(`/api/pets/${petId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  async deletePet(petId) {
    return this.request(`/api/pets/${petId}`, { method: "DELETE" });
  }

  // User stats endpoints (rank, battle points)
  async updateUserStats(rankGain = 0, battlePointsGain = 0) {
    return this.request("/api/pets/user/stats", {
      method: "PATCH",
      body: JSON.stringify({ rankGain, battlePointsGain }),
    });
  }

  // Health check
  async healthCheck() {
    return this.request("/api/health");
  }
}

// Export singleton instance
export const apiClient = new APIClient();
