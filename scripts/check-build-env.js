#!/usr/bin/env node

// Validate that required build-time environment variables are set
// This prevents building with missing or default values

const required = ["DIGITALMUSE_API_URL"];

console.log("[Build Check] Validating environment variables...");

const missing = [];
const usingDefaults = [];

required.forEach((key) => {
  const value = process.env[key];

  if (!value) {
    missing.push(key);
  } else if (value.includes("localhost") || value.includes("127.0.0.1")) {
    usingDefaults.push({ key, value });
  }
});

if (missing.length > 0) {
  console.error("\n❌ ERROR: Missing required environment variables:");
  missing.forEach((key) => console.error(`  - ${key}`));
  console.error(
    "\nSet these variables before building for production/development."
  );
  console.error("Example:");
  console.error("  export DIGITALMUSE_API_URL=https://api.your-domain.com");
  console.error("  npm run build\n");
  process.exit(1);
}

if (usingDefaults.length > 0) {
  console.warn("\n⚠️  WARNING: Using localhost URLs in build:");
  usingDefaults.forEach(({ key, value }) => console.warn(`  ${key}=${value}`));
  console.warn(
    "\nThis is fine for local testing, but production builds should use production URLs.\n"
  );
}

console.log("✓ All required environment variables are set\n");
