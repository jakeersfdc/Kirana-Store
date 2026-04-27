# Kirana SaaS — Production Deployment

This is a production-ready Node.js + Express + PostgreSQL multi-tenant SaaS backend with a Blinkit-style customer storefront and an admin console.

## ✅ What's already production-grade

| Concern | Implementation |
|---|---|
| Process | Graceful shutdown (SIGTERM/SIGINT), unhandled-rejection capture, keep-alive tuned for LBs |
| Security | Helmet (CSP + HSTS), CORS allowlist, `x-powered-by` off, request IDs |
| Auth | bcrypt, JWT, separate strict rate limit on `/auth` (anti brute-force) |
| Rate limiting | Global + per-IP public storefront + auth-specific limiters |
| Multi-tenant isolation | `storeId` on every row, `tenantGuard` middleware |
| DB | PostgreSQL, parameterized queries via Sequelize, connection pool, transactions for orders/payments |
| Webhooks | Raw body kept for HMAC verification (WhatsApp / Razorpay) |
| Config | Fail-fast validation: refuses to boot in prod with weak `JWT_SECRET` or missing `DB_PASSWORD` |
| Container | Multi-stage Docker, non-root user, `dumb-init` for signals, HEALTHCHECK, memory limit |
| Logs | Winston JSON in prod, request IDs propagated to nginx via `X-Request-Id` |
| Reverse proxy | nginx with rate-limit zones, gzip, security headers, TLS-ready |
| Observability | `/health` (liveness) and `/ready` (readiness — checks DB) |

## 🚀 Deployment Option A — Docker Compose (recommended)

### 1. Provision a server (any cloud / VPS)
- Ubuntu 22.04+, 1 vCPU / 1 GB RAM is fine for ≤ 50 stores
- Install Docker + Compose v2: `curl -fsSL https://get.docker.com | sh`

### 2. Clone & configure
```bash
git clone <your-repo> kirana && cd kirana/backend
cp .env.production.example .env.production
# Edit .env.production — set JWT_SECRET, DB_PASSWORD, CORS_ORIGINS, Razorpay/WhatsApp keys
nano .env.production
```

Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

### 3. Launch
```bash
npm run docker:up        # builds image, starts db + api + nginx
npm run docker:logs      # tail logs
```

The first boot auto-runs Sequelize migrations (`RUN_MIGRATIONS=true`).

### 4. Seed a demo store (optional, one-time)
```bash
docker compose -f docker-compose.prod.yml exec api node src/scripts/seed.js
```

### 5. Health check
```bash
curl http://your-server-ip/health   # {"status":"ok"...}
curl http://your-server-ip/ready    # {"status":"ready"} when DB is up
```

### 6. Add HTTPS (Let's Encrypt)
```bash
# On the host, get certs (one-off — needs port 80 free, briefly stop nginx)
docker compose -f docker-compose.prod.yml stop nginx
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/{fullchain,privkey}.pem ./deploy/certs/
docker compose -f docker-compose.prod.yml start nginx
```
Then in `deploy/nginx.conf` uncomment the `listen 443 ssl http2` block and the HTTP→HTTPS redirect server block, and `docker compose -f docker-compose.prod.yml restart nginx`.

Auto-renew (cron):
```cron
0 3 * * * certbot renew --quiet --post-hook "docker compose -f /path/to/backend/docker-compose.prod.yml restart nginx"
```

### 7. URLs after deploy
- `https://your-domain.com/`        → Customer storefront (Blinkit-style)
- `https://your-domain.com/admin`   → Store-owner console
- `https://your-domain.com/api/v1`  → API

### 8. Backups
```bash
# Daily DB backup (cron)
0 2 * * * docker compose -f /path/to/backend/docker-compose.prod.yml exec -T db \
  pg_dump -U $DB_USER $DB_NAME | gzip > /var/backups/kirana-$(date +\%F).sql.gz
```

## 🚀 Deployment Option B — PM2 on a VPS (no Docker)

