import { z } from "zod";

export const CATEGORIES = [
  "produce", "dairy", "meat", "seafood", "grains", "canned",
  "frozen", "condiments", "spices", "snacks", "beverages", "other",
] as const;

// .catch() makes validation forgiving: one odd AI value won't fail the whole scan.
export const ItemSchema = z.object({
  name: z.string().min(1),
  category: z.enum(CATEGORIES).catch("other"),
  quantity: z.number().positive().catch(1),
  unit: z.string().catch("unit"),
  price: z.number().nonnegative().nullable().catch(null),
  shelf_life_days: z.number().int().positive().nullable().catch(null),
  confidence: z.number().min(0).max(1).catch(0.8),
});

export const ScanSchema = z.object({
  store_name: z.string().nullable().catch(null),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null),
  total: z.number().nonnegative().nullable().catch(null),
  items: z.array(ItemSchema),
});

export type ScanItem = z.infer<typeof ItemSchema>;
export type ScanResult = z.infer<typeof ScanSchema>;
