# 🛒 Kirana SaaS – Backend

Production-grade multi-tenant SaaS backend for kirana (Indian neighborhood) stores.
Built with **Node.js 20 + Express + PostgreSQL + Sequelize**.

Every request is **tenant-isolated** by `storeId` derived from the authenticated JWT — no store can ever see another store's data.

---

## ✨ Features

| Module | Highlights |
|---|---|
| Auth | JWT, bcrypt, register-store-with-owner, role-based (OWNER / MANAGER / STAFF / DELIVERY) |
| Multi-tenant | Every table carries `storeId`, `tenantGuard` middleware blocks cross-tenant access |
| Products & Inventory | CRUD, low-stock alerts, locked-row stock adjustments, full audit trail (`InventoryMovement`) |
| Customers | Credit balance, credit limit, settle udhaar |
| Orders | Atomic multi-item orders, auto stock decrement, delivery charge, totals, status state machine (`NEW → ACCEPTED → PACKED → OUT_FOR_DELIVERY → DELIVERED`), stock restoration on cancel, credit reversal |
| Delivery | Assign delivery boy, status tracking (`ASSIGNED → PICKED → DELIVERED`), delivery charge sync |
| Payments | Razorpay order creation + signature verification + order status update |
| WhatsApp | Cloud API send, webhook verify + signature check, **natural-language parser** (`"1kg rice, 2 milk"` → order), order/status/payment-reminder templates |
| Insights | Top products, low-stock, customer frequency, reorder suggestions, dashboard, ML/Einstein export snapshot |
| Subscription | BASIC / GROWTH / PREMIUM plans, 14-day trial, feature gates (`requireFeature`), per-plan quotas |
| DevOps | Helmet, CORS, compression, rate-limit, Winston logs, Dockerfile, docker-compose with Postgres |

---

## 🚀 Quick start

```bash
cd backend
cp .env.example .env          # fill in secrets
npm install
npm run migrate               # create tables
npm run seed                  # demo store + products (login: +919999999999 / password123)
npm run dev
```

Or with Docker:

```bash
docker compose up --build
```

API base URL: `http://localhost:4000/api/v1`

---

## 🔑 Auth flow

```http
POST /api/v1/auth/register
{ "storeName":"Ravi Kirana", "ownerName":"Ravi", "phone":"+919876543210", "password":"secret123" }

POST /api/v1/auth/login
{ "phone":"+919876543210", "password":"secret123" }
# → returns { token, user, store }

GET /api/v1/auth/me        Authorization: Bearer <token>
```

All further endpoints require `Authorization: Bearer <token>`.

---

## 📚 API map

| Area | Endpoint |
|---|---|
| Products | `GET/POST /products`, `PATCH/DELETE /products/:id`, `POST /products/:id/adjust`, `GET /products/low-stock` |
| Customers | `GET/POST /customers`, `PATCH /customers/:id`, `POST /customers/:id/settle` |
| Orders | `GET/POST /orders`, `GET /orders/:id`, `PATCH /orders/:id/status` |
| Delivery | `GET /deliveries`, `POST /deliveries/orders/:orderId/assign`, `PATCH /deliveries/:id/status` |
| Payments | `POST /payments/razorpay/order`, `POST /payments/razorpay/verify` |
| WhatsApp | `GET/POST /whatsapp/webhook` (public), `POST /whatsapp/send`, `POST /whatsapp/reminders/payment` |
| Insights | `GET /insights/dashboard`, `/top-products`, `/low-stock`, `/customer-frequency`, `/reorder-list`, `/sales-summary`, `/export` |
| Subscription | `GET /subscription/plans`, `GET /subscription/me`, `POST /subscription/upgrade`, `POST /subscription/activate` |

---

## 🧠 WhatsApp natural-language orders

Configure `WHATSAPP_*` env vars and point Meta's webhook at `https://<host>/api/v1/whatsapp/webhook`.
A customer texting:

```
1kg rice, 2 milk, 500g sugar
```

…is matched against the store's catalogue and a `CREDIT` (udhaar) order is created automatically, then confirmed back over WhatsApp.

---

## 💳 Razorpay flow

1. Client calls `POST /payments/razorpay/order` with `orderId`.
2. Backend creates a Razorpay order and returns `{ keyId, razorpayOrderId, amount }`.
3. Client opens Razorpay checkout with these params.
4. On success, client posts `razorpay_order_id / payment_id / signature` to `POST /payments/razorpay/verify`.
5. Backend validates the HMAC-SHA256 signature, marks `Payment.status=PAID` and the linked `Order.paymentStatus=PAID`.

---

## 🏢 Salesforce / AI integration hook

`GET /api/v1/insights/export` returns a structured snapshot suitable for:

- Pushing to Salesforce via a scheduled Apex/Platform Event job
- Feeding an Einstein Prediction Builder model for reorder forecasting
- Training a credit-risk ML model using `customerFrequency` + credit balance

---

## 🗺️ Build order (recommended)

1. Auth + Store setup
2. Products + Inventory
3. Orders
4. WhatsApp
5. Delivery
6. Payments
7. Analytics + AI

---

## 📱 Clients (not in this folder)

- **Owner app** (React Native): Login → Dashboard (today sales, orders count) → Orders (filter by status, accept/reject/mark delivered) → Inventory → Customers. Use Redux Toolkit + Axios; point to this API.
- **Customer ordering** (React / React Native): Category view → cart → checkout (pickup/delivery, COD/UPI) → confirmation; “repeat last order” reuses `GET /orders?customerId=...`.

These can be generated separately with `npx react-native init` or Vite+React, using the endpoints above.

---

## 🚢 Deployment

- Dockerize: `docker compose up --build`
- Deploy options: **Render**, **Railway**, **AWS ECS/Fargate**, **Fly.io**
- Always set `NODE_ENV=production`, a strong `JWT_SECRET`, and `DB_SSL=true` on managed Postgres.
