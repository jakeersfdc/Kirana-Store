# Kirana SaaS — Zero-Investment Production Launch

Go from this repo → live, public app users can buy from. **Cost: ₹0 to start.**

## 💰 Cost breakdown (all free tiers)

| Component | Provider | Free tier | Upgrade trigger |
|---|---|---|---|
| Hosting (API + UI) | **Render.com** OR **Fly.io** | 750 hrs/mo OR 3 small VMs forever | > 10k orders/mo → ₹600/mo |
| PostgreSQL DB | Render free / Neon free / Supabase free | 256 MB → 1 GB → 500 MB | > 100 stores → ₹500/mo |
| Domain | (optional) Freenom / .tk | Free | ₹800/yr for `.com` |
| HTTPS / TLS | Render & Fly auto | Included | — |
| WhatsApp messaging | **Meta Cloud API** | **1,000 conversations/mo free forever** | ~ ₹0.40/msg after |
| Payments | **Razorpay** | Zero setup, only 2% per ₹ | — |
| Source control + CI | GitHub + GitHub Actions | 2,000 min/mo | — |
| Monitoring | UptimeRobot | 50 monitors free | — |
| Email (alerts) | Resend free tier | 3,000/mo | — |
| **Total to launch** | | **₹0** | |

You only spend money once you have **paying customers**.

---

## 🚀 Launch path (≈ 30 min, no credit card needed)

### Step 1 — Push to GitHub (5 min)

```powershell
cd d:\Jakeer\E-Commerce
git init
git add .
git commit -m "Initial Kirana SaaS"
# Create empty repo on github.com first, then:
git remote add origin https://github.com/<you>/kirana-saas.git
git branch -M main
git push -u origin main
```

### Step 2 — Pick ONE host

#### Option A: **Render.com** (easiest — 1 click, no CLI)

1. Sign up at **https://render.com** with your GitHub account (no card)
2. Click **New +** → **Blueprint** → select your repo
3. Render reads [render.yaml](render.yaml) and creates:
   - `kirana-api` (free web service, Singapore region)
   - `kirana-db` (free Postgres, 256 MB, expires 90 days — migrate to Neon/Supabase before then)
4. After first deploy, paste your secrets in the dashboard:
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
   - `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`
5. Your URL: `https://kirana-api.onrender.com` ← share this with shop owners

> Free Render web services **sleep after 15 min idle** (~30 sec cold start). Use UptimeRobot below to keep it warm.

#### Option B: **Fly.io** (better — never sleeps, but needs CLI)

```powershell
# Install flyctl (Windows PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# Sign up (no CC for hobby plan)
fly auth signup

cd d:\Jakeer\E-Commerce\backend
fly launch --copy-config --no-deploy --name kirana-api --region sin
fly postgres create --name kirana-db --region sin --vm-size shared-cpu-1x --volume-size 1
fly postgres attach --app kirana-api kirana-db

# Strong secret (any 48+ char random string)
$jwt = [Convert]::ToBase64String((1..48 | %{[byte](Get-Random -Max 256)}))
fly secrets set JWT_SECRET=$jwt RUN_MIGRATIONS=true CORS_ORIGINS=*

fly deploy
fly open                  # opens https://kirana-api.fly.dev
```

### Step 3 — Seed your first store (1 min)

#### On Render
Render Shell tab → run: `node src/scripts/seed.js`

#### On Fly
```powershell
fly ssh console -C "node src/scripts/seed.js"
```

You now have:
- **Customer storefront**: `https://your-app.onrender.com/shop` (or `.fly.dev`)
- **Owner console**: `https://your-app.../admin` (login `+919999999999` / `password123`)

### Step 4 — Free uptime monitoring (2 min)

1. Sign up at **https://uptimerobot.com** (free)
2. Add HTTP(S) monitor → URL = `https://your-app.../health` → 5 min interval
3. This also keeps Render's free tier from sleeping ✓
4. Add your email/SMS for downtime alerts

### Step 5 — Free WhatsApp business API (15 min)

1. Go to **https://developers.facebook.com/apps**
2. Create App → Business → add **WhatsApp** product
3. From the dashboard, copy:
   - `Phone number ID` → `WHATSAPP_PHONE_NUMBER_ID`
   - Temporary access token → `WHATSAPP_ACCESS_TOKEN` (then generate a permanent System User token)
   - App Secret → `WHATSAPP_APP_SECRET`
