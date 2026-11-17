"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Ban, Trash2, Plus, Search, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Item = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number | null;
  expires_on: string | null;
};

// Only called for loaded items (never during prerender), so Date is safe here.
const daysLeft = (d: string | null) =>
  d ? Math.round((Date.parse(d) - Date.parse(new Date().toISOString().slice(0, 10))) / 864e5) : null;

function Badge({ days }: { days: number | null }) {
  if (days === null) return <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-500">No date</span>;
  const tone = days < 0 ? "bg-red-100 text-red-700" : days <= 3 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  const text = days < 0 ? "Expired" : days === 0 ? "Today" : `${days}d left`;
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{text}</span>;
}

export default function PantryPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [query, setQuery] = useState("");
  const [soonOnly, setSoonOnly] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", quantity: "1", unit: "unit", days: "" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // user_id filter matters: RLS also lets potluck-mates' shared items through.
    const { data, error } = await supabase
      .from("pantry_items")
      .select("id,name,category,quantity,unit,price,expires_on")
      .eq("user_id", user.id)
      .eq("status", "in_stock")
      .order("expires_on", { ascending: true, nullsFirst: false });
    if (error) setError(error.message);
    setItems((data as Item[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: "used" | "wasted") {
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
    const patch = status === "used" ? { status, quantity: 0 } : { status };
    const { error } = await createClient().from("pantry_items").update(patch).eq("id", id);
    if (error) { setError(error.message); load(); }
  }

  async function remove(id: string) {
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
    const { error } = await createClient().from("pantry_items").delete().eq("id", id);
    if (error) { setError(error.message); load(); }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const qty = Number(form.quantity) || 1;
    const days = Number(form.days);
    const { error } = await supabase.from("pantry_items").insert({
      user_id: user.id,
      name: form.name.trim(),
      quantity: qty,
      purchase_quantity: qty,
      unit: form.unit.trim() || "unit",
      expires_on: days > 0 ? new Date(Date.now() + days * 864e5).toISOString().slice(0, 10) : null,
      source: "manual",
    });
    if (error) return setError(error.message);
    setForm({ name: "", quantity: "1", unit: "unit", days: "" });
    setAdding(false);
    load();
  }

  const visible = (items ?? []).filter((i) => {
    if (query && !i.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (soonOnly) {
      const d = daysLeft(i.expires_on);
      return d !== null && d <= 3;
    }
    return true;
  });

  const field = "rounded-lg border border-neutral-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500";

  return (
    <main className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pantry</h1>
        <button onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white">
          <Plus size={16} /> Add
        </button>
      </div>

      {adding && (
        <form onSubmit={addItem} className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-3 shadow-sm">
          <input className={`${field} col-span-2`} placeholder="Item name" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={field} type="number" min="0.01" step="any" placeholder="Qty" value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input className={field} placeholder="Unit" value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <input className={`${field} col-span-2`} type="number" min="1" placeholder="Days until it expires (optional)"
            value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
          <button className="col-span-2 rounded-lg bg-emerald-600 py-2 font-medium text-white">Save item</button>
        </form>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input className={`${field} w-full py-2 pl-9`} placeholder="Search pantry" value={query}
            onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button onClick={() => setSoonOnly(!soonOnly)}
          className={`rounded-lg px-3 text-sm font-medium ${soonOnly ? "bg-amber-500 text-white" : "bg-white text-neutral-600"}`}>
          Expiring
        </button>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {items === null ? (
        <p className="flex items-center justify-center gap-2 py-10 text-neutral-500">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm">
          {items.length === 0 ? "Your pantry is empty. Scan your fridge or add an item." : "No items match."}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
          {visible.map((i) => (
            <li key={i.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{i.name}</p>
                <p className="text-xs text-neutral-500">
                  {i.quantity} {i.unit} · {i.category}{i.price != null ? ` · $${Number(i.price).toFixed(2)}` : ""}
                </p>
              </div>
              <Badge days={daysLeft(i.expires_on)} />
              <button onClick={() => setStatus(i.id, "used")} aria-label="Mark used" title="Used it"
                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check size={18} /></button>
              <button onClick={() => setStatus(i.id, "wasted")} aria-label="Mark wasted" title="Wasted"
                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"><Ban size={18} /></button>
              <button onClick={() => remove(i.id)} aria-label="Delete" title="Delete"
                className="p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 rounded-lg"><Trash2 size={18} /></button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
