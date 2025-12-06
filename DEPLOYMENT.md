# Digital Muse - Deployment Guide

## Architecture Overview

Digital Muse uses a **decoupled client-server architecture**:

- **Client**: Built with Vite, generates static `dist/` folder deployed to a static host
- **Server**: Express.js API server handling authentication, WebSockets, and business logic
- **Redis**: Session and data storage (can be self-hosted or managed service)

This separation allows:
- Independent scaling of client (static CDN) and server (Node.js)
- Flexible deployment options (client to S3/Netlify/Vercel, server to traditional/container/serverless)
- Easier caching strategies for static assets

## Prerequisites

- Node.js 20+ (for building client and running server)
- Redis 7+ (for session storage)
- Static hosting provider (S3, Netlify, Vercel, GitHub Pages, etc.)
- Docker (optional, for containerized server deployment)

## Environment Setup

### 1. Configure Environment Variables

#### Local Development Only
For local development, use `.env` files:

```bash
# Client
cp .env.example .env
# Edit DIGITALMUSE_API_URL and DIGITALMUSE_API_URL to localhost

# Server
cd server
cp .env.example .env
# Configure for local Redis and localhost CORS
```

#### Production and Development Environments
**DO NOT use .env files**. Instead, set environment variables in your deployment platform:

**Required Server Variables:**
- `NODE_ENV` - 'production' or 'development'
- `PORT` - Server port (typically 3000)
- `REDIS_URL` - Redis connection URL
- `SESSION_SECRET` - Secure random string (see below)
- `CORS_ORIGIN` - Your client URL

**Required Client Build Variables:**
- `DIGITALMUSE_API_URL` - Your API server URL
- `DIGITALMUSE_API_URL` - Your WebSocket URL

### 2. Generate Secure Session Secrets

```bash
# Generate a secure random string for SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add the generated secret to your environment files.

## Deployment Methods

### Method 1: Traditional Deployment (Separate Client & Server)

This is the recommended approach: build client independently and deploy to static host, deploy server separately.

#### Step 1: Build Client

Build the client for your target environment:

```bash
# Set build-time variables (baked into dist/)
export DIGITALMUSE_API_URL=https://api.your-domain.com
export DIGITALMUSE_API_URL=https://api.your-domain.com

# Build and validate
npm run build:check-env  # Validates VITE_* vars and builds to dist/
```

This creates a `dist/` folder with:
- `index.html` - Single page app entry
- `assets/` - Hashed JS, CSS, fonts (cache-busted)
- `site.webmanifest` - PWA manifest

#### Step 2: Deploy Client to Static Host

The `dist/` folder is ready for any static host:

**AWS S3 + CloudFront:**
```bash
# Upload to S3
aws s3 sync dist/ s3://your-bucket/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E123 --paths "/*"
```

**Netlify:**
```bash
# Deploy with Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**Vercel:**
```bash
# Configure vercel.json for SPA routing
cat > vercel.json << EOF
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
EOF

# Deploy
npm install -g vercel
vercel --prod
```

**GitHub Pages:**
```bash
# Update package.json
{
  "homepage": "https://username.github.io/digital-muse"
}

# Deploy
npm run build
git add dist/
git commit -m "build: update dist"
git push
```

**Key Point**: The static host only serves the `dist/` folder. It needs SPA routing configured (all non-file requests → `index.html`).

#### Step 3: Deploy Server

Set environment variables and start the Node.js server:

```bash
# Set server runtime variables
export NODE_ENV=production
export PORT=3000
export REDIS_URL=redis://your-redis-host:6379
export SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export CORS_ORIGIN=https://your-domain.com  # Must match client domain

# Install and start
cd server
npm install --omit=dev
npm run start  # Uses system environment variables
```

The server will:
- Listen on `$PORT` for API requests
- Serve `/api/*` endpoints
- Handle `/socket.io` for WebSocket connections
- Use `$REDIS_URL` for session storage
- Accept requests from `$CORS_ORIGIN` only

### Method 1: Traditional Deployment

### Method 2: Docker Deployment (Server Only)

Deploy the Node.js server in Docker while client remains on static host.

1. **Create environment file for docker-compose** (not tracked in git):

