# Digital Muse - Architecture Overview

## Decoupled Client-Server Architecture

Digital Muse uses a **fully decoupled client-server architecture**, allowing independent development and deployment of the frontend and backend.

## Components

### 1. Client (Static SPA)

**Location**: `src/`, `public/`, built to `dist/`

**Technology Stack**:
- Vite (build tool)
- Phaser 4 (game engine)
- Socket.io-client (WebSocket)
- Vanilla JavaScript

**Deployment**:
- Built to static `dist/` folder with Vite
- Deployed to static hosting (S3, Netlify, Vercel, GitHub Pages, etc.)
- No Node.js required - just static files
- Environment variable baked in at build time via `DIGITALMUSE_API_URL`

**Build Output**:
```
dist/
├── index.html           # SPA entry point
├── assets/
│   ├── *.js            # Hashed for cache-busting
│   ├── *.css           # Hashed for cache-busting
│   └── fonts/          # Web fonts
└── site.webmanifest    # PWA manifest
```

**Key Files**:
- `src/main.js` - Entry point
- `src/config/` - Environment and game configuration
- `src/services/APIClient.js` - Communicates with server API
- `src/services/SocketService.js` - WebSocket communication

### 2. Server (Express API)

**Location**: `server/`

**Technology Stack**:
- Express v5 (Node.js web framework)
- Redis (session store + data persistence)
- Socket.io (WebSocket for real-time communication)
- Zod (input validation)
- bcrypt (password hashing)

**Endpoints**:
- `/api/auth/*` - Authentication (register, login, logout)
- `/api/pets/*` - Pet management
- `/api/health` - Health check
- `/socket.io` - WebSocket namespace for multiplayer

**Environment Variables** (at runtime):
- `NODE_ENV` - 'production' or 'development'
- `PORT` - Server port (default 3000)
- `REDIS_URL` - Redis connection string
- `SESSION_SECRET` - For session encryption
- `CORS_ORIGIN` - Client domain (must match exactly)

**Key Files**:
- `server/src/index.js` - Server entry point with env validation
- `server/src/app.js` - Express app setup (no static file serving)
- `server/src/routes/` - API route handlers
- `server/src/services/` - Business logic
- `server/src/lib/redis.js` - Redis client setup

### 3. Redis

**Purpose**: Session storage and data persistence

**Deployment Options**:
- Local: Docker container (`redis:7-alpine`)
- Production: Managed service (Redis Cloud, AWS ElastiCache, Azure Cache, GCP Memorystore)

## Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Client (Static Host)                       │
│  Netlify / Vercel / S3 / GitHub Pages                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ dist/ (index.html + assets)                          │   │
│  │ - Phaser game                                        │   │
│  │ - Socket.io client                                   │   │
│  │ - API client (fetch)                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTPS/WSS
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼ REST API            ▼ WebSocket
    /api/*               /socket.io
        │                     │
┌───────┴─────────────────────┴──────────┐
│      Server (Node.js / Express)        │
│  Docker / PM2 / Heroku / AWS Lambda    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ Express App (server/src/app.js)  │  │
│  │ - No static file serving         │  │
│  │ - JSON API only                  │  │
│  │ - Session middleware (Redis)     │  │
│  │ - CORS enabled                   │  │
│  │ - Socket.io server               │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────┬──────────────────────────┘
             │
             ▼
    ┌────────────────┐
    │     Redis      │
    │   Session &    │
    │     Data       │
    └────────────────┘
```

## Deployment Models

### Local Development

Both client and server run on localhost:
- Client: Vite dev server on `http://localhost:5173`
- Server: Express on `http://localhost:3000`
- Redis: Docker container on `localhost:6379`
- Environment: `.env.local` files for both

### Staging/Production

Complete separation:

```
Client Deployment:
  npm run build:check-env
  └─> dist/
      └─> Deploy to static host (Netlify, Vercel, S3+CloudFront, etc.)

Server Deployment:
  Set environment variables in deployment platform
  └─> npm run start (or docker-compose up, or pm2 start)
      └─> Listen on $PORT for API requests
          Use $REDIS_URL for session storage
          Accept $CORS_ORIGIN only
```

## Environment Configuration

### Client Build Time

Variables baked into `dist/`:
- `DIGITALMUSE_API_URL` - API server base URL (e.g., `https://api.your-domain.com`)

**Built at**: `npm run build` (validated by `npm run build:check-env`)

**Location**: `scripts/check-build-env.js`

### Server Runtime

Variables read from system environment:
- `NODE_ENV` - 'production' or 'development'
- `PORT` - Server port
- `REDIS_URL` - Redis connection string
- `SESSION_SECRET` - Secure session key
- `CORS_ORIGIN` - Client domain

**Loaded at**: Server startup (server/src/index.js)

**Validation**: Required vars checked, process exits if missing

## Build & Deployment Workflow

### Development

```bash
# Terminal 1: Client dev server
npm run dev
# Client hot-reloads on changes
# Built-in API/Socket URLs point to localhost:3000

# Terminal 2: Server
cd server && npm run dev
# Server hot-reloads on changes
# Uses .env.local for Redis connection
```

### Production

```bash
# Step 1: Build client (one-time)
export DIGITALMUSE_API_URL=https://api.your-domain.com
npm run build:check-env
# Creates dist/ with hardcoded API URLs

# Step 2: Deploy client
# Upload dist/ to static host

# Step 3: Deploy server
# Set environment variables in deployment platform
# Run: npm run start or docker-compose up or pm2 start
# Server accepts API calls from CORS_ORIGIN

# Step 4: Verify
# Visit https://your-domain.com (static host)
# Client makes API calls to https://api.your-domain.com
# WebSocket connects to wss://api.your-domain.com/socket.io
```

## Key Architectural Benefits

1. **Independent Scaling**
   - Client: Scale with CDN (infinite capacity)
   - Server: Scale with load balancer + multiple instances

2. **Flexible Hosting**
   - Client: Any static host (cheap, fast)
   - Server: Any Node.js host (traditional, container, serverless)

3. **Better Caching**
   - Client assets: Cache-busted with hashes, served from CDN
   - API: Cacheable with proper headers

4. **Security**
   - No serving client from Express (smaller attack surface)
   - API-only server (no template injection risks)
   - Static files = no interpretation, only delivery

5. **CI/CD Simplicity**
   - Client build → S3/Netlify/Vercel (different platforms supported)
   - Server build → Docker/PM2/Heroku (different orchestration)
   - Independent deployment schedules

## Example: Deploying to AWS + Netlify

**Client**:
```bash
npm run build:check-env
# Upload dist/ to S3 bucket
# CloudFront CDN serves dist/
# Custom domain: https://your-domain.com
```

**Server**:
```bash
# Deploy to EC2 / ECS / Lambda
# Set environment variables in deployment
# Custom domain: https://api.your-domain.com
# Reverse proxy / load balancer handles HTTPS
```

**Result**: 
- User visits `https://your-domain.com` → served from CloudFront (fast)
- Browser loads app → makes API calls to `https://api.your-domain.com`
- Server handles auth, business logic, WebSocket
- Redis stores sessions

## Troubleshooting Common Issues

### CORS Error in Browser

**Cause**: Client domain doesn't match `CORS_ORIGIN` on server

**Fix**: Set `CORS_ORIGIN=<client_domain>` at server deployment time

### WebSocket Connection Fails

**Cause**: `DIGITALMUSE_API_URL` built into client doesn't match server location

**Fix**: Build client with correct `DIGITALMUSE_API_URL` environment variable

### Session Not Persisting

**Cause**: Redis unreachable or `SESSION_SECRET` changes

**Fix**: Verify `REDIS_URL` is set and accessible, use consistent `SESSION_SECRET`

### Blank Page on Load

**Cause**: Static host not configured for SPA routing

**Fix**: Configure host to serve `index.html` for all non-file routes

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.
