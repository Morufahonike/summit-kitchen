"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type OrderStatus } from "@prisma/client";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { ADMIN_TRANSITIONS, CUSTOMER_STATUS_LABEL, expireStaleOrders, releaseStock, verifyAndApply } from "@/lib/orders";
import { clientIp } from "@/lib/request";
import { fieldErrors, productSchema } from "@/lib/validation";

export type AdminState = { ok?: boolean; error?: string; fields?: Record<string, string>; message?: string };

async function audit(actorId: string, action: string, target?: string, details?: Prisma.InputJsonValue) {
  await db.auditLog.create({ data: { actorId, action, target, details, ip: await clientIp() } });
}

// ---------------------------------------------------------------- products
export async function saveProductAction(_: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "") || null;
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    sku: formData.get("sku"),
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description"),
    brand: formData.get("brand"),
    material: formData.get("material") ?? "",
    priceUsd: formData.get("priceUsd"),
    compareAtUsd: formData.get("compareAtUsd") ?? "",
    lowStockThreshold: formData.get("lowStockThreshold") ?? 5,
    categoryId: formData.get("categoryId"),
    images: formData.get("images") ?? "",
    features: formData.get("features") ?? "",
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    isSample: formData.get("isSample") === "on",
  });
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fields: fieldErrors(parsed.error) };
  const d = parsed.data;
  if (d.compareAtUsd !== undefined && d.compareAtUsd <= d.priceUsd) return { fields: { compareAtUsd: "Compare-at price must be higher than the price" } };
  const category = await db.category.findUnique({ where: { id: d.categoryId } });
  if (!category) return { fields: { categoryId: "Choose a category" } };

  const data = {
    name: d.name,
    slug: d.slug,
    sku: d.sku,
    shortDescription: d.shortDescription,
    description: d.description,
    brand: d.brand,
    material: d.material || null,
    priceUsdCents: Math.round(d.priceUsd * 100),
    compareAtUsdCents: d.compareAtUsd ? Math.round(d.compareAtUsd * 100) : null,
    lowStockThreshold: d.lowStockThreshold,
    categoryId: d.categoryId,
    images: d.images,
    features: d.features,
    isActive: d.isActive,
    isFeatured: d.isFeatured,
    isSample: d.isSample,
  };
  let savedId: string;
  try {
    if (id) {
      await db.product.update({ where: { id }, data });
      savedId = id;
      await audit(admin.id, "product.update", id, { sku: d.sku });
    } else {
      const initialStock = Math.max(0, Math.min(100000, parseInt(String(formData.get("initialStock") ?? "0"), 10) || 0));
      const p = await db.product.create({ data: { ...data, stock: initialStock } });
      if (initialStock > 0) await db.inventoryMovement.create({ data: { productId: p.id, change: initialStock, reason: "Initial stock", actorId: admin.id } });
      savedId = p.id;
      await audit(admin.id, "product.create", p.id, { sku: d.sku });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = String((e.meta?.target as string[] | undefined)?.join(",") ?? "");
      return { fields: target.includes("sku") ? { sku: "SKU already in use" } : { slug: "URL slug already in use" } };
    }
    throw e;
  }
  revalidatePath("/admin/products");
  redirect(`/admin/products/${savedId}?saved=1`);
}

const stockSchema = z.object({
  productId: z.string().min(1),
  change: z.coerce.number().int().min(-100000).max(100000).refine((v) => v !== 0, "Enter a non-zero amount"),
  reason: z.string().trim().min(3, "Give a reason").max(120),
});

export async function adjustStockAction(_: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await assertAdmin();
  const parsed = stockSchema.safeParse({ productId: formData.get("productId"), change: formData.get("change"), reason: formData.get("reason") });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  const { productId, change, reason } = parsed.data;
  const ok = await db.$transaction(async (tx) => {
    // never allow stock to go negative
    const r = await tx.product.updateMany({
      where: { id: productId, ...(change < 0 ? { stock: { gte: -change } } : {}) },
      data: { stock: { increment: change } },
    });
    if (r.count !== 1) return false;
    await tx.inventoryMovement.create({ data: { productId, change, reason, actorId: admin.id } });
    return true;
  });
  if (!ok) return { error: "Stock cannot go below zero." };
  await audit(admin.id, "inventory.adjust", productId, { change, reason });
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/inventory");
  return { ok: true, message: `Stock adjusted by ${change > 0 ? "+" : ""}${change}.` };
}

// ---------------------------------------------------------------- orders
const statusSchema = z.object({
  orderId: z.string().min(1),
  status: z.string(),
  message: z.string().trim().max(300).optional(),
  trackingCarrier: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
});