```bash
cat > .env << EOF
# Server runtime
NODE_ENV=production
PORT=3000
REDIS_URL=redis://redis:6379
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
CORS_ORIGIN=https://your-domain.com

# Client build-time (for reference, build happens separately)
DIGITALMUSE_API_URL=https://api.your-domain.com
DIGITALMUSE_API_URL=https://api.your-domain.com
EOF
```

2. **Build client separately** (before deploying containers):

```bash
# Build client for static hosting
export DIGITALMUSE_API_URL=https://api.your-domain.com
export DIGITALMUSE_API_URL=https://api.your-domain.com
npm run build:check-env

# Deploy dist/ to your static host (S3, Netlify, Vercel, etc.)
# This happens independently of Docker
```

3. **Deploy server via Docker:**

```bash
# Build and start server container (and Redis)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

The docker-compose.yml handles:
- Building Node.js server from Dockerfile
- Running Redis container
- Networking between containers
- Environment variables passed via .env file

**Note**: The Dockerfile only builds the server (not the client). Client is deployed separately to static hosting.

### Method 3: PM2 (Production Process Manager)

Run the Node.js server with PM2 while client is on static hosting.

```bash
# Install PM2 globally
npm install -g pm2

# Step 1: Build and deploy client separately
export DIGITALMUSE_API_URL=https://api.your-domain.com
export DIGITALMUSE_API_URL=https://api.your-domain.com
npm run build:check-env

# Deploy dist/ to your static host (S3, Netlify, Vercel, GitHub Pages, etc.)

# Step 2: Set server environment variables
export NODE_ENV=production
export PORT=3000
export REDIS_URL=redis://your-redis-host:6379
export SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export CORS_ORIGIN=https://your-domain.com

# Step 3: Start server with PM2
cd server
pm2 start src/index.js --name digitalmuse-server

# Or use ecosystem file
pm2 start ecosystem.config.cjs

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

**PM2 Ecosystem File** (server/ecosystem.config.cjs):
```javascript
module.exports = {
  apps: [{
    name: 'digitalmuse-server',
    script: 'src/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
      // Set REDIS_URL, SESSION_SECRET, CORS_ORIGIN at system level
      // Do not put secrets in this file
    }
  }]
};
```

## Redis Setup

### Local/Development
Use Docker:
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Production Options