4. Set verify token to anything (e.g. `kirana_verify_2026`) → `WHATSAPP_VERIFY_TOKEN`
5. Webhook URL: `https://your-app.../api/v1/whatsapp/webhook`
6. Subscribe to `messages` field
7. Add these env vars in Render/Fly dashboard, redeploy

You get **1,000 free customer-initiated conversations per month**, enough for ~30 stores.

### Step 6 — Free payments (10 min)

1. **https://dashboard.razorpay.com/signup** (no setup fee, 2% per transaction)
2. Settings → API Keys → Generate Test Keys → copy `key_id` + `secret`
3. Settings → Webhooks → add `https://your-app.../api/v1/payments/webhook` → copy webhook secret
4. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` in your host
5. Test mode works without KYC. For live mode, complete KYC (free, ~2 days)

### Step 7 — Custom domain (optional, ₹0–₹800/yr)

#### Free domain
- Get a free `.tk` / `.ml` domain at **https://www.freenom.com** (good for testing, not great for trust)

#### Paid (₹800/yr for `.com`)
- **Namecheap** / **Porkbun** / **Cloudflare Registrar** (cheapest)

Then in Render: Settings → Custom Domain → add `kirana.yourname.com` → CNAME to `your-app.onrender.com`. TLS auto-issued.

In Fly: `fly certs add kirana.yourname.com` → add the shown DNS records.

---

## 🤖 Auto-deploy (already set up)

Every push to `main` triggers:
- [ci.yml](.github/workflows/ci.yml) — lint, test, Docker build sanity check
- [deploy-fly.yml](.github/workflows/deploy-fly.yml) — auto-deploys to Fly.io if `FLY_API_TOKEN` secret is set

For Fly auto-deploy, run `fly auth token` and paste it as a GitHub secret named `FLY_API_TOKEN`.

For Render — auto-deploy on push is on by default (no setup needed).

---

## 📈 When you have customers — scale path (still cheap)

| Stage | Stores | Monthly cost | Setup |
|---|---|---|---|
| Today | 0–5 (testing) | **₹0** | This guide |
| Validation | 5–25 stores | **₹0** | Free tiers still fit |
| First revenue | 25–100 stores | **~₹600/mo** | Render Starter ($7) + Neon Pro ($19) OR Fly paid |
| Scale | 100–500 stores | **~₹2,500/mo** | Render Standard + Neon Scale + Cloudflare CDN |
| Big | 500+ stores | **~₹8,000/mo** | Move to AWS/GCP managed |

You bill stores ₹499/mo (Growth) or ₹1,499/mo (Premium) → break-even at **2 paying stores**.

---

## 🛡️ Security review (already production-grade)

- [x] Helmet CSP + HSTS, CORS allowlist
- [x] bcrypt password hashing, JWT auth
- [x] Separate strict rate limits on `/auth` (10/15min) and `/public` (60/min)
- [x] Multi-tenant isolation (storeId on every row + tenantGuard)
- [x] HMAC signature verification for WhatsApp + Razorpay webhooks
- [x] SQL injection-safe (Sequelize parameterized queries)
- [x] Fail-fast config validation in production (won't boot with weak `JWT_SECRET`)
- [x] Non-root Docker container
- [x] Graceful shutdown + crash-restart via PM2/Render/Fly
- [x] Request IDs for traceability
- [x] HTTPS everywhere (auto from host)

---

## 🆘 If something breaks

| Problem | Fix |
|---|---|
| Render shows "Application failed to respond" | Check Logs tab — usually `JWT_SECRET` too short (need 32+ chars) |
| Fly: `Smoke checks for ... failed` | `fly logs` — DB env vars not attached yet |
| Login returns 401 | DB not seeded → run `node src/scripts/seed.js` in shell |
| WhatsApp webhook says "Forbidden" | `WHATSAPP_APP_SECRET` mismatch — re-copy from Meta dashboard |
| Razorpay webhook fails | Raw body must be intact — already handled in code; just set `RAZORPAY_WEBHOOK_SECRET` |
| CORS error in browser | Set `CORS_ORIGINS=https://your-domain.com` instead of `*` |

---

## 🎯 Today's checklist

- [ ] Push to GitHub
- [ ] Deploy to Render OR Fly (15 min)
- [ ] Seed demo store (1 min)
- [ ] Open the customer URL on your phone — place a test order
- [ ] Open `/admin` on laptop — see the order arrive
- [ ] Add UptimeRobot (2 min)
- [ ] (Later) Connect WhatsApp + Razorpay when you have your first real shop

That's it. You now own a live, internet-accessible Kirana SaaS for ₹0/month.
