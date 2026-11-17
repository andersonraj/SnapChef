"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Receipt, Loader2, Trash2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ScanItem, ScanResult } from "@/lib/ai/schemas";

type Mode = "fridge" | "receipt";

// Shrink phone photos before upload: faster scans, smaller requests.
async function shrink(file: File, max = 1280): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.85));
}

export default function ScanPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("fridge");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [items, setItems] = useState<ScanItem[]>([]);
  const [busy, setBusy] = useState<"scan" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setItems([]);
    setPreview(URL.createObjectURL(file));
    setBusy("scan");
    try {
      const blob = await shrink(file);
      const body = new FormData();
      body.append("image", blob, "scan.jpg");
      body.append("mode", mode);
      const res = await fetch("/api/scan", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setResult(data);
      setItems(data.items);
      if (data.items.length === 0) setError("No food items found. Try a closer, brighter photo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBusy(null);
    }
  }

  const update = (i: number, patch: Partial<ScanItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  async function save() {
    if (!result || items.length === 0) return;
    setBusy("save");
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    let receiptId: string | null = null;
    if (mode === "receipt") {
      const { data, error } = await supabase
        .from("receipts")
        .insert({
          user_id: user.id,
          store_name: result.store_name,
          purchase_date: result.purchase_date,
          total_amount: result.total,
          raw_ai_response: result,
          status: "processed",
        })
        .select("id")
        .single();
      if (error) {
        setBusy(null);
        return setError(error.message);
      }
      receiptId = data.id;
    }

    const addDays = (d: number) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
    const rows = items.map((it) => ({
      user_id: user.id,
      receipt_id: receiptId,
      name: it.name.trim(),
      category: it.category,
      quantity: it.quantity,
      purchase_quantity: it.quantity,
      unit: it.unit,
      price: it.price,
      expires_on: it.shelf_life_days ? addDays(it.shelf_life_days) : null,
      source: mode === "receipt" ? "receipt" : "fridge_photo",
      ai_confidence: it.confidence,
    }));

    const { error } = await supabase.from("pantry_items").insert(rows);
    setBusy(null);
    if (error) return setError(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  const field = "rounded-lg border border-neutral-200 px-2 py-1.5 text-sm outline-none focus:border-emerald-500";

  return (
    <main className="space-y-5 p-5">
      <h1 className="text-2xl font-bold">Scan</h1>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-200 p-1">
        {([["fridge", "Fridge photo", Camera], ["receipt", "Receipt", Receipt]] as const).map(
          ([m, label, Icon]) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium ${
                mode === m ? "bg-white shadow-sm" : "text-neutral-600"
              }`}>
              <Icon size={16} /> {label}
            </button>
          )
        )}
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 bg-white p-8 text-center text-neutral-600">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="max-h-64 rounded-xl object-contain" />
        ) : (
          <>
            <Camera size={32} className="text-emerald-600" />
            <span>Tap to {mode === "fridge" ? "photograph your fridge" : "upload a receipt"}</span>
          </>
        )}
        <input type="file" accept="image/*" onChange={onFile} className="hidden" disabled={!!busy} />
      </label>

      {busy === "scan" && (
        <p className="flex items-center justify-center gap-2 text-emerald-700">
          <Loader2 className="animate-spin" size={18} /> Reading your {mode === "fridge" ? "fridge" : "receipt"}…
        </p>
      )}
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {items.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">
            Found {items.length} items{result?.store_name ? ` from ${result.store_name}` : ""}. Edit before saving:
          </h2>
          {items.map((it, i) => (
            <div key={i} className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
              <div className="flex gap-2">
                <input className={`${field} flex-1`} value={it.name}
                  onChange={(e) => update(i, { name: e.target.value })} />
                <button onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                  aria-label="Remove item" className="p-2 text-neutral-400 hover:text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-neutral-500">
                <label>Qty
                  <input type="number" min="0.01" step="any" className={`${field} w-full`} value={it.quantity}
                    onChange={(e) => update(i, { quantity: Number(e.target.value) || 1 })} />
                </label>
                <label>Unit
                  <input className={`${field} w-full`} value={it.unit}
                    onChange={(e) => update(i, { unit: e.target.value })} />
                </label>
                <label>Price $
                  <input type="number" min="0" step="0.01" className={`${field} w-full`} value={it.price ?? ""}
                    onChange={(e) => update(i, { price: e.target.value === "" ? null : Number(e.target.value) })} />
                </label>
                <label>Days left
                  <input type="number" min="1" className={`${field} w-full`} value={it.shelf_life_days ?? ""}
                    onChange={(e) => update(i, { shelf_life_days: e.target.value === "" ? null : Number(e.target.value) })} />
                </label>
              </div>
            </div>
          ))}
          <button onClick={save} disabled={busy === "save"}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
            {busy === "save" ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
            Add {items.length} items to pantry
          </button>
        </section>
      )}
    </main>
  );
}
