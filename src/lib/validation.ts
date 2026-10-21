import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email").max(254);

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Password is too long")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Include at least one letter and one number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128),
});

const text = (min: number, max: number, msg: string) => z.string().trim().min(min, msg).max(max);

export const checkoutSchema = z.object({
  email: emailSchema,
  fullName: text(2, 80, "Enter the recipient's name"),
  phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
  line1: text(3, 120, "Enter the street address"),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: text(2, 60, "Enter the city"),
  state: text(2, 60, "Enter the state / region"),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().length(2, "Choose a country").toUpperCase(),
  shippingMethod: z.enum(["LAGOS_STANDARD", "NIGERIA_STANDARD", "INTERNATIONAL"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  items: z
    .array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(20) }))
    .min(1, "Your cart is empty")
    .max(50),
});

export const cartQuoteSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().min(1).max(40), quantity: z.number().int().min(1).max(20) }))
    .max(50),
});

export const productSchema = z.object({
  name: text(2, 120, "Enter a product name"),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens").max(120),
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,40}$/, "SKU: 3–40 letters, numbers or hyphens"),
  shortDescription: text(5, 200, "Add a short description"),
  description: text(10, 5000, "Add a description"),
  brand: text(1, 60, "Enter a brand"),
  material: z.string().trim().max(80).optional().or(z.literal("")),
  priceUsd: z.coerce.number().positive("Price must be above 0").max(100000),
  compareAtUsd: z.coerce.number().positive().max(100000).optional().or(z.literal("").transform(() => undefined)),
  lowStockThreshold: z.coerce.number().int().min(0).max(10000),
  categoryId: z.string().min(1, "Choose a category"),
  images: z.string().max(2000).transform((v) =>
    v.split(/\n|,/).map((s) => s.trim()).filter(Boolean),
  ).refine((arr) => arr.every((u) => u.startsWith("/") || /^https:\/\//.test(u)), "Images must be https:// URLs or /paths"),
  features: z.string().max(2000).transform((v) => v.split("\n").map((s) => s.trim()).filter(Boolean)),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  isSample: z.boolean(),
});

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = issue.path.join(".") || "form";
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}
