// End-to-end tests against a running server (PAYMENT_PROVIDER=mock).
// Usage: BASE=http://localhost:3000 node scripts/e2e.mjs   (reads DATABASE_URL, PAYSTACK_SECRET_KEY, SEED_ADMIN_* from .env)
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";

let chromium;
try { ({ chromium } = await import("playwright")); } catch { ({ chromium } = await import("/home/claude/.npm-global/lib/node_modules/playwright/index.mjs")); }

const env = Object.fromEntries(
  readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }),
);
const BASE = process.env.BASE ?? "http://localhost:3000";
const DB = env.DATABASE_URL.split("?")[0];
const SECRET = env.PAYSTACK_SECRET_KEY;
const SHOTS = process.env.SHOTS ?? "screenshots";
mkdirSync(SHOTS, { recursive: true });

const sql = (q) => execFileSync("psql", [DB, "-tAc", q]).toString().trim();
const results = [];
const check = (name, pass, detail = "") => { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`); };
const stockOf = (slug) => Number(sql(`select stock from "Product" where slug='${slug}'`));
const orderByRef = (ref) => sql(`select o.status||'|'||p.status||'|'||o.total||'|'||o.currency||'|'||o.number from "Payment" p join "Order" o on o.id=p."orderId" where p.reference='${ref}'`).split("|");
const sign = (body) => createHmac("sha512", SECRET).update(body).digest("hex");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on("dialog", (d) => { check("no unexpected JS dialog (XSS)", false, d.message()); d.dismiss(); });

async function setCurrency(p, c) {
  await ctx.addCookies([{ name: "sk_currency", value: c, url: BASE }]);
}
async function setCart(p, items) {
  await p.goto(BASE + "/cart");
  await p.evaluate((it) => localStorage.setItem("sk_cart_v1", JSON.stringify(it)), items);
}
async function productId(slug) { return sql(`select id from "Product" where slug='${slug}'`); }

/** fills checkout and returns the simulator reference */
async function checkout(p, { email = "shopper@example.com", country = "NG" } = {}) {
  await p.goto(BASE + "/checkout");
  await p.waitForSelector("#co-email");
  if (!(await p.locator("#co-email").getAttribute("readonly"))) await p.fill("#co-email", email);
  await p.fill("#co-fullName", "Ada Test");
  await p.fill("#co-phone", "+234 801 234 5678");
  await p.fill("#co-line1", "12 Admiralty Way");
  await p.fill("#co-city", "Lagos");
  await p.fill("#co-state", "Lagos");
  await p.selectOption("#co-country", country);
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: /pay securely/i }).click();
  await p.waitForURL(/\/dev\/paystack\//, { timeout: 20000 }).catch(() => {});
  const m = p.url().match(/\/dev\/paystack\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
async function pay(p, outcome) {
  await p.locator(`button[value="${outcome}"]`).click();
  await p.waitForURL(/\/checkout\/complete/, { timeout: 20000 });
  await p.waitForLoadState("networkidle");
}

try {
  // ---------------------------------------------------------------- basics & headers
  const res = await fetch(BASE + "/");
  check("homepage returns 200", res.status === 200, String(res.status));
  check("CSP header present", !!res.headers.get("content-security-policy"));
  check("X-Frame-Options DENY", res.headers.get("x-frame-options") === "DENY");
  check("X-Powered-By hidden", !res.headers.get("x-powered-by"));

  await page.goto(BASE + "/");
  check("hero headline renders", await page.getByRole("heading", { name: /Elevate Your/ }).isVisible());
  check("sample badges shown", (await page.getByText("Sample", { exact: true }).count()) > 0);

  // ---------------------------------------------------------------- search & filters
  await page.goto(BASE + "/shop?q=knife");
  const knifeCount = await page.locator("article").count();
  check("search 'knife' returns products", knifeCount >= 2, `${knifeCount} results`);
  await page.goto(BASE + "/shop?q=" + encodeURIComponent(`<script>alert(1)</script>' OR 1=1--`));
  check("hostile search string handled safely", (await page.getByText(/No products match/).count()) === 1);
  await page.goto(BASE + "/shop?category=cookware&max=100");
  const prices = await page.locator("article p span.font-semibold").allTextContents();
  const nums = prices.map((t) => Number(t.replace(/[^0-9.]/g, "")));
  check("category + max price filter", nums.length > 0 && nums.every((n) => n <= 100), prices.join(", "));
  await page.goto(BASE + "/shop?inStock=1");
  check("in-stock filter hides sold-out", (await page.getByText("Sold out").count()) === 0);

  // ---------------------------------------------------------------- currency
  await setCurrency(page, "NGN");
  await page.goto(BASE + "/product/summit-chefs-knife-20cm");
  const ngnPrice = await page.locator("span.text-2xl").first().textContent();
  check("NGN prices shown after switch", ngnPrice?.startsWith("₦"), ngnPrice);
  await setCurrency(page, "USD");
  await page.goto(BASE + "/product/summit-chefs-knife-20cm");
  const usdPrice = await page.locator("span.text-2xl").first().textContent();
  check("USD is default/restorable", usdPrice === "$119.00", usdPrice);

  // ---------------------------------------------------------------- payment: success (USD browse -> NGN charge)
  const slug = "olive-wood-spoon-set";
  const pid = await productId(slug);
  let before = stockOf(slug);
  await setCart(page, [{ productId: pid, quantity: 2 }]);
  let ref = await checkout(page);
  check("checkout redirects to payment page", !!ref, ref ?? page.url());
  check("stock reserved on order creation", stockOf(slug) === before - 2, `${before} -> ${stockOf(slug)}`);
  let [ostatus, pstatus, total, cur] = orderByRef(ref);
  const rate = Number(sql(`select "exchangeRate" from "Order" o join "Payment" p on p."orderId"=o.id where p.reference='${ref}'`));
  check("USD shopper charged in NGN while USD disabled", cur === "NGN", `${total} ${cur} @ ${rate}`);
  await pay(page, "success");
  [ostatus, pstatus] = orderByRef(ref);
  check("successful payment => order PAID", ostatus === "PAID" && pstatus === "SUCCESS", `${ostatus}/${pstatus}`);
  check("success page shown", await page.getByText(/Thank you for your order/).isVisible());
  check("cart cleared after payment", (await page.evaluate(() => localStorage.getItem("sk_cart_v1"))) === "[]");
  check("stock stays decremented after payment", stockOf(slug) === before - 2);
  const paidRef = ref;

  // replay the same webhook with a valid signature
  const replayBody = JSON.stringify({ event: "charge.success", data: { id: 999001, reference: paidRef, status: "success", amount: Number(total), currency: "NGN" } });
  let r = await fetch(BASE + "/api/paystack/webhook", { method: "POST", headers: { "x-paystack-signature": sign(replayBody), "content-type": "application/json" }, body: replayBody });
  const rj = await r.json();
  check("replayed webhook acknowledged without reprocessing", r.status === 200 && ["already_processed"].includes(rj.outcome), JSON.stringify(rj));
  check("stock unchanged by replay", stockOf(slug) === before - 2);

  // ---------------------------------------------------------------- forged signature
  r = await fetch(BASE + "/api/paystack/webhook", { method: "POST", headers: { "x-paystack-signature": "0".repeat(128), "content-type": "application/json" }, body: replayBody });
  check("webhook with bad signature rejected (401)", r.status === 401, String(r.status));
  r = await fetch(BASE + "/api/paystack/webhook", { method: "POST", headers: { "content-type": "application/json" }, body: replayBody });
  check("webhook without signature rejected (401)", r.status === 401, String(r.status));

  // ---------------------------------------------------------------- failed payment
  before = stockOf(slug);
  await setCart(page, [{ productId: pid, quantity: 1 }]);
  ref = await checkout(page);
  await pay(page, "failed");
  [ostatus, pstatus] = orderByRef(ref);
  check("declined card => PAYMENT_FAILED", ostatus === "PAYMENT_FAILED" && pstatus === "FAILED", `${ostatus}/${pstatus}`);
  check("stock released after failure", stockOf(slug) === before, `${before} -> ${stockOf(slug)}`);
  check("failure page offers retry", await page.getByText(/Payment not completed/).isVisible());
  check("cart kept after failure", (await page.evaluate(() => localStorage.getItem("sk_cart_v1"))) !== "[]");

  // ---------------------------------------------------------------- abandoned
  before = stockOf(slug);
  ref = await checkout(page);
  await pay(page, "abandoned");
  [ostatus, pstatus] = orderByRef(ref);
  check("abandoned => not paid, stock released", ostatus === "PAYMENT_FAILED" && pstatus === "ABANDONED" && stockOf(slug) === before, `${ostatus}/${pstatus}`);

  // ---------------------------------------------------------------- duplicate webhooks (3 concurrent)
  before = stockOf(slug);
  ref = await checkout(page);
  await pay(page, "duplicate");
  await page.waitForTimeout(500);
  [ostatus, pstatus] = orderByRef(ref);
  const evts = Number(sql(`select count(*) from "WebhookEvent" where reference='${ref}'`));
  const paidEvents = Number(sql(`select count(*) from "OrderEvent" e join "Payment" p on p."orderId"=e."orderId" where p.reference='${ref}' and e.status='PAID'`));
  check("3 duplicate webhooks => single PAID transition", ostatus === "PAID" && paidEvents === 1, `status ${ostatus}, PAID events ${paidEvents}, webhook rows ${evts}`);
  check("duplicate webhooks recorded once", evts === 1, `rows=${evts}`);
  check("stock decremented exactly once", stockOf(slug) === before - 1, `${before} -> ${stockOf(slug)}`);

  // ---------------------------------------------------------------- wrong amount
  ref = await checkout(page);
  await pay(page, "wrong-amount");
  [ostatus, pstatus] = orderByRef(ref);
  check("underpayment => NEEDS_REVIEW, payment MISMATCH", ostatus === "NEEDS_REVIEW" && pstatus === "MISMATCH", `${ostatus}/${pstatus}`);
  check("customer told order is under review", await page.getByText(/checking your payment/).isVisible());

  // ---------------------------------------------------------------- signed webhook for unpaid order (payload lies)
  ref = await checkout(page);
  const [, , liarTotal] = orderByRef(ref);
  const liar = JSON.stringify({ event: "charge.success", data: { id: 999002, reference: ref, status: "success", amount: Number(liarTotal), currency: "NGN" } });
  r = await fetch(BASE + "/api/paystack/webhook", { method: "POST", headers: { "x-paystack-signature": sign(liar), "content-type": "application/json" }, body: liar });
  [ostatus] = orderByRef(ref);
  check("webhook payload not trusted without provider verification", ostatus === "PENDING_PAYMENT", `${ostatus} (http ${r.status})`);
  await page.goto(BASE + `/dev/paystack/${encodeURIComponent(ref)}`);
  await pay(page, "abandoned");

  // ---------------------------------------------------------------- oversell
  const trivet = await productId("cast-iron-trivet-gold");
  const trivetStock = stockOf("cast-iron-trivet-gold");
  await setCart(page, [{ productId: trivet, quantity: trivetStock + 2 }]);
  await page.goto(BASE + "/checkout");
  await page.waitForSelector("#co-email");
  await page.fill("#co-email", "shopper@example.com");
  await page.fill("#co-fullName", "Ada Test"); await page.fill("#co-phone", "+2348012345678");
  await page.fill("#co-line1", "1 Test St"); await page.fill("#co-city", "Lagos"); await page.fill("#co-state", "Lagos");
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /pay securely/i }).click();
  await page.waitForTimeout(2000);
  check("cannot order more than stock", /Not enough stock/.test(await page.content()) && stockOf("cast-iron-trivet-gold") === trivetStock);

  // ---------------------------------------------------------------- international USD browse
  await setCart(page, [{ productId: pid, quantity: 1 }]);
  ref = await checkout(page, { country: "GB" });
  [ostatus, , total, cur] = orderByRef(ref);
  check("international order created with courier shipping", !!ref && ostatus === "PENDING_PAYMENT", `${total} ${cur}`);
  await pay(page, "abandoned");

  // ---------------------------------------------------------------- tracking
  const [, , , , paidNumber] = orderByRef(paidRef);
  await page.goto(BASE + "/track");
  await page.fill("#t-order", paidNumber); await page.fill("#t-email", "shopper@example.com");
  await page.getByRole("button", { name: "Track" }).click();
  await page.waitForTimeout(800);
  check("order tracking finds order", await page.getByText("Payment confirmed").first().isVisible());
  await page.fill("#t-email", "someone@else.com");
  await page.getByRole("button", { name: "Track" }).click();
  await page.waitForTimeout(800);
  check("tracking with wrong email reveals nothing", await page.getByText(/couldn't find an order/).isVisible());

  // ---------------------------------------------------------------- accounts & access control
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  await ap.goto(BASE + "/admin");
  check("anonymous /admin redirected to sign-in", ap.url().includes("/account/login"));
  const custEmail = `cust${Date.now()}@example.com`;
  await ap.goto(BASE + "/account/register");
  await ap.fill("#a-name", "Test Customer"); await ap.fill("#a-email", custEmail); await ap.fill("#a-pw", "short");
  await ap.getByRole("button", { name: /create account/i }).click();
  await ap.waitForTimeout(800);
  check("weak password rejected", await ap.getByText(/at least 10 characters/i).isVisible());
  await ap.fill("#a-pw", "CorrectHorse42battery");
  await ap.getByRole("button", { name: /create account/i }).click();
  await ap.waitForURL(/\/account$/, { timeout: 10000 }).catch(() => {});
  check("customer can register and is signed in", ap.url().endsWith("/account"), ap.url());
  const cookies = await anon.cookies();
  const sess = cookies.find((c) => c.name === "sk_session");
  check("session cookie is httpOnly + SameSite=Lax", sess?.httpOnly && sess?.sameSite === "Lax");
  check("raw session token not stored in DB", Number(sql(`select count(*) from "Session" where "tokenHash"='${sess?.value}'`)) === 0);
  await ap.goto(BASE + "/admin");
  check("customer cannot open admin", !ap.url().includes("/admin"), ap.url());
  const res404 = await ap.goto(BASE + `/account/orders/${paidNumber}`);
  check("customer cannot view another customer's order", res404?.status() === 404, String(res404?.status()));
  await anon.close();

  const bad = await browser.newContext(); const bp = await bad.newPage();
  await bp.goto(BASE + "/account/login");
  for (let i = 0; i < 6; i++) {
    await bp.fill("#a-email", "nobody-ratelimit@example.com"); await bp.fill("#a-pw", "wrong-password-" + i);
    await bp.getByRole("button", { name: /sign in/i }).click(); await bp.waitForTimeout(500);
  }
  check("login brute-force rate limited", await bp.getByText(/Too many sign-in attempts/).isVisible());
  await bad.close();

  const adm = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const a = await adm.newPage();
  await a.goto(BASE + "/account/login?next=/admin");
  await a.fill("#a-email", env.SEED_ADMIN_EMAIL); await a.fill("#a-pw", env.SEED_ADMIN_PASSWORD);
  await a.getByRole("button", { name: /sign in/i }).click();
  await a.waitForURL(/\/admin/, { timeout: 10000 }).catch(() => {});
  check("admin can sign in", a.url().includes("/admin"), a.url());
  for (const path of ["/admin", "/admin/orders", "/admin/products", "/admin/inventory", "/admin/customers", "/admin/settings"]) {
    const rr = await a.goto(BASE + path);
    check(`admin page ${path} loads`, rr?.status() === 200, String(rr?.status()));
  }
  // admin ships the paid order
  const paidId = sql(`select id from "Order" where number='${paidNumber}'`);
  await a.goto(BASE + `/admin/orders/${paidId}`);
  await a.selectOption('select[name="status"]', "PROCESSING");
  await a.getByRole("button", { name: "Update order" }).click(); await a.waitForTimeout(1200);
  await a.goto(BASE + `/admin/orders/${paidId}`);
  await a.selectOption('select[name="status"]', "SHIPPED");
  await a.getByRole("button", { name: "Update order" }).click(); await a.waitForTimeout(1000);
  check("cannot ship without tracking number", await a.getByText(/Add a tracking number/).isVisible());
  await a.fill('input[name="trackingNumber"]', "GIG123456");
  await a.fill('input[name="trackingCarrier"]', "GIG Logistics");
  await a.getByRole("button", { name: "Update order" }).click(); await a.waitForTimeout(1200);
  check("admin order workflow PAID→PROCESSING→SHIPPED", sql(`select status from "Order" where id='${paidId}'`) === "SHIPPED");
  // admin stock adjust
  const ad = await productId("paring-knife-9cm");
  await a.goto(BASE + `/admin/products/${ad}`);
  await a.fill("#adj", "-5"); await a.fill("#why", "test negative");
  await a.getByRole("button", { name: "Adjust stock" }).click(); await a.waitForTimeout(1000);
  check("stock cannot go negative", await a.getByText(/cannot go below zero/).isVisible());
  await a.fill("#adj", "12"); await a.fill("#why", "Delivery received");
  await a.getByRole("button", { name: "Adjust stock" }).click(); await a.waitForTimeout(1000);
  check("admin stock adjustment recorded", stockOf("paring-knife-9cm") === 12 && Number(sql(`select count(*) from "InventoryMovement" where "productId"='${ad}' and reason='Delivery received'`)) === 1);
  check("admin actions audit-logged", Number(sql(`select count(*) from "AuditLog" where action in ('order.status','inventory.adjust')`)) >= 3);
  // manual FX
  await a.goto(BASE + "/admin/settings");
  await a.fill('input[name="rate"]', "1600");
  await a.getByRole("button", { name: "Set manual rate" }).click(); await a.waitForTimeout(1000);
  await setCurrency(page, "NGN");
  await page.goto(BASE + "/product/summit-chefs-knife-20cm");
  const p1600 = await page.locator("span.text-2xl").first().textContent();
  check("manual FX override applied to NGN prices", p1600 === "₦190,400", p1600);
  await a.getByRole("button", { name: "Remove manual override" }).click(); await a.waitForTimeout(800);
  await adm.close();

  // ---------------------------------------------------------------- responsive screenshots
  const viewports = [["mobile", 375, 812], ["tablet", 768, 1024], ["desktop", 1440, 900]];
  const pages = [["home", "/"], ["shop", "/shop"], ["product", "/product/heritage-enamelled-dutch-oven-5-5l"], ["cart", "/cart"], ["checkout", "/checkout"]];
  for (const [vn, w, h] of viewports) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await c.addCookies([{ name: "sk_currency", value: "USD", url: BASE }]);
    const p = await c.newPage();
    await p.goto(BASE + "/cart");
    await p.evaluate((it) => localStorage.setItem("sk_cart_v1", JSON.stringify(it)), [{ productId: pid, quantity: 1 }]);
    for (const [pn, path] of pages) {
      await p.goto(BASE + path); await p.waitForLoadState("networkidle"); await p.waitForTimeout(300);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`${vn} ${pn}: no horizontal overflow`, overflow <= 1, `overflow ${overflow}px`);
      await p.screenshot({ path: `${SHOTS}/${vn}-${pn}.png`, fullPage: true });
    }
    await c.close();
  }
} catch (e) {
  check("test run completed without crashing", false, e.stack ?? String(e));
} finally {
  await browser.close();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exitCode = failed.length ? 1 : 0;
}
