# Subscription Management API

End-to-end subscription management with **Frontend APIs** (JWT) and **SDK APIs** (API key). SQLite backend.

---

## Example credentials (seed data)

Use these after running `npm run setup`:

| Role     | Email                 | Password   | Notes                          |
|----------|-----------------------|------------|---------------------------------|
| **Admin**   | `admin@example.com`     | `admin123` | Full dashboard, approve/assign/deactivate |
| **Customer** | `customer@example.com` | `customer123` | Has one active subscription; can request more |

**Subscription pack SKUs** (for requesting subscriptions as a customer):

| SKU             | Description  |
|-----------------|--------------|
| `SKU-BASIC-1M`  | Basic, 1 month |
| `SKU-PRO-3M`    | Pro, 3 months  |
| `SKU-PREMIUM-12M` | Premium, 12 months |

---

## Quick start (localhost)

### Step 1. Install dependencies

```bash
npm install
```

### Step 2. Initialize database and seed data

```bash
npm run setup
```

This creates `data/subscriptions.db`, applies the schema, and seeds the admin/customer accounts and subscription packs above.

### Step 3. Start the server

```bash
npm start
```

Server runs at **http://localhost:8080**.

### Step 4. Open the app

In your browser go to: **http://localhost:8080**

---

## Step-by-step: Using the app

### As a customer

1. **Open** http://localhost:8080.
2. On the home screen, click **Customer Login**.
3. **Log in** with:
   - **Email:** `customer@example.com`
   - **Password:** `customer123`
4. **Dashboard:** You’ll see:
   - Your **profile** (name, email).
   - Your **current subscription** (plan, status, expiry if set).
   - A **Request subscription** form.
5. **Request a new plan:** In “Pack SKU” enter one of:
   - `SKU-BASIC-1M`
   - `SKU-PRO-3M`
   - `SKU-PREMIUM-12M`  
   Click **Request**. The subscription appears as **requested** until an admin approves and assigns it.
6. **Log out** via **Logout** in the top bar.

### As an admin

1. **Open** http://localhost:8080.
2. On the home screen, click **Admin Login**.
3. **Log in** with:
   - **Email:** `admin@example.com`
   - **Password:** `admin123`
4. **Dashboard:** You’ll see:
   - **Subscription Packs** (name, SKU, price, validity).
   - **Subscriptions** list (ID, status, customer, pack).
5. **Manage subscriptions:**
   - **Requested** → click **Approve** to move to approved.
   - **Approved** → click **Assign** to activate (sets start/end dates).
   - **Active** → click **Deactivate** to make it inactive.
6. **Log out** via **Logout** in the top bar.

### Sign up (new customer)

1. On the home screen, click **Customer Sign Up**.
2. Enter **name**, **email**, and **password**.
3. Click **Continue**. You’re logged in as a new customer with no subscription; use **Request subscription** to add one by SKU (e.g. `SKU-BASIC-1M`).

---

## API overview

| Area | Auth | Base path | Purpose |
|------|------|-----------|---------|
| Frontend auth | None | `POST /api/customer/login`, `/api/admin/login`, `/api/customer/signup` | Get JWT |
| Frontend app | JWT `Authorization: Bearer <token>` | `/api/v1/customer/*`, `/api/v1/admin/*` | Dashboard & management |
| SDK auth | None | `POST /sdk/auth/login` | Get API key |
| SDK app | `X-API-Key: <key>` | `/sdk/v1/subscription` | Current subscription |

## Example requests

```bash
# Customer login (get JWT)
curl -X POST http://localhost:8080/api/customer/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"customer@example.com\",\"password\":\"customer123\"}"

# Get subscription (use token from login)
curl -X GET http://localhost:8080/api/v1/customer/subscription \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# SDK login (get API key)
curl -X POST http://localhost:8080/sdk/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"customer@example.com\",\"password\":\"customer123\"}"

# SDK get subscription (use api_key from login)
curl -X GET http://localhost:8080/sdk/v1/subscription \
  -H "X-API-Key: sk-sdk-XXXXXXXX"
```

## Scripts

- `npm start` – run server
- `npm run dev` – run with watch
- `npm run init-db` – create DB and schema only
- `npm run seed` – seed data only (requires existing DB)
- `npm run setup` – init DB + seed

## OpenAPI

See **openapi.yaml** for the full API contract (Swagger/Postman import).

## Data

- Database file: `data/subscriptions.db` (SQLite).
- Tables: `users`, `customers`, `subscription_packs`, `subscriptions`, `api_keys`.
- Subscription status flow: `requested` → `approved` → `active` → `inactive` / `expired`.
