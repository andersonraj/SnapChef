import { z } from "zod";

// What Gemini returns
export const RecipesSchema = z.object({
  recipes: z.array(
    z.object({
      name: z.string(),
      description: z.string().catch(""),
      time_minutes: z.number().int().positive().nullable().catch(null),
      ingredients: z.array(
        z.object({
          pantry_item_id: z.string(),
          quantity: z.number().positive().catch(1),
        })
      ),
      extras: z.array(z.string()).catch([]),
      steps: z.array(z.string()).catch([]),
    })
  ),
});

// What our API returns to the page (costs computed server-side from real prices)
export type RecipeIngredient = {
  pantry_item_id: string;
  name: string;
  quantity: number;
  unit: string;
  available: number;
  cost: number;
  expiring: boolean;
};

export type GeneratedRecipe = {
  name: string;
  description: string;
  servings: number;
  time_minutes: number | null;
  ingredients: RecipeIngredient[];
  extras: string[];
  steps: string[];
  total_cost: number;
  cost_per_serving: number;
  uses_expiring: string[];
};
