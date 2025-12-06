# Changes Summary: Decoupled Client-Server Architecture

## Overview

Digital Muse has been refactored from a monolithic Express application (serving both client and server) to a **fully decoupled client-server architecture**:

- **Client**: Built with Vite into static `dist/` folder, deployed to static hosting (S3, Netlify, Vercel, etc.)
- **Server**: Express.js API server, deployed independently (Docker, PM2, traditional hosting)
- **Communication**: HTTP REST API + WebSocket, both with configurable domains

## Files Modified

### 1. **server/src/app.js**
- **Removed**: Static file serving middleware (`express.static(distPath)`)
- **Removed**: SPA fallback route (all non-API requests → index.html)
- **Removed**: Path imports for `__dirname`, `__filename`, `distPath`
- **Result**: Express now serves API-only, no client files

### 2. **vite.config.js**
- **Added**: Rollup output configuration for asset hashing
  - `entryFileNames: 'assets/[name].[hash].js'`
  - `chunkFileNames: 'assets/[name].[hash].js'`
  - `assetFileNames: 'assets/[name].[hash][extname]'`
- **Purpose**: Enables cache-busting for production builds

### 3. **Dockerfile**
- **Changed**: From multi-stage (building client + server) to single-stage (server only)
- **Removed**: Client build stage
- **Removed**: `DIGITALMUSE_API_URL` and `DIGITALMUSE_API_URL` build arguments
- **Result**: Container only runs Node.js server, client built separately

### 4. **docker-compose.yml**
- **Removed**: Build arguments `DIGITALMUSE_API_URL` and `DIGITALMUSE_API_URL`
- **Clarified**: Comment that client is deployed separately
- **Result**: Docker Compose only orchestrates server + Redis

### 5. **DEPLOYMENT.md** (Completely Rewritten)
- **Added**: "Architecture Overview" section explaining decoupled design
- **Reorganized**: Three deployment methods as separate steps
  - Method 1: Traditional (separate client/server)
  - Method 2: Docker (server only)
  - Method 3: PM2 (server only)
- **Added**: Detailed client deployment to static hosts
  - AWS S3 + CloudFront examples
  - Netlify instructions
  - Vercel instructions
  - GitHub Pages instructions
- **Removed**: References to serving client from Express
- **Added**: SPA routing configuration examples for each host
- **Updated**: SSL/HTTPS section to clarify client is separate
- **Expanded**: Troubleshooting with client-specific issues

## Files Created

### 1. **ARCHITECTURE.md** (New)
Complete system design document:
- Decoupled architecture explanation
- Component breakdown (client, server, Redis)
- Communication flow diagram
- Deployment models (local vs production)
- Environment configuration (build-time vs runtime)
- Workflow documentation
- Benefits of architecture
- Common issue troubleshooting

### 2. **CLIENT_BUILD.md** (New)
Comprehensive client build and deployment guide:
- Build process with environment variables
- Deployment to major static hosts:
  - AWS S3 + CloudFront
  - Netlify
  - Vercel
  - GitHub Pages
  - Traditional Nginx/Apache
- SPA routing configuration
- Environment setup per deployment
- CI/CD example (GitHub Actions)
- Local testing
- Asset caching strategy

### 3. **QUICK_START.md** (New)
Quick reference for developers:
- Project structure
- Development setup
- Local development commands
- Production build steps
- Configuration examples
- Common tasks and troubleshooting
- Resource links

## Key Behavioral Changes

### Before
```
Client → Express Server (both bundled)
├─ /         → Served index.html from dist/
├─ /assets/* → Served from dist/assets/
└─ /api/*    → JSON API
```

### After
```
Client (separate) → Static Host    Server (separate) → API Host
├─ index.html                       ├─ /api/auth
├─ /assets/                         ├─ /api/pets
└─ *.js, *.css                      └─ /socket.io → Redis
```

## Build Workflow Changes

### Before
```bash
npm run build              # Builds client only
npm run start             # Runs server + serves client from dist/
```

### After
```bash
# Client (separate build)
export DIGITALMUSE_API_URL=https://api.your-domain.com
npm run build:check-env   # Validates env, builds to dist/
# Upload dist/ to static host

# Server (separate deployment)
export NODE_ENV=production
export REDIS_URL=...
npm run start             # Runs server API only (no client)
```

## Environment Variables

### Client (Build-Time)
- `DIGITALMUSE_API_URL` - Baked into dist/ during build
- `DIGITALMUSE_API_URL` - Baked into dist/ during build

### Server (Runtime)
- `NODE_ENV` - 'production' or 'development'
- `PORT` - Server port
- `REDIS_URL` - Redis connection
- `SESSION_SECRET` - Session encryption key
- `CORS_ORIGIN` - Client domain (must match exactly)

## Deployment Impact

### Local Development
**No change** - Works same as before with `npm run dev` for client and server

### Staging/Production
**Significant change** - Client and server now deploy independently:

1. **Client deployment**: Upload `dist/` to static host
   - Netlify, Vercel, S3, GitHub Pages, Nginx, etc.
   - Independent from server
   - Can redeploy without server restart

2. **Server deployment**: Start Express server
   - Docker: `docker-compose up`
   - PM2: `pm2 start ecosystem.config.cjs`
   - Traditional: `npm start`
   - No client files bundled

## Benefits

1. **Better Caching**
   - Hashed assets (cache-busting)
   - Static host can aggressively cache
   - API can be cached separately

2. **Independent Scaling**
   - Client: CDN (infinite capacity)
   - Server: Load balancer + instances

3. **Flexible Hosting**
   - Client: Cheap static hosts
   - Server: Any Node.js hosting

4. **Security**
   - No template injection risks
   - Smaller Express surface area
   - Static files = no interpretation

5. **CI/CD Simplicity**
   - Client and server deploy separately
   - Different teams can work independently
   - No need to rebuild server for client changes

## Testing

### Local
```bash
npm run dev              # Client on :5173
cd server && npm run dev # Server on :3000
# Both use .env.local files
```

### Production Build
```bash
npm run build:check-env
npm run preview         # Test dist/ locally
# Should work like production
```

### Docker
```bash
docker-compose up -d
# Server on http://localhost:3000/api
# Client must be deployed separately
```

## Migration Notes

If you had custom code relying on Express serving the client:
1. Remove any path-based routing from Express to client files
2. Remove any template rendering (EJS, Handlebars, etc.)
3. All page rendering now happens in Phaser/JavaScript client
4. Express only handles API endpoints and WebSocket

## Validation Checklist

- [x] Server no longer serves static files from dist/
- [x] CORS properly configured for independent domains
- [x] Vite builds with proper asset hashing
- [x] Environment variables properly separated (build-time vs runtime)
- [x] Docker Compose only runs server + Redis
- [x] Deployment docs updated for separate client/server
- [x] Examples provided for major static hosts
- [x] SPA routing configuration documented
- [x] Local development still works seamlessly

## Next Steps for Users

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the new design
2. Follow [QUICK_START.md](./QUICK_START.md) for development
3. Reference [DEPLOYMENT.md](./DEPLOYMENT.md) when ready to deploy
4. Use [CLIENT_BUILD.md](./CLIENT_BUILD.md) for client-specific deployment
5. Check [ENV_CONFIG.md](./ENV_CONFIG.md) for environment setup
