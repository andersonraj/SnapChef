"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { History, Loader2, Trash2, Utensils, Wallet, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { GeneratedRecipe, RecipeIngredient } from "@/lib/ai/recipe-schemas";

type MealLog = {
  id: string;
  recipe_name: string;
  recipe_json: GeneratedRecipe | null;
  ingredients_used: RecipeIngredient[];
  servings: number;
  total_cost: number;
  cost_per_serving: number;
  cooked_at: string;
};

export default function HistoryPage() {
  const [meals, setMeals] = useState<MealLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // user_id filter: RLS also exposes potluck group meals from other members.
    const { data, error } = await supabase
      .from("meal_logs")
      .select("id,recipe_name,recipe_json,ingredients_used,servings,total_cost,cost_per_serving,cooked_at")
      .eq("user_id", user.id)
      .order("cooked_at", { ascending: false });
    if (error) setError(error.message);
    setMeals((data as MealLog[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    setMeals((prev) => prev?.filter((m) => m.id !== id) ?? null);
    const { error } = await createClient().from("meal_logs").delete().eq("id", id);
    if (error) { setError(error.message); load(); }
  }

  const totalCost = (meals ?? []).reduce((s, m) => s + Number(m.total_cost), 0);
  const totalServings = (meals ?? []).reduce((s, m) => s + m.servings, 0);
  const avg = totalServings ? totalCost / totalServings : 0;

  return (
    <main className="space-y-5 p-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><History size={24} className="text-emerald-600" /> Meal history</h1>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {meals === null ? (
        <p className="flex items-center justify-center gap-2 py-10 text-neutral-500">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </p>
      ) : meals.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm">
          No meals yet. <Link href="/recipes" className="font-medium text-emerald-700 underline">Cook your first recipe</Link>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-3">
            {[
              { icon: <Utensils size={18} />, label: "Meals cooked", value: String(meals.length) },
              { icon: <Wallet size={18} />, label: "Total cost", value: `$${totalCost.toFixed(2)}` },
              { icon: <TrendingDown size={18} />, label: "Avg / serving", value: `$${avg.toFixed(2)}` },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="text-emerald-600">{s.icon}</div>
                <p className="mt-1 text-xl font-bold">{s.value}</p>
                <p className="text-xs text-neutral-500">{s.label}</p>
              </div>
            ))}
          </section>

          <ul className="space-y-3">
            {meals.map((m) => (
              <li key={m.id} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{m.recipe_name}</p>
                    <p className="text-xs text-neutral-500">
                      {new Date(m.cooked_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      {" · "}{m.servings} serving{m.servings > 1 ? "s" : ""} · ${Number(m.total_cost).toFixed(2)} total
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-700">
                      ${Number(m.cost_per_serving).toFixed(2)}
                    </span>
                    <button onClick={() => remove(m.id)} aria-label="Delete log"
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-emerald-700">Ingredients & steps</summary>
                  <ul className="mt-2 space-y-1">
                    {m.ingredients_used.map((i) => (
                      <li key={i.pantry_item_id} className="flex justify-between">
                        <span>{i.quantity} {i.unit} {i.name}</span>
                        <span className="text-neutral-400">${Number(i.cost).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  {m.recipe_json?.steps?.length ? (
                    <ol className="mt-3 list-decimal space-y-1 pl-5 text-neutral-700">
                      {m.recipe_json.steps.map((s, idx) => <li key={idx}>{s}</li>)}
                    </ol>
                  ) : null}
                </details>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