```bash
# Install Node 20 + PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs postgresql nginx
sudo npm i -g pm2

# App
git clone <repo> kirana && cd kirana/backend
cp .env.production.example .env
nano .env                                  # fill in secrets
npm ci --omit=dev

# DB
sudo -u postgres psql -c "CREATE DATABASE kirana_saas;"
sudo -u postgres psql -c "CREATE USER kirana WITH PASSWORD 'YOUR_PASS';"
sudo -u postgres psql -c "GRANT ALL ON DATABASE kirana_saas TO kirana;"

# Boot
RUN_MIGRATIONS=true npm run pm2:start
pm2 save
pm2 startup systemd                        # follow the printed command
```

Front it with the provided nginx config (copy `deploy/nginx.conf` to `/etc/nginx/sites-available/kirana`, change `server api:4000` → `server 127.0.0.1:4000`).

## 🚀 Deployment Option C — Managed PaaS

The included `Dockerfile` works as-is on:
- **Render** — point at the repo, set env vars from `.env.production.example`, attach a Postgres add-on
- **Railway** — `railway up`, attach Postgres plugin
- **Fly.io** — `fly launch` (uses the Dockerfile), `fly postgres create && fly postgres attach`
- **Google Cloud Run** — push image to Artifact Registry, attach Cloud SQL
- **AWS App Runner** / **ECS Fargate** — push to ECR, RDS for Postgres
- **DigitalOcean App Platform** — point at repo, Managed Postgres

Required env vars in any platform: `NODE_ENV=production`, `JWT_SECRET`, `DB_*`, `CORS_ORIGINS`, `RUN_MIGRATIONS=true`.

## 🔐 Production Security Checklist

- [ ] `JWT_SECRET` is a 48+ char random string (NOT the example value)
- [ ] `DB_PASSWORD` is unique and strong
- [ ] `CORS_ORIGINS` is restricted to your actual domains (no `*`)
- [ ] HTTPS / TLS is enabled (Let's Encrypt or cloud LB)
- [ ] `DB_SSL=true` if your DB is over the internet
- [ ] Database port 5432 is **not** exposed publicly (compose file already does this)
- [ ] Razorpay webhook secret is set; webhooks land on a public URL
- [ ] WhatsApp `WHATSAPP_APP_SECRET` is set (signature verification active)
- [ ] Daily DB backups configured
- [ ] Server firewall: only 80/443 open publicly (`ufw allow 80,443/tcp`)
- [ ] Run `npm audit` periodically; rebuild image to pull patched base image
- [ ] Set up uptime monitoring against `/health`
- [ ] Set up log aggregation (Datadog / Grafana Loki / CloudWatch / Logtail)

## 🧪 Smoke test after deploy

```bash
BASE=https://your-domain.com

# 1. Health
curl $BASE/health
curl $BASE/ready

# 2. Public storefront
curl $BASE/api/v1/public/stores

# 3. Owner login (after seeding)
curl -X POST $BASE/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+919999999999","password":"password123"}'
```

## 📈 Scaling

- **Vertical**: bump `DB_POOL_MAX`, container memory, PM2 instances.
- **Horizontal**: Compose to Kubernetes (or ECS) — the API is stateless; put a managed Postgres behind it. Stick `redis` in front for shared rate-limit counters if scaling > 1 replica:
  ```js
  // (future) replace memory store with `rate-limit-redis`
  ```
- **CDN**: put Cloudflare in front — caches `/shop`, `/admin`, static assets; protects from DDoS.

## 🆘 Troubleshooting

| Symptom | Fix |
|---|---|
| API container restarts repeatedly | `npm run docker:logs` — usually `JWT_SECRET` or `DB_PASSWORD` validation failed |
| 502 from nginx | `docker compose -f docker-compose.prod.yml ps` — is `api` healthy? Check `/ready` |
| CORS error in browser | Add the origin to `CORS_ORIGINS` in `.env.production` and restart `api` |
| Out of memory | Lower `NODE_OPTIONS=--max-old-space-size`; reduce `DB_POOL_MAX`; bump VPS RAM |
| Razorpay webhooks failing | Ensure raw body middleware is intact (it is by default) and `RAZORPAY_WEBHOOK_SECRET` matches dashboard |
