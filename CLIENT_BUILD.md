# Building and Deploying the Client

The Digital Muse client is built separately from the server and deployed to static hosting.

## Build Process

### 1. Set Environment Variables

```bash
# These variables are baked into the dist/ during build
export DIGITALMUSE_API_URL=https://api.your-domain.com
export DIGITALMUSE_API_URL=https://api.your-domain.com
```

**Important**: 
- These must be the URLs of your deployed API server
- They are hardcoded into the built `dist/` folder
- Once built, the client will always point to these URLs

### 2. Build Client

```bash
# Builds to dist/ with validation
npm run build:check-env
```

This command:
1. Validates that `DIGITALMUSE_API_URL` and `DIGITALMUSE_API_URL` are set
2. Exits with error if validation fails
3. Runs Vite build with proper asset hashing
4. Creates static files in `dist/`

### 3. Verify Build Output

```bash
ls dist/
# Should see:
# index.html
# assets/ (with hashed .js and .css files)
# site.webmanifest
```

## Deployment to Static Hosts

### AWS S3 + CloudFront

```bash
# Upload to S3
aws s3 sync dist/ s3://your-bucket-name/ --delete

# Invalidate CloudFront cache (if using)
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"

# Configure S3 bucket:
# - Enable static website hosting
# - Set index.html as index document
# - Set 404.html fallback to index.html (for SPA routing)
# - Setup CloudFront CDN for HTTPS and caching
```

### Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist

# Or authorize and drag/drop dist/ folder in Netlify UI
```

**Netlify Configuration** (`netlify.toml`):
```toml
[build]
  command = "npm run build:check-env"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod --name digital-muse
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "buildCommand": "npm run build:check-env",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### GitHub Pages

```bash
# Update package.json homepage field
{
  "homepage": "https://username.github.io/digital-muse"
}

# Build
npm run build:check-env

# Commit and push dist/
git add dist/
git commit -m "build: update client"
git push
```

### Traditional Web Server (Nginx/Apache)

```bash
# Copy dist/ to web server
scp -r dist/ user@server:/var/www/digital-muse/

# Configure Nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    root /var/www/digital-muse;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## SPA Routing Configuration

All static hosts must be configured to serve `index.html` for non-file requests. This allows the Phaser app to handle all routing.

**Configuration Examples**:

**S3 + CloudFront**:
- S3 bucket: Static website hosting with 404 → index.html
- CloudFront: Origin → S3 bucket

**Netlify**: 
- Automatic SPA routing (built-in)
- Or add redirect rule: `/* -> /index.html 200`

**Vercel**: 
- Automatic SPA routing (built-in)

**Apache**:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**Nginx**:
```nginx
try_files $uri $uri/ /index.html;
```

## Environment Variables for Different Deployments

### Staging Environment

```bash
export DIGITALMUSE_API_URL=https://api-staging.your-domain.com
export DIGITALMUSE_API_URL=https://api-staging.your-domain.com
npm run build:check-env

# Deploy dist/ to staging.your-domain.com
```

### Production Environment

```bash
export DIGITALMUSE_API_URL=https://api.your-domain.com
export DIGITALMUSE_API_URL=https://api.your-domain.com
npm run build:check-env

# Deploy dist/ to your-domain.com
```

## Continuous Deployment (CI/CD)

### GitHub Actions Example

```yaml
name: Build and Deploy Client

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build client
        env:
          DIGITALMUSE_API_URL: https://api.your-domain.com
          DIGITALMUSE_API_URL: https://api.your-domain.com
        run: npm run build:check-env
      
      - name: Deploy to S3
        uses: jakejarvis/s3-sync-action@master
        with:
          args: --delete
        env:
          AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: 'us-east-1'
          SOURCE_DIR: 'dist'
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DIST_ID }} \
            --paths "/*"
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: 'us-east-1'
```

## Troubleshooting

### "dist/ is empty"
- Build failed silently
- Run `npm run build` to see errors
- Check that `DIGITALMUSE_API_URL` and `DIGITALMUSE_API_URL` are set

### "Cannot GET /" after deployment
- SPA routing not configured on static host
- Add fallback to `index.html` for all non-file routes

### API calls return 404
- `DIGITALMUSE_API_URL` points to wrong server
- Rebuild client with correct API URL
- Verify server is running and accessible

### WebSocket connection fails
- `DIGITALMUSE_API_URL` incorrect
- Rebuild client with correct WebSocket URL
- Verify `/socket.io` is proxied on server

## Local Testing

Test the production build locally:

```bash
# Build production bundle
npm run build:check-env

# Preview the build
npm run preview

# Should open http://localhost:5173 serving dist/
```

## Asset Caching

The build output includes hashed filenames for cache-busting:

```
assets/main.f3a2c1d4.js
assets/style.e8b2f91c.css
```

Configuration in `vite.config.js`:
```javascript
rollupOptions: {
    output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
    },
},
```

This allows aggressive caching:
- Assets: Cache-Control: max-age=31536000 (1 year)
- index.html: Cache-Control: no-cache, must-revalidate (always check)
