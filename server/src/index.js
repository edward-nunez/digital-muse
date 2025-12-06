import dotenv from "dotenv";
dotenv.config();

import { createServer } from "http";
import app from "./app.js";
import { setupSocketIO } from "./lib/socket.js";

const port = process.env.PORT || 3000;

// Create HTTP server and attach Socket.io
const httpServer = createServer(app);
const io = setupSocketIO(httpServer);

// Make io accessible to routes if needed
app.set("io", io);

httpServer.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
