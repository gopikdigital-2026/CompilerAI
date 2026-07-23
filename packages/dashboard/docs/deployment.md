# Deployment

## Build

```bash
npm run build
```

This runs `tsc -b` (type checking) followed by `vite build`, producing static assets in `dist/`.

## Output

The build produces:
- `dist/index.html` — entry HTML
- `dist/assets/*.js` — bundled JavaScript (code-split per route)
- `dist/assets/*.css` — bundled CSS

## Hosting

The dashboard is a static SPA and can be hosted on any static file server:

### Vercel / Netlify / Cloudflare Pages

1. Set the build command to `npm run build`
2. Set the output directory to `dist`
3. Add a rewrite rule for SPA routing: `/* → /index.html`

### Nginx

```nginx
server {
    listen 80;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Docker

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

## Environment Configuration

The dashboard can be configured to point at a live Platform API:

| Setting | Environment Variable | Default | Description |
|---------|---------------------|---------|-------------|
| Base URL | `VITE_API_BASE_URL` | — | Platform API base URL |
| API Key | `VITE_API_KEY` | — | API key for authentication (never exposed in UI) |
| Organization ID | `VITE_ORGANIZATION_ID` | — | Default organization |
| Timeout | `VITE_API_TIMEOUT_MS` | 30000 | Request timeout in milliseconds |

Set these in a `.env` file before building:

```bash
VITE_API_BASE_URL=https://api.compilerai.example.com
VITE_API_KEY=your-api-key
VITE_ORGANIZATION_ID=org_your_org
```

When environment variables are not set, the dashboard falls back to mock data mode automatically.

## Health Checks

After deployment, verify the dashboard is healthy:

1. Navigate to `/health` — should show all 6 services
2. Navigate to `/` — should show dashboard stats
3. Navigate to `/executions` — should show the execution table

## CI/CD Pipeline

Recommended pipeline steps:

```yaml
steps:
  - name: Install
    run: npm ci
  - name: Typecheck
    run: npm run typecheck
  - name: Lint
    run: npm run lint
  - name: Test
    run: npm test
  - name: Build
    run: npm run build
  - name: Deploy
    run: # deploy dist/ to your hosting provider
```
