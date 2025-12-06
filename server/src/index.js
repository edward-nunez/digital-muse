// Only load .env file in local development (when dotenv/config is used)
// In production/development environments, use system environment variables

import { createServer } from "http";
import app from "./app.js";
import { setupSocketIO } from "./lib/socket.js";

const port = process.env.PORT || 3000;
const env = process.env.NODE_ENV || 'development';

console.log(`[server] Starting in ${env} mode`);

// Validate required environment variables
const required = ['REDIS_URL', 'SESSION_SECRET', 'CORS_ORIGIN'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`[server] ERROR: Missing required environment variables: ${missing.join(', ')}`);
  console.error(`[server] For local development, run: npm run dev`);
  console.error(`[server] For production/development, set environment variables in your deployment platform`);
  process.exit(1);
}

// Create HTTP server and attach Socket.io
const httpServer = createServer(app);
const io = setupSocketIO(httpServer);

// Make io accessible to routes if needed
app.set("io", io);

httpServer.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
