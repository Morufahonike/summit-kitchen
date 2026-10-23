# Summit Kitchen — admin portal (commit c8f6682)

Bundle: summit-kitchen-admin-portal.bundle
SHA-256: 0DE49273F26E59FBBF96D0597F7871B195E665CC19B07E2C775E9D364678090A
Size: 5,849,013 bytes · HEAD c8f6682ddc95de84813725e157ab521a03221aae
Includes every earlier update; replaces summit-kitchen-photos.bundle.

## Try it in your local preview (PowerShell, in Downloads\summit-kitchen-preview)
1. Get the update (the bundle file is already in this folder):
       git pull .\summit-kitchen-photos.bundle main          # only if you haven't applied the photo update yet
       git pull .\summit-kitchen-admin-portal.bundle main
2. Add the new key that encrypts admin authenticator secrets (run once; adds a line to .env):
       $k = node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
       Add-Content .env "TOTP_ENCRYPTION_KEY=`"$k`""
3. Update the database (adds new columns only; nothing existing is changed) and the Prisma client:
       npx.cmd prisma migrate deploy
       npx.cmd prisma generate
       npm.cmd run db:seed           # only if you skipped it after the photo update
4. Start the site:
       npm.cmd run dev
5. Open http://localhost:3000/admin/login and sign in with your preview admin
   (admin@summit.local / Preview-Summit-2026 unless you changed it).
   First time: scan the QR code with Google Authenticator, Microsoft Authenticator or Authy,
   enter the 6-digit code, and you're in.
6. Try Staff: Admin → Staff → add a Staff account, sign out, sign in as that person at
   /admin/login, and check that Reports, Payments, Customers and Staff are not available.

## What's new
- Admin sign-in page (/admin/login). Administrators confirm an authenticator code at every sign-in.
  Refunds, staff and customer changes ask for a fresh code if the last one is over 15 minutes old.
- Role-based access: one permission list checked on the server by every admin page, action and download.
  Staff: dashboard (no sales figures), orders (no refunds/export), products, categories, stock, delivery (view only).
  Administrator: everything.
- Staff page: add Staff/Administrator accounts, change roles, disable, sign out everywhere, reset an
  authenticator. The last active administrator can't be removed or disabled.
- Sales reports: sales, paid orders, average order value, items sold, delivery fees, change vs previous
  period; daily/weekly/monthly chart; top products; categories; states; payment outcomes; refunds;
  CSV downloads. Nigerian time. Test-mode figures until live payments are approved.
- Dashboard: 30-day sales chart (Administrators), orders by status. Lists now page 25 at a time;
  orders and payments filter by date; orders CSV for Administrators.
- Lost phone: another admin uses Staff → Reset authenticator, or run
  npm run admin:reset-2fa -- person@example.com on the server.

## Checks run here
- Unit tests 93/93 pass (permissions, authenticator codes vs the official RFC 4226/6238 test values,
  encryption, QR, paging, report maths, CSV safety, staff validation, an access check on every admin file)
- Database tests 36/36 pass (new columns, each code accepted once even with 8 simultaneous attempts, indexes)
- Strict type check of the core logic passes; QR codes decode with an independent reader
- All 45 pages render with no errors, broken images or sideways scrolling at 375 / 768 / 1280 px
- Fixed during checks: sidebar logo clipping; staff low-stock figure capped at 8; checkout pages
  treating an unverified admin as staff

## Not run yet (needs a full install: your preview, or GitHub after you push)
- Full TypeScript check of pages, lint, `next build`
- Real sign-in with an authenticator app, real database migration on your preview
- End-to-end browser tests (updated for the new sign-in, plus new Staff-restriction and report tests)