export async function updateOrderStatusAction(_: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await assertAdmin();
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid request" };
  const { orderId, message, trackingCarrier, trackingNumber } = parsed.data;
  const to = parsed.data.status as OrderStatus;
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found" };
  if (!(ADMIN_TRANSITIONS[order.status] ?? []).includes(to)) {
    return { error: `Cannot change ${CUSTOMER_STATUS_LABEL[order.status]} to ${CUSTOMER_STATUS_LABEL[to] ?? to}.` };
  }
  if (to === "SHIPPED" && !trackingNumber && !order.trackingNumber) return { fields: { trackingNumber: "Add a tracking number before marking as shipped" } };

  const done = await db.$transaction(async (tx) => {
    const r = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: to, ...(trackingNumber ? { trackingNumber, trackingCarrier: trackingCarrier || null } : {}) },
    });
    if (r.count !== 1) return false;
    await tx.orderEvent.create({ data: { orderId, status: to, message: message || defaultMessage(to) } });
    if (to === "CANCELLED") await releaseStock(tx, orderId, "Order cancelled by admin");
    return true;
  });
  if (!done) return { error: "The order changed while you were editing. Reload and try again." };
  await audit(admin.id, "order.status", orderId, { from: order.status, to });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: `Order marked ${CUSTOMER_STATUS_LABEL[to]}.${to === "CANCELLED" && order.paidAt ? " Remember to refund the payment in the Paystack dashboard." : ""}` };
}

function defaultMessage(s: OrderStatus) {
  return { PROCESSING: "Your order is being prepared", SHIPPED: "Your order has been shipped", DELIVERED: "Your order has been delivered", CANCELLED: "Order cancelled" }[s as string] ?? CUSTOMER_STATUS_LABEL[s];
}

export async function addOrderNoteAction(_: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await assertAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!note) return { fields: { note: "Write a note" } };
  const o = await db.order.findUnique({ where: { id: orderId }, select: { status: true } });
  if (!o) return { error: "Order not found" };
  await db.orderEvent.create({ data: { orderId, status: o.status, message: note, internal: true } });
  await audit(admin.id, "order.note", orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

export async function reverifyPaymentAction(_: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await assertAdmin();
  const reference = String(formData.get("reference") ?? "");
  try {
    const { outcome, verify } = await verifyAndApply(reference);
    await audit(admin.id, "payment.reverify", reference, { outcome });
    revalidatePath("/admin/orders");
    return { ok: true, message: `Provider status: ${verify.status}. Result: ${outcome.replaceAll("_", " ")}.` };
  } catch (e) {
    return { error: `Could not reach the payment provider: ${(e as Error).message}` };
  }
}

export async function expireOrdersAction(_: AdminState): Promise<AdminState> {
  const admin = await assertAdmin();
  const n = await expireStaleOrders();
  await audit(admin.id, "orders.expire_stale", undefined, { expired: n });
  revalidatePath("/admin/orders");
  return { ok: true, message: `${n} stale order${n === 1 ? "" : "s"} expired and stock released.` };
}

// ---------------------------------------------------------------- settings
export async function setManualRateAction(_: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await assertAdmin();
  const rate = Number(formData.get("rate"));
  if (!(rate > 100 && rate < 100000)) return { fields: { rate: "Enter a realistic USD→NGN rate (100–100,000)" } };
  await db.exchangeRate.create({ data: { base: "USD", quote: "NGN", rate: new Prisma.Decimal(rate), source: `manual (${admin.email})`, isManual: true } });
  await audit(admin.id, "fx.manual_set", undefined, { rate });
  revalidatePath("/", "layout");
  return { ok: true, message: `Manual rate ₦${rate} / $1 is now in use.` };
}

export async function clearManualRateAction(_: AdminState): Promise<AdminState> {
  const admin = await assertAdmin();
  await db.exchangeRate.deleteMany({ where: { isManual: true } });
  await audit(admin.id, "fx.manual_cleared");
  revalidatePath("/", "layout");
  return { ok: true, message: "Manual override removed — automatic rate in use." };
}

export async function refreshRateAction(_: AdminState): Promise<AdminState> {
  const admin = await assertAdmin();
  // force a refetch by expiring cached automatic rates
  await db.exchangeRate.updateMany({ where: { isManual: false }, data: { fetchedAt: new Date(0) } });
  await audit(admin.id, "fx.refresh");
  revalidatePath("/", "layout");
  return { ok: true, message: "Rate refresh requested." };
}

export async function setUserRoleAction(_: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "CUSTOMER";
  if (userId === admin.id) return { error: "You can't change your own role." };
  await db.user.update({ where: { id: userId }, data: { role } });
  await db.session.deleteMany({ where: { userId } }); // force re-login with new privileges
  await audit(admin.id, "user.role", userId, { role });
  revalidatePath("/admin/customers");
  return { ok: true, message: `Role set to ${role}.` };
}
