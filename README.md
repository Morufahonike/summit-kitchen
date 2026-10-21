# Summit Kitchen — e-commerce

Storefront and admin for **Summit Kitchen Services Limited**: manufacturing, processing, repairing and trading in kitchen appliances and products.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL · Prisma 6

> **Status: development build.** The catalogue is **sample data** (every product has `isSample = true` and shows a "Sample" badge). No supplier is integrated. Payments use a local **simulator** or Paystack **test** keys; live keys are refused unless `ALLOW_LIVE_PAYMENTS=true`.

## Features

- **Storefront:** homepage, collections, search, filters (category, price in the selected currency, material, stock), sorting, product pages, cart, checkout
- **Currency:** USD by default with a USD/NGN switch. Prices are stored in USD cents and converted with a cached USD→NGN rate (live feed → stored rate → env fallback; admins can set a manual override). The rate is locked into each order.
- **Accounts:** register, sign in and out, order history, saved address, password change. Sessions use bcrypt hashes and httpOnly cookies, and only token hashes are stored in the database.
- **Order tracking:** customers look up an order with its number and email; registered customers also see their order timeline.
- **Admin** (`/admin`, ADMIN role only):
  - dashboard
  - orders: filter, status workflow, tracking numbers, internal notes, payment re-verification
  - products: create and edit
  - inventory: stock adjustments with an audit trail, held stock
  - customers and roles
  - settings: exchange rate, payment status, activity log
- **Payments (Paystack):**
  - Paystack's hosted checkout handles the card; card data never touches this server.
  - The server verifies each payment through the Transactions API.
  - Webhooks are checked with a timing-safe HMAC-SHA512 signature.
  - Duplicate webhooks are idempotent.
  - Amount and currency mismatches put the order on hold (`NEEDS_REVIEW`).
  - Stock is reserved atomically and released exactly once when a payment fails or an order expires.

## Local setup

Requires Node.js 20.9+ and PostgreSQL 14+.

```bash
# 1. database (example — any local Postgres works)
createuser summit --pwprompt --createdb
createdb summit_kitchen -O summit

# 2. config
cp .env.example .env
#    - DATABASE_URL: your local connection string
#    - PAYSTACK_SECRET_KEY: any random string starting sk_test_ while PAYMENT_PROVIDER=mock
#    - SEED_ADMIN_PASSWORD: a real password, 12+ characters

# 3. install, create schema, seed
npm install
npx prisma migrate dev --name init     # creates prisma/migrations/… — commit this folder
npm run db:seed                        # 7 categories, 29 SAMPLE products, first admin

# 4. run
npm run dev                            # http://localhost:3000  (admin: /admin)
```

Regenerate the placeholder illustrations with `npx tsx scripts/gen-sample-art.ts`.

## Tests

```bash
npm run typecheck        # TypeScript
npm test                 # unit tests: money, shipping, webhook signatures, payment guards
npx playwright install chromium
npm run dev              # in a second terminal, with PAYMENT_PROVIDER=mock
npm run test:e2e         # ~60 browser checks: payments, security, access control, responsive layouts
```

`test:e2e` writes screenshots to `screenshots/`. It changes data (orders, stock, a manual exchange rate it later removes), so run it against a development database only — `npm run db:reset` restores a clean seeded state.

## Payment modes

| `PAYMENT_PROVIDER` | Behaviour |
|---|---|
| `mock` (default) | Opens `/dev/paystack/<ref>`, a local simulator. From there you can test a success, a declined card, 3× duplicate webhooks, an underpayment, or an abandoned payment. Its webhooks are signed exactly like Paystack's. Disabled in production. |
| `paystack` | Real Paystack API. Use `sk_test_…` keys. Set the dashboard webhook URL to `APP_URL/api/paystack/webhook`. |

`PAYSTACK_USD_ENABLED=true` should be set only after Paystack enables USD for the business. Until then, a shopper browsing in USD is charged the NGN equivalent, and checkout tells them so.

## Security notes

- Secrets live only in `.env` and the hosting provider's variables. `.env*` is git-ignored.
- Security headers include CSP, frame-ancestors none, nosniff, a referrer policy and HSTS (HSTS in production).
- Server actions are origin-checked by Next.js. Every admin page and action re-checks the ADMIN role server-side.
- Sign-in, registration, checkout, tracking and cart quotes are rate-limited in memory (single instance only; use Redis if scaled out).
- Order tracking returns the same error for a wrong number or a wrong email, so it doesn't reveal which orders exist.
- Guest orders are not attached to new accounts by email, because email verification isn't implemented yet.

## Supplier integration (not started)

`Product.supplier` / `Product.supplierSku` are reserved for a future feed (e.g. BigBuy). **Do not integrate until the owner approves.**
