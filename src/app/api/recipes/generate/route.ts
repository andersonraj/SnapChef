import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecipes } from "@/lib/ai/recipes";
import type { GeneratedRecipe } from "@/lib/ai/recipe-schemas";

const round = (n: number) => Math.round(n * 100) / 100;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const servings = [1, 2, 3, 4, 6].includes(body.servings) ? body.servings : 2;

  const [items, profile] = await Promise.all([
    supabase
      .from("pantry_items")
      .select("id,name,quantity,unit,unit_cost,expires_on")
      .eq("user_id", user.id)
      .eq("status", "in_stock")
      .gt("quantity", 0),
    supabase.from("profiles").select("dietary_preferences,allergies").eq("id", user.id).single(),
  ]);

  if (!items.data?.length) {
    return NextResponse.json({ error: "Your pantry is empty. Scan your fridge first!" }, { status: 400 });
  }

  const today = Date.parse(new Date().toISOString().slice(0, 10));
  const pantry = items.data.map((i) => ({
    id: i.id as string,
    name: i.name as string,
    quantity: Number(i.quantity),
    unit: i.unit as string,
    unit_cost: Number(i.unit_cost ?? 0),
    days_left: i.expires_on ? Math.round((Date.parse(i.expires_on) - today) / 864e5) : null,
  }));
  const byId = new Map(pantry.map((p) => [p.id, p]));

  try {
    const raw = await generateRecipes(
      pantry.map(({ id, name, quantity, unit, days_left }) => ({ id, name, quantity, unit, days_left })),
      servings,
      profile.data ?? {}
    );

    const recipes: GeneratedRecipe[] = raw.recipes
      .map((r) => {
        // Ignore any ingredient the AI invented (id not in the pantry), clamp to what's available.
        const ingredients = r.ingredients.flatMap((ing) => {
          const p = byId.get(ing.pantry_item_id);
          if (!p) return [];
          const quantity = Math.min(ing.quantity, p.quantity);
          return [{
            pantry_item_id: p.id,
            name: p.name,
            quantity,
            unit: p.unit,
            available: p.quantity,
            cost: round(quantity * p.unit_cost),
            expiring: p.days_left !== null && p.days_left <= 3,
          }];
        });
        const total_cost = round(ingredients.reduce((s, i) => s + i.cost, 0));
        return {
          name: r.name,
          description: r.description,
          servings,
          time_minutes: r.time_minutes,
          ingredients,
          extras: r.extras,
          steps: r.steps,
          total_cost,
          cost_per_serving: round(total_cost / servings),
          uses_expiring: ingredients.filter((i) => i.expiring).map((i) => i.name),
        };
      })
      .filter((r) => r.ingredients.length > 0);

    return NextResponse.json({ recipes });
  } catch (e) {
    console.error("Recipe generation failed:", e);
    return NextResponse.json({ error: "Couldn't generate recipes. Try again." }, { status: 502 });
  }
}
