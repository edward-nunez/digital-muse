# Digital Muse - System Architecture Diagram

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            PRODUCTION DEPLOYMENT                                │
└─────────────────────────────────────────────────────────────────────────────────┘

                                                    
         ┌─────────────────────────────────────────────────────────────┐
         │                    USER BROWSER                             │
         │  https://your-domain.com                                    │
         │  (loads client app from static host)                        │
         └────┬────────────────────────────┬──────────────────────────┘
              │                            │
              │ HTTPS                      │ WSS
              │ (static files)             │ (WebSocket)
              │                            │
    ┌─────────▼──────────────┐   ┌────────▼──────────────────────────┐
    │  STATIC HOST           │   │  API SERVER                        │
    │  (S3/CDN/Netlify)      │   │  (Express)                         │
    │  ┌──────────────────┐  │   │  ┌────────────────────────────┐   │
    │  │ dist/            │  │   │  │ :3000                      │   │
    │  │ ├─ index.html    │  │   │  │ ├─ /api/auth/*             │   │
    │  │ ├─ assets/       │  │   │  │ ├─ /api/pets/*             │   │
    │  │ │  ├─ *.js       │  │   │  │ ├─ /api/health             │   │
    │  │ │  ├─ *.css      │  │   │  │ └─ /socket.io              │   │
    │  │ │  └─ fonts/     │  │   │  └─────┬──────────────────────┘   │
    │  │ └─ manifest.json │  │   │        │                          │
    │  └──────────────────┘  │   │        │ TCP                       │
    │  Config:               │   │        │                          │
    │  - Cache policy        │   │        │                          │
    │  - SPA routing         │   │    ┌───▼──────────────────────┐   │
    │  - HTTPS cert          │   │    │  Redis                   │   │
    └────────────────────────┘   │    │  :6379                   │   │
                                 │    │  ├─ Sessions            │   │
                                 │    │  ├─ User data           │   │
                                 │    │  └─ Pet data            │   │
                                 │    └────────────────────────┘   │
                                 │                                  │
                                 │  Environment:                    │
                                 │  - NODE_ENV=production           │
                                 │  - PORT=3000                     │
                                 │  - REDIS_URL=redis://...         │
                                 │  - SESSION_SECRET=...            │
                                 │  - CORS_ORIGIN=your-domain.com   │
                                 │                                  │
                                 └──────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT ENVIRONMENT                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

    Terminal 1: Client Dev Server        Terminal 2: Server
    ┌────────────────────────────┐      ┌──────────────────────────┐
    │ npm run dev                │      │ cd server                │
    │ (Vite dev server)          │      │ npm run dev              │
    │ :5173                      │      │ (Express + hot-reload)   │
    │ ├─ Hot module reload       │      │ :3000                    │
    │ ├─ Source maps             │      │ ├─ Environment from      │
    │ └─ Instant compilation     │      │ │  .env            │
    │                            │      │ └─ Redis connection      │
    │ File: .env           │      │                          │
    │ DIGITALMUSE_API_URL=              │      │ File: server/.env  │
    │   http://localhost:3000    │      │ REDIS_URL=...            │
    │                            │      │ SESSION_SECRET=...       │
    │                            │      │ CORS_ORIGIN=             │
    │                            │      │   http://localhost:5173  │
    │ Connects to server at :3000       │                          │
    └────────────┬───────────────┘      │ Accepts requests from    │
                 │                      │ :5173                    │
                 │                      │                          │
                 └──────────┬───────────┘                          │
                            │                            ┌─────────▼─────────┐
                            │                            │ Terminal 3:       │
                            │                            │ docker run redis  │
                            │                            │ :6379             │
                            └────────────┬───────────────┴───────────────────┘
                                         │
                                    Redis :6379
                                    (Docker container)


┌─────────────────────────────────────────────────────────────────────────────────┐
│                          BUILD & DEPLOYMENT PROCESS                             │
└─────────────────────────────────────────────────────────────────────────────────┘

LOCAL MACHINE
═════════════════════════════════════════════════════════════════════════════════

Step 1: Build Client (one-time)
┌──────────────────────────────────────────────────────────────┐
│ $ export DIGITALMUSE_API_URL=https://api.your-domain.com            │
│ $ npm run build:check-env                                    │
│                                                              │
│ ┌─ Validates DIGITALMUSE_API_URL                            │
│ ├─ Runs Vite build                                          │
│ ├─ Hashes assets for cache-busting                          │
│ └─ Creates: dist/                                           │
│    └─ Ready for static host deployment                      │
└──────────────────────────────────────────────────────────────┘
                          ↓
Step 2: Deploy Client (one-time)
┌──────────────────────────────────────────────────────────────┐
│ Option A: AWS S3 + CloudFront                                │
│ $ aws s3 sync dist/ s3://bucket/ --delete                   │
│                                                              │
│ Option B: Netlify                                           │
│ $ netlify deploy --prod --dir=dist                          │
│                                                              │
│ Option C: Vercel                                            │
│ $ vercel --prod                                             │
│                                                              │
│ Option D: GitHub Pages                                      │
│ $ git push (with dist/ included)                            │
└──────────────────────────────────────────────────────────────┘
                          ↓
                  STATIC HOST
              (Lives indefinitely)
              https://your-domain.com


DEPLOYMENT PLATFORM
═════════════════════════════════════════════════════════════════════════════════

Step 3: Deploy Server (separate)
┌──────────────────────────────────────────────────────────────┐
│ Option A: Docker Compose                                     │
│ $ docker-compose up -d                                       │
│   (builds from Dockerfile, reads .env for variables)         │
│                                                              │
│ Option B: PM2                                                │
│ $ pm2 start ecosystem.config.cjs                             │
│   (starts Node.js with system env vars)                      │
│                                                              │
│ Option C: Traditional (VPS/Bare Metal)                       │
│ $ npm start                                                  │
│   (uses system environment variables)                        │
│                                                              │
│ ALL OPTIONS:                                                 │
│ ├─ Set: NODE_ENV, PORT, REDIS_URL, SESSION_SECRET           │
│ ├─ Set: CORS_ORIGIN (must match client domain)              │
│ └─ Server listens for API requests                          │
└──────────────────────────────────────────────────────────────┘
                          ↓
                    API SERVER
              (Continuously running)
              https://api.your-domain.com:3000


┌─────────────────────────────────────────────────────────────────────────────────┐
│                          REQUEST/RESPONSE FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

1. PAGE LOAD
┌──────────────────────────────────────────────────────────────┐
│ Browser:                                                     │
│ GET https://your-domain.com/                                 │
│        │                                                    │
│        ├─> Static Host (CDN)                                │
│        └─> Returns: index.html (+ assets via /assets/)      │
└──────────────────────────────────────────────────────────────┘

2. CLIENT INITIALIZATION
┌──────────────────────────────────────────────────────────────┐
│ Client Script (main.js loaded from HTML):                    │
│                                                              │
│ const API_URL = "https://api.your-domain.com"  ← HARDCODED  │
│ const SOCKET_URL = "https://api.your-domain.com" ← HARDCODED│
│                                                              │
│ → These values were baked in during build with VITE_*       │
└──────────────────────────────────────────────────────────────┘

3. API CALL
┌──────────────────────────────────────────────────────────────┐
│ Client:                                                      │
│ fetch('https://api.your-domain.com/api/auth/login', {       │
│   method: 'POST',                                            │
│   credentials: 'include',  ← include cookies!                │
│   body: JSON.stringify({...})                                │
│ })                                                           │
│        │                                                    │
│        ├─> API Server: :3000/api/auth/login                │
│        ├─> Check CORS: CORS_ORIGIN matches? ✓              │
│        ├─> Check Session: Valid session? ✓                 │
│        └─> Redis: Store session data                        │
│        │                                                    │
│        └─> Returns: { userId, token, ... }                 │
│                                                              │
│ Client saves response (session cookie auto-handled)         │
└──────────────────────────────────────────────────────────────┘

4. WEBSOCKET CONNECTION
┌──────────────────────────────────────────────────────────────┐
│ Client:                                                      │
│ io.connect('https://api.your-domain.com', {                 │
│   reconnection: true,                                        │
│   upgrade: true                                              │
│ })                                                           │
│        │                                                    │
│        ├─> API Server: wss://your-domain.com/socket.io     │
│        ├─> Upgrade from HTTP → WebSocket                    │
│        ├─> Check CORS again                                │
│        └─> Establish persistent connection                  │
│                                                              │
│ ↔ Real-time bidirectional communication                     │
│   (pet updates, multiplayer sync, etc.)                     │
└──────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DOMAIN/URL CONFIGURATION                                │
└─────────────────────────────────────────────────────────────────────────────────┘

OPTION 1: SAME DOMAIN (Reverse Proxy)
═══════════════════════════════════════════════════════════════════════════════════

Domain Setup:
    https://your-domain.com
    └─> Points to reverse proxy (Nginx/HAProxy/Load Balancer)
        ├─> /              → Static host (CloudFront/CDN)
        ├─> /api/*         → API Server :3000
        └─> /socket.io/*   → API Server :3000

Client Build:
    export DIGITALMUSE_API_URL=https://your-domain.com

Server Config:
    export CORS_ORIGIN=https://your-domain.com

Advantage: Simpler setup, no CORS issues, single domain


OPTION 2: SEPARATE DOMAINS (Multi-host)
═══════════════════════════════════════════════════════════════════════════════════

Domain Setup:
    https://your-domain.com           ← Client (Static Host)
    https://api.your-domain.com       ← Server (API)

Client Build:
    export DIGITALMUSE_API_URL=https://api.your-domain.com

Server Config:
    export CORS_ORIGIN=https://your-domain.com

Advantage: Independent scaling, separate infrastructure


OPTION 3: SUBDIRECTORY (Same Host)
═══════════════════════════════════════════════════════════════════════════════════

Domain Setup:
    https://your-domain.com/
    ├─> / (/)              → Client (Static)
    └─> /api/* (/)         → Server (API)

Client Build:
    export DIGITALMUSE_API_URL=https://your-domain.com

Server Config:
    export CORS_ORIGIN=https://your-domain.com

Advantage: Single DNS entry, shared SSL cert


┌─────────────────────────────────────────────────────────────────────────────────┐
│                           KEY ENVIRONMENT VARIABLES                              │
└─────────────────────────────────────────────────────────────────────────────────┘

CLIENT (VITE) - Build-time (set before `npm run build`)
═══════════════════════════════════════════════════════════════════════════════════
DIGITALMUSE_API_URL          → Baked into dist/
(Cannot be changed after build without rebuilding)


SERVER - Runtime (set at deployment)
═══════════════════════════════════════════════════════════════════════════════════
NODE_ENV              → "production" or "development"
PORT                  → Server port (default 3000)
REDIS_URL             → Connection string
SESSION_SECRET        → Encryption key (must be secure!)
CORS_ORIGIN           → Client domain (must match exactly!)


┌─────────────────────────────────────────────────────────────────────────────────┐
│                        TROUBLESHOOTING FLOWCHART                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

Problem: CORS Error
    ↓
Does CORS_ORIGIN match client domain exactly?
    ├─ NO → Update CORS_ORIGIN and restart server
    ├─ YES → Is credentials: 'include' in fetch?
    │    ├─ NO → Add credentials to client code
    │    └─ YES → Check browser console for actual error
    └─ Check network tab for OPTIONS preflight request


Problem: WebSocket Fails
    ↓
Is DIGITALMUSE_API_URL correct?
    ├─ NO → Rebuild client with correct URL
    ├─ YES → Is /socket.io proxied on server?
    │    ├─ NO → Configure proxy (Nginx/HAProxy)
    │    └─ YES → Is server running and accessible?
    │         ├─ NO → Start server
    │         └─ YES → Check /socket.io is connected in server config
    └─ Test: curl https://api.your-domain.com/socket.io/


Problem: Blank Page
    ↓
Is index.html served?
    ├─ NO → Check static host is configured (SPA routing)
    ├─ YES → Check browser console for JS errors
    │    ├─ Has errors → Fix client code
    │    └─ No errors → Check Network tab
    │         ├─ Assets 404 → Check asset paths in HTML
    │         └─ API 404 → Check DIGITALMUSE_API_URL matches server


Problem: Session Lost
    ↓
Is Redis running?
    ├─ NO → Start Redis
    ├─ YES → Is REDIS_URL correct?
    │    ├─ NO → Update REDIS_URL
    │    └─ YES → Is SESSION_SECRET consistent?
    │         ├─ NO → Use same secret across instances
    │         └─ YES → Check Redis has data (redis-cli KEYS sess:*)
    └─ Check cookie is being sent (credentials: 'include')
