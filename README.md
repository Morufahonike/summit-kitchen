# Summit Kitchen — e-commerce

Storefront and admin dashboard for **Summit Kitchen Services Limited (RC 9927529)**.
Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · PostgreSQL · Prisma · Paystack (TEST mode).

> **Status: pre-launch preview.** All products and prices are labelled **samples**. Delivery rates are
> **not configured**, so checkout is disabled until an admin adds delivery zones. Payments are **Paystack
> test mode only**; live payments are blocked in code until the owner approves them. See
> [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md).

## What's included

| Area | Features |
|---|---|
| Storefront | Branded home (hero, featured, bestsellers, categories), collections, catalogue with search, category/price/stock filters, sorting, pagination, product pages, about, delivery & returns placeholder |
| Cart & checkout | Server-side cart, quantity limits, live stock checks, totals recomputed on the server, delivery fee by state, order references (`SK-YYMMDD-XXXXXX`), stock reserved at order time and released if unpaid |
| Payments | Paystack hosted checkout (card: Mastercard / Visa / Verve), server-side verification, HMAC-SHA512 webhook verification, amount/currency/reference matching, idempotent confirmation, duplicate-webhook protection, live-key guard |
| Accounts | Register, sign in, sign out, password reset, change password, profile, saved addresses, order history, order tracking (account, private link, or reference + email lookup) |
| Admin | Dashboard, products (create/edit/archive), categories, stock adjustments with audit trail, orders (status workflow, tracking numbers), customers (roles, disable), payments & webhook log, delivery zones, activity log |
| Security | scrypt password hashing, hashed session tokens (httpOnly cookies), login lockout + rate limits, role checks in every admin action, no open redirects, guarded order access, CSP and security headers, DB check constraints, no card data stored |

## Screenshots

Rendered from the real page components with the sample catalogue (fonts shown are fallbacks; Playfair
Display and Montserrat load in a real build). More in [`docs/screenshots`](docs/screenshots).

![Overview of storefront and admin pages](docs/screenshots/overview.png)

## Requirements

- Node.js 22.18+ (TypeScript scripts run with `node --experimental-strip-types`)
- PostgreSQL 14+

## Setup

**On Windows, follow [`docs/SETUP-WINDOWS.md`](docs/SETUP-WINDOWS.md)** (PowerShell commands, including how to
push the transfer bundle to GitHub). On macOS / Linux:

```bash
npm install
cp .env.example .env              # fill in DATABASE_URL, APP_URL, CRON_SECRET, Paystack TEST keys
npx prisma migrate deploy         # apply migrations
npx prisma generate
npm run db:seed                   # labelled SAMPLE catalogue (no delivery zones, no users)
npm run admin:create              # reads ADMIN_EMAIL / ADMIN_PASSWORD from .env (14+ chars); then remove ADMIN_PASSWORD
npm run dev
```

Then sign in at `/account/login` with the admin account and go to **Admin → Delivery** to add delivery
zones once real rates are confirmed. Checkout stays disabled until at least one zone exists.

> The initial migration was written by hand because the Prisma CLI couldn't be installed in the build
> environment. It has been applied and tested on PostgreSQL 16. On first setup, run
> `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <empty-db-url>`
> to confirm there's no drift (expected output: empty).

## Paystack (test mode)

1. In the Paystack dashboard, stay in **Test Mode** and copy the `sk_test_…` / `pk_test_…` keys into `.env`.
2. Set the webhook URL to `https://<your-domain>/api/paystack/webhook` (for local testing use a tunnel).
3. Pay with Paystack's published test cards.

How payment is confirmed: the browser returns to `/checkout/callback`, **and** Paystack calls the webhook.
Both paths call the same idempotent `confirmPayment()`, which re-verifies the transaction with Paystack's
API and checks the reference, amount (kobo) and currency against the stored payment before marking the
order paid. Whichever arrives first wins; the other is a no-op.

**Live payments** require *both* a `sk_live_…` key *and* `PAYSTACK_ALLOW_LIVE="true"`. Without the flag,
the app refuses to start payments. Only set it after the business owner has approved going live.

## Scheduled cleanup

Unpaid orders hold stock for `RESERVATION_MINUTES` (default 30). Expired holds are released automatically
when checkout runs and when an admin opens the dashboard. For a backstop, call every 10–15 minutes:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/release-reservations
```

## Testing

```bash
npm run test:unit                                       # 48 unit tests, no dependencies needed
TEST_DB_ADMIN_URL=postgresql:///postgres npm run test:db  # 19 PostgreSQL integrity & concurrency tests
npm run typecheck && npm run lint
npx playwright install && npm run build && npm run test:e2e   # mobile / tablet / desktop
```

- **Unit** (`tests/unit`): money, validation, pricing, passwords, references, Paystack signatures and
  verification rules, order access, order transitions, catalogue parameters, admin forms, open-redirect guard,
  sample-catalogue integrity.
- **Database** (`tests/db/run.sh`): runs the real migration on a throwaway database, then proves 12 concurrent
  buyers for 5 units sell exactly 5, constraints reject negative stock / bad totals / duplicate payments /
  replayed webhooks, payment confirmation transitions once under concurrency, and the rate limiter counts atomically.
- **End-to-end** (`tests/e2e`): storefront flows, responsive overflow checks, admin access control, webhook
  signature rejection, security headers.

## Project layout

```
prisma/                schema, migrations, sample-data.ts (labelled samples), seed.ts
src/lib/core/          framework-free business logic (unit-tested): money, pricing, validation, crypto,
                       paystack, orders, catalogue, access, admin validation
src/lib/server/        server-only: db, sessions, cart, checkout, inventory, payments, rate limit, audit, mail
src/app/(store)/       storefront, cart, checkout, accounts, order tracking
src/app/admin/         admin dashboard (STAFF / ADMIN roles)
src/app/api/           Paystack webhook, reservation cleanup
tests/                 unit, db, e2e
docs/LAUNCH_CHECKLIST.md
```

## Roles

- **CUSTOMER** — storefront and own account.
- **STAFF** — orders, products, categories, stock.
- **ADMIN** — everything, plus customers/roles, delivery zones, archiving products, marking refunds.

## Secrets

Never commit `.env`. It's ignored by `.gitignore`. Card details are entered only on Paystack's hosted page;
the database stores only Paystack's reference, card brand and last four digits.
