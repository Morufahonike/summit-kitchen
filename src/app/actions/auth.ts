"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { burnPasswordCheck, createSession, destroySession, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { fieldErrors, loginSchema, registerSchema, passwordSchema } from "@/lib/validation";

export type AuthState = { error?: string; fields?: Record<string, string>; ok?: boolean };

/** only allow same-site relative redirects (prevents open-redirect via ?next=) */
function safeNext(v: FormDataEntryValue | null, fallback: string) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}

export async function loginAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const ip = await clientIp();
  const key = `login:${ip}:${parsed.data.email}`;
  const ipKey = `login-ip:${ip}`;
  const a = rateLimit(key, 5, 15 * 60_000);
  const b = rateLimit(ipKey, 30, 15 * 60_000);
  if (!a.ok || !b.ok) {
    return { error: `Too many sign-in attempts. Try again in ${Math.ceil(Math.max(a.retryAfterMs, b.retryAfterMs) / 60000)} minutes.` };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    await burnPasswordCheck(parsed.data.password);
    return { error: "Incorrect email or password." };
  }
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    if (user.role === "ADMIN") {
      await db.auditLog.create({ data: { actorId: user.id, action: "admin.login_failed", ip } });
    }
    return { error: "Incorrect email or password." };
  }
  resetRateLimit(key);
  await createSession(user.id, (await headers()).get("user-agent"));
  if (user.role === "ADMIN") await db.auditLog.create({ data: { actorId: user.id, action: "admin.login", ip } });
  redirect(safeNext(formData.get("next"), user.role === "ADMIN" ? "/admin" : "/account"));
}

export async function registerAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, 5, 60 * 60_000).ok) return { error: "Too many accounts created from this network. Try again later." };
  const parsed = registerSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const exists = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (exists) return { fields: { email: "An account with this email already exists. Try signing in." } };

  const user = await db.user.create({
    data: { name: parsed.data.name, email: parsed.data.email, passwordHash: await hashPassword(parsed.data.password), role: "CUSTOMER" },
  });
  // NOTE: earlier guest orders are deliberately NOT attached by email — without email verification,
  // anyone could register a victim's address and read their order history.
  await createSession(user.id, (await headers()).get("user-agent"));
  redirect(safeNext(formData.get("next"), "/account"));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function updateProfileAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const fields: Record<string, string> = {};
  if (name.length < 2 || name.length > 80) fields.name = "Enter your name";
  if (phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone)) fields.phone = "Enter a valid phone number";
  const addr = {
    fullName: String(formData.get("fullName") ?? "").trim().slice(0, 80),
    line1: String(formData.get("line1") ?? "").trim().slice(0, 120),
    line2: String(formData.get("line2") ?? "").trim().slice(0, 120),
    city: String(formData.get("city") ?? "").trim().slice(0, 60),
    state: String(formData.get("state") ?? "").trim().slice(0, 60),
    postalCode: String(formData.get("postalCode") ?? "").trim().slice(0, 20),
    country: String(formData.get("country") ?? "NG").trim().toUpperCase().slice(0, 2),
  };
  if (Object.keys(fields).length) return { fields };

  await db.user.update({ where: { id: user.id }, data: { name, phone: phone || null } });
  if (addr.line1 && addr.city) {
    const existing = await db.address.findFirst({ where: { userId: user.id, isDefault: true } });
    const data = { ...addr, fullName: addr.fullName || name, phone: phone || "", line2: addr.line2 || null, postalCode: addr.postalCode || null, isDefault: true };
    if (existing) await db.address.update({ where: { id: existing.id }, data });
    else await db.address.create({ data: { ...data, userId: user.id } });
  }
  return { ok: true };
}

export async function changePasswordAction(_: AuthState, formData: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again." };
  if (!rateLimit(`pw:${user.id}`, 5, 15 * 60_000).ok) return { error: "Too many attempts. Try again later." };
  const current = String(formData.get("current") ?? "");
  const next = passwordSchema.safeParse(formData.get("password"));
  if (!next.success) return { fields: { password: next.error.issues[0].message } };
  const full = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(current, full.passwordHash))) return { fields: { current: "Current password is incorrect" } };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next.data) } });
  // sign out every other session
  await db.session.deleteMany({ where: { userId: user.id } });
  await createSession(user.id, (await headers()).get("user-agent"));
  if (user.role === "ADMIN") await db.auditLog.create({ data: { actorId: user.id, action: "admin.password_changed", ip: await clientIp() } });
  return { ok: true };
}
