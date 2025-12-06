# Environment Configuration

This project uses environment variables for configuration. Only local development uses `.env` files; production and hosted environments use system environment variables set in the deployment platform.

## Environments

- **Local Dev**: Development on localhost (uses `.env.local`)
- **Development**: Hosted development environment (uses system env vars)
- **Production**: Live production environment (uses system env vars)

## Client (Vite)

### Local Development
Uses `.env.local` file in root directory.

**Variables:**
- `DIGITALMUSE_API_URL` - API server URL (e.g., http://localhost:3000)

**Command:**
```bash
npm run dev              # Uses .env.local
```

### Production/Development Builds
Set environment variables in your shell or CI/CD pipeline:

```bash
# Set variables
export DIGITALMUSE_API_URL=https://api.your-domain.com

# Build (variables are embedded at build time)
npm run build

# Or use the validation script
npm run build:check-env  # Validates env vars before building
```

## Server (Node.js)

### Local Development
Uses `server/.env.local` file loaded by dotenv.

**Variables:**
- `NODE_ENV` - Set to 'development'
- `PORT` - Server port (default: 3000)
- `REDIS_URL` - Redis connection URL
- `SESSION_SECRET` - Session encryption secret
- `CORS_ORIGIN` - Allowed CORS origin

**Command:**
```bash
cd server
npm run dev              # Uses .env.local
```

### Production/Development Deployment
Set environment variables in your deployment platform (Docker, Kubernetes, Cloud Platform, etc.):

**Required Variables:**
- `NODE_ENV` - 'production' or 'development'
- `PORT` - Server port
- `REDIS_URL` - Redis connection URL
- `SESSION_SECRET` - Secure random string
- `CORS_ORIGIN` - Client URL for CORS

**Command:**
```bash
cd server
npm run start            # Uses system environment variables
```

**Generate Secure Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Docker Deployment

Use environment variables or an env file:

```bash
# Create a .env file for docker-compose (not tracked in git)
cat > .env << EOF
NODE_ENV=production
PORT=3000
REDIS_URL=redis://redis:6379
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
CORS_ORIGIN=https://your-domain.com
DIGITALMUSE_API_URL=https://api.your-domain.com
EOF

# Deploy
docker-compose up -d
```

## Platform-Specific Setup

### AWS/EC2
Set environment variables in:
- EC2 User Data script
- Systems Manager Parameter Store
- Secrets Manager

### Heroku
```bash
heroku config:set NODE_ENV=production
heroku config:set SESSION_SECRET=your-secret
heroku config:set REDIS_URL=your-redis-url
heroku config:set CORS_ORIGIN=https://your-domain.com
```

### Vercel/Netlify
Set environment variables in the dashboard:
- DIGITALMUSE_API_URL

### Kubernetes
Use ConfigMaps and Secrets:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: digitalmuse-secrets
type: Opaque
stringData:
  SESSION_SECRET: your-secret-here
  REDIS_URL: redis://redis-service:6379
```

## Security Notes

✅ **Best Practices:**
- Only `.env.local` files for local development
- System environment variables for production/development
- Never commit secrets to git
- Rotate SESSION_SECRET periodically
- Use managed secrets services (AWS Secrets Manager, etc.)
- Validate required env vars at startup (server does this automatically)

⚠️ **Never:**
- Commit `.env` files with real secrets
- Hardcode secrets in source code
- Use same SESSION_SECRET across environments
- Expose secrets in logs or error messages
