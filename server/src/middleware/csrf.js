import crypto from "crypto";

const TOKEN_COOKIE = "csrf-token";
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export default function csrfProtection(req, res, next) {
  // Skip safe methods
  if (SAFE_METHODS.includes(req.method)) return next();

  const cookieToken = req.cookies?.[TOKEN_COOKIE];
  const headerToken = req.get("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "CSRF validation failed" });
  }
  return next();
}

// Helper to ensure a token cookie is set and return the token
export function ensureCsrfToken(req, res) {
  let token = req.cookies?.[TOKEN_COOKIE];
  if (!token) {
    token = generateToken();
    res.cookie(TOKEN_COOKIE, token, {
      httpOnly: false, // accessible to JS to send in header
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
  }
  return token;
}