1. **Managed Redis Services:**
   - Redis Cloud (https://redis.com/cloud/)
   - AWS ElastiCache
   - Azure Cache for Redis
   - Google Cloud Memorystore

2. **Self-Hosted:**
   - Configure Redis with persistence
   - Setup replication for HA
   - Configure backups

Example Redis URL formats:
```bash
# Local
redis://localhost:6379

# Remote with auth
redis://username:password@host:port

# Redis Cloud
redis://default:password@redis-12345.redislabs.com:12345
```

## SSL/HTTPS Setup

The client (on static host) will likely have automatic HTTPS. For the server API, you have options:

### Option 1: Load Balancer / Reverse Proxy (Recommended)

Put a reverse proxy in front of your server:

**Nginx:**
```nginx
server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy WebSocket connections
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Cloud Provider SSL

Use your cloud provider's load balancer (AWS ELB, Azure LB, GCP Load Balancer) which terminates SSL automatically.

### Option 3: Node.js Native HTTPS

Set up HTTPS directly in Node.js (less common):
```javascript
import https from 'https';
import fs from 'fs';
import app from './app.js';

const options = {
  key: fs.readFileSync('/path/to/key.pem'),
  cert: fs.readFileSync('/path/to/cert.pem'),
};

https.createServer(options, app).listen(443);
```

**Important**: The client domain and API domain should either:
1. **Same domain**: `https://your-domain.com` serves both client and API (client from CDN, API from origin)
2. **CORS configured**: If different domains, `CORS_ORIGIN` must match client URL exactly
3. **Secure cookies**: When using HTTPS, `secure: true` is already set in production (see app.js)

## Monitoring

### Health Check

The server provides a health endpoint:
```bash
curl https://api.your-domain.com/api/health
```

### PM2 Monitoring
```bash
pm2 monit
pm2 logs digitalmuse-server
```

### Docker Logs
```bash
docker-compose logs -f app
docker-compose logs -f redis
```

### Client Monitoring

Depending on your static host:
- **Netlify**: Built-in analytics and error tracking
- **Vercel**: Analytics dashboard
- **AWS S3 + CloudFront**: CloudFront access logs
- **GitHub Pages**: No built-in analytics

Consider adding monitoring to the client via services like:
- Sentry (error tracking)
- LogRocket (session replay)
- Datadog (APM)

## Redis Setup

### Local/Development
Use Docker:
```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

### Production Options

1. **Managed Redis Services:**
   - Redis Cloud (https://redis.com/cloud/)
   - AWS ElastiCache
   - Azure Cache for Redis
   - Google Cloud Memorystore

2. **Self-Hosted:**
   - Configure Redis with persistence
   - Setup replication for HA
   - Configure backups

Example Redis URL formats:
```bash
# Local
redis://localhost:6379

# Remote with auth
redis://username:password@host:port

# Redis Cloud
redis://default:password@redis-12345.redislabs.com:12345
```

## Troubleshooting

### Client Issues

**CORS errors in browser console:**
- Verify client domain matches `CORS_ORIGIN` environment variable on server
- Check that client is built with correct `DIGITALMUSE_API_URL` and `DIGITALMUSE_API_URL`
- Ensure browser includes credentials in fetch: `fetch(url, { credentials: 'include' })`

**WebSocket connection fails:**
- Verify `DIGITALMUSE_API_URL` points to server API domain
- Check that `/socket.io` path is proxied correctly
- Ensure server is running and reachable

**Blank page or 404 on reload:**
- Verify static host is configured for SPA routing (all non-file requests → `index.html`)
- Check that `index.html` exists in root of `dist/`

### Server Issues

**"REDIS_URL not found" error at startup:**
```bash
# Verify environment variable is set
echo $REDIS_URL

# Test Redis connection
redis-cli -u $REDIS_URL ping
# Should return: PONG
```

**CORS errors from client:**
- Verify `CORS_ORIGIN` environment variable matches client URL exactly
- Include credentials in client requests: `{ credentials: 'include' }`

**Session not persisting:**
- Ensure SESSION_SECRET is set and same across all server instances
- Verify Redis is accessible and connection string is correct
- Check that cookies are enabled and secure flags are appropriate

## Security Checklist

- [ ] Using system environment variables (not .env files) in production/development
- [ ] Generated unique secure `SESSION_SECRET` for each environment
- [ ] `SESSION_SECRET` stored in secure secrets manager (AWS Secrets Manager, Vault, etc.)
- [ ] Configured `REDIS_URL` with password authentication
- [ ] Set `NODE_ENV=production` in production
- [ ] Enabled HTTPS/SSL for both client and server
- [ ] Configured `CORS_ORIGIN` to specific domain (never use wildcards)
- [ ] Verified secure cookies enabled in production (secure flag set)
- [ ] Confirmed .env files in .gitignore (only .env for local dev)
- [ ] Rate limiting configured on `/api/auth` endpoints
- [ ] Redis password authentication enabled
- [ ] Regular security updates (npm audit, dependabot)
- [ ] Environment variables validated at server startup (see server/src/index.js)
- [ ] No secrets printed in logs or error messages
- [ ] Secrets rotation policy documented

## Scaling Considerations

### Horizontal Scaling
- Use Redis for session storage (already configured)
- Deploy multiple server instances behind load balancer
- Use Redis Cluster or Sentinel for high availability
- Client (static files) can be served from CDN for global distribution

### Performance
- Enable Redis persistence (AOF or RDB)
- Configure Redis maxmemory policy
- Monitor Redis memory usage
- Use CDN for static assets and caching headers
- Compress assets in dist/ (Gzip, Brotli)

## Next Steps

1. **Build client**: `npm run build:check-env`
2. **Deploy client**: Upload `dist/` to your static host
3. **Deploy server**: Set environment variables and start with Docker/PM2
4. **Configure DNS**: Point your domains to client host and server host
5. **Test**: Visit client, verify API calls work, check WebSocket connection
6. **Monitor**: Setup logging and error tracking for production

For detailed environment setup, see [ENV_CONFIG.md](./ENV_CONFIG.md)
