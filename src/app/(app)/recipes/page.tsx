"use client";

import { useState } from "react";
import Link from "next/link";
import { ChefHat, Clock, Flame, Loader2, Sparkles, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { GeneratedRecipe } from "@/lib/ai/recipe-schemas";

export default function RecipesPage() {
  const [servings, setServings] = useState(2);
  const [recipes, setRecipes] = useState<GeneratedRecipe[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooking, setCooking] = useState<number | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setRecipes(data.recipes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function cook(r: GeneratedRecipe, index: number) {
    setCooking(index);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: logError } = await supabase.from("meal_logs").insert({
      user_id: user.id,
      recipe_name: r.name,
      recipe_json: r,
      ingredients_used: r.ingredients,
      servings: r.servings,
      total_cost: r.total_cost,
    });
    if (logError) {
      setCooking(null);
      return setError(logError.message);
    }

    // Deduct what was used from the pantry; fully used items are marked "used".
    await Promise.all(
      r.ingredients.map((ing) => {
        const remaining = Math.max(0, Math.round((ing.available - ing.quantity) * 100) / 100);
        return supabase
          .from("pantry_items")
          .update(remaining === 0 ? { quantity: 0, status: "used" } : { quantity: remaining })
          .eq("id", ing.pantry_item_id);
      })
    );

    setCooking(null);
    setRecipes(null); // pantry changed, so the old suggestions are stale
    setDone(`Logged "${r.name}". That's $${r.cost_per_serving.toFixed(2)} per serving. Pantry updated!`);
  }

  return (
    <main className="space-y-5 p-5">
      <h1 className="text-2xl font-bold">Recipes</h1>

      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <label className="text-sm text-neutral-600">
          Servings
          <select value={servings} onChange={(e) => setServings(Number(e.target.value))}
            className="ml-2 rounded-lg border border-neutral-200 px-2 py-1.5">
            {[1, 2, 3, 4, 6].map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <button onClick={generate} disabled={loading}
          className="ml-auto flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          {loading ? "Cooking up ideas…" : "Cook with what I have"}
        </button>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {done && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <Check size={16} /> {done}{" "}
          <Link href="/history" className="ml-auto font-medium underline">View history</Link>
        </p>
      )}

      {recipes?.map((r, idx) => (
        <article key={idx} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold"><ChefHat size={18} className="text-emerald-600" />{r.name}</h2>
              <p className="text-sm text-neutral-600">{r.description}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xl font-bold text-emerald-600">${r.cost_per_serving.toFixed(2)}</p>
              <p className="text-xs text-neutral-500">per serving</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {r.time_minutes && (
              <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1"><Clock size={12} />{r.time_minutes} min</span>
            )}
            <span className="rounded-full bg-neutral-100 px-2.5 py-1">{r.servings} servings · ${r.total_cost.toFixed(2)} total</span>
            {r.uses_expiring.length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
                <Flame size={12} /> Saves {r.uses_expiring.join(", ")}
              </span>
            )}
          </div>

          <ul className="space-y-1 text-sm">
            {r.ingredients.map((i) => (
              <li key={i.pantry_item_id} className="flex justify-between">
                <span>{i.quantity} {i.unit} {i.name}</span>
                <span className="text-neutral-400">${i.cost.toFixed(2)}</span>
              </li>
            ))}
            {r.extras.length > 0 && (
              <li className="text-xs text-neutral-500">Also: {r.extras.join(", ")}</li>
            )}
          </ul>

          <details className="text-sm">
            <summary className="cursor-pointer font-medium text-emerald-700">Steps</summary>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-neutral-700">
              {r.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </details>

          <button onClick={() => cook(r, idx)} disabled={cooking !== null}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 py-2.5 font-semibold text-white disabled:opacity-60">
            {cooking === idx && <Loader2 className="animate-spin" size={16} />}
            Cook this
          </button>
        </article>
      ))}
    </main>
  );
}
