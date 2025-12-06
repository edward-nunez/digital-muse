# Digital Muse - Quick Start Guide

## Project Structure

```
digital-muse/
├── src/                    # Client code (Phaser game)
│   ├── index.html          # SPA entry point
│   ├── main.js             # Entry point
│   ├── entities/           # Phaser game objects
│   ├── scenes/             # Game scenes
│   ├── services/           # API and Socket clients
│   ├── state/              # Game state
│   ├── systems/            # Game systems
│   └── utils/              # Utilities
├── server/                 # Server code (Express API)
│   ├── src/
│   │   ├── index.js        # Server entry
│   │   ├── app.js          # Express app setup
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   └── lib/            # Redis client
│   ├── package.json
│   └── ecosystem.config.cjs # PM2 config
├── public/                 # Static assets
│   ├── assets/
│   │   ├── sprites/
│   │   ├── sounds/
│   │   └── fonts/
│   └── site.webmanifest
├── dist/                   # Built client (generated)
├── scripts/
│   └── check-build-env.js  # Build validation
├── package.json            # Client dependencies
├── vite.config.js          # Vite config
├── docker-compose.yml      # Docker setup
├── Dockerfile              # Server container
├── ARCHITECTURE.md         # System design
├── DEPLOYMENT.md           # Deployment guide
├── CLIENT_BUILD.md         # Client build guide
└── ENV_CONFIG.md           # Environment setup

```

## Development

### Setup

```bash
# Client dependencies
npm install

# Server dependencies
cd server && npm install && cd ..

# Local Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Run Locally

**Terminal 1** - Client (Vite dev server):
```bash
npm run dev
# Runs on http://localhost:5173
```

**Terminal 2** - Server (Express):
```bash
cd server
npm run dev
# Runs on http://localhost:3000
```

The client automatically connects to `http://localhost:3000` for API calls.

### Scripts

**Client**:
- `npm run dev` - Start Vite dev server
- `npm run build` - Build to dist/ (requires VITE_* env vars)
- `npm run build:check-env` - Validate env and build
- `npm run preview` - Preview production build locally

**Server**:
- `npm run dev` - Start with hot-reload (uses .env)
- `npm run start` - Start for production (uses system env vars)

## Building for Production

### Step 1: Build Client

```bash
# Set API URLs (baked into dist/)
export DIGITALMUSE_API_URL=https://api.your-domain.com

# Build and validate
npm run build:check-env

# Creates dist/ folder ready to deploy
```

### Step 2: Deploy Client

Upload `dist/` to static host:
- **AWS S3 + CloudFront**: `aws s3 sync dist/ s3://bucket/`
- **Netlify**: `netlify deploy --prod --dir=dist`
- **Vercel**: `vercel --prod`
- **GitHub Pages**: Push dist/ and enable Pages
- **Web server**: `scp -r dist/ server:/var/www/`

### Step 3: Deploy Server

Set environment variables and start:

```bash
# Set these in your deployment platform:
export NODE_ENV=production
export PORT=3000
export REDIS_URL=redis://your-redis-host:6379
export SESSION_SECRET=<secure-random-string>
export CORS_ORIGIN=https://your-domain.com

# Option 1: Docker Compose
docker-compose up -d

# Option 2: PM2
pm2 start ecosystem.config.cjs

# Option 3: Traditional
cd server && npm install --omit=dev && npm run start
```

## Architecture

Digital Muse separates client and server:

```
Client (Static)              Server (Node.js)
─────────────────────────────────────────────
dist/                        Express API
├─ index.html                ├─ /api/auth
├─ assets/                   ├─ /api/pets
└─ *.js, *.css               └─ /socket.io
                             ↓
                            Redis
```

**Benefits**:
- Client: Fast CDN delivery, simple deployment
- Server: Traditional API hosting, horizontal scaling
- Independent: Can deploy either without touching the other

See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

## Configuration

### Local Development (.env)

Client:
```bash
DIGITALMUSE_API_URL=http://localhost:3000
```

Server:
```bash
REDIS_URL=redis://localhost:6379
SESSION_SECRET=dev-secret-not-for-production
CORS_ORIGIN=http://localhost:5173
```

### Production (System Environment Variables)

Set at deployment:
```bash
DIGITALMUSE_API_URL=https://api.your-domain.com
NODE_ENV=production
REDIS_URL=redis://your-redis:6379
SESSION_SECRET=<secure-random-string>
CORS_ORIGIN=https://your-domain.com
```

See [ENV_CONFIG.md](./ENV_CONFIG.md) for detailed setup.

## Key Files

### Client

- `src/main.js` - Game initialization
- `src/services/APIClient.js` - REST API calls
- `src/services/SocketService.js` - WebSocket communication
- `src/scenes/PlayScene.js` - Main game scene
- `src/config/` - Game and environment config

### Server

- `server/src/index.js` - Startup and validation
- `server/src/app.js` - Express middleware setup
- `server/src/routes/index.js` - Route definitions
- `server/src/services/userService.js` - User logic
- `server/src/services/petService.js` - Pet logic
- `server/src/lib/redis.js` - Redis client

## Common Tasks

### Run health check

```bash
curl http://localhost:3000/api/health
```

### Check server logs

```bash
# Docker
docker-compose logs -f app

# PM2
pm2 logs digitalmuse-server

# Direct
tail -f server.log
```

### Connect to Redis

```bash
# Local
redis-cli

# Remote
redis-cli -u redis://host:port
```

### Rebuild client

```bash
# For staging
export DIGITALMUSE_API_URL=https://api-staging.example.com
npm run build:check-env
```

### Deploy new server version

```bash
# Docker
docker-compose down
docker-compose up -d

# PM2
pm2 restart ecosystem.config.cjs

# Traditional
cd server && npm install && npm run start
```

## Troubleshooting

### CORS Error

**Error**: `Access to XMLHttpRequest at 'https://api.domain' from origin 'https://domain' has been blocked`

**Fix**: 
- Verify `CORS_ORIGIN` on server matches client domain exactly
- Ensure credentials are sent in requests: `{ credentials: 'include' }`

### WebSocket Connection Failed

**Error**: `WebSocket is closed before the connection is established`

**Fix**:
- Check `DIGITALMUSE_API_URL` points to correct server
- Verify `/socket.io` is accessible and proxied
- Check browser WebSocket protocol (ws:// or wss://)

### Redis Connection Failed

**Error**: `connect ECONNREFUSED 127.0.0.1:6379`

**Fix**:
- Start Redis: `docker run -d -p 6379:6379 redis:7-alpine`
- Or set `REDIS_URL` to correct host
- Test: `redis-cli -u $REDIS_URL ping`

### Blank Page After Deploy

**Error**: Page loads but appears blank

**Fix**:
- Check browser console for errors
- Verify static host serves `index.html` for all non-file routes
- Ensure `dist/index.html` exists
- Check asset paths in Network tab

## Resources

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design and component overview
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [CLIENT_BUILD.md](./CLIENT_BUILD.md) - Client build and static deployment
- [ENV_CONFIG.md](./ENV_CONFIG.md) - Environment configuration details
- [Phaser Docs](https://photonstorm.github.io/phaser3-docs/)
- [Express Docs](https://expressjs.com/)
- [Socket.io Docs](https://socket.io/docs/)

## License

Apache License 2.0
