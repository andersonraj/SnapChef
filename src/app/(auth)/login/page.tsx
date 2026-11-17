"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChefHat } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const FOOD = [
  { e: "🥑", x: "8%", y: "12%", d: "0s" }, { e: "🍅", x: "82%", y: "10%", d: "1.2s" },
  { e: "🥕", x: "12%", y: "74%", d: "2.1s" }, { e: "🧀", x: "84%", y: "70%", d: "0.6s" },
  { e: "🍳", x: "46%", y: "4%", d: "1.8s" }, { e: "🥦", x: "50%", y: "88%", d: "2.6s" },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  const input = "w-full rounded-xl border border-neutral-200 bg-white/80 px-4 py-3 outline-none focus:border-emerald-500";

  return (
    <main className="bg-drift relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {FOOD.map((f) => (
        <span key={f.e} aria-hidden className="animate-float pointer-events-none absolute select-none text-5xl opacity-70"
          style={{ left: f.x, top: f.y, animationDelay: f.d }}>
          {f.e}
        </span>
      ))}
      <div className="glass animate-pop relative w-full max-w-sm rounded-3xl p-8 shadow-2xl">
        <div className="mb-1 flex items-center gap-2.5">
          <span className="bg-brand flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg">
            <ChefHat size={24} />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">SnapChef</h1>
        </div>
        <p className="mb-6 text-sm text-neutral-600">Snap your fridge. Cook zero-waste. Save money.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <input className={input} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
          )}
          <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={input} type="password" placeholder="Password (6+ chars)" minLength={6} value={password}
            onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <button disabled={loading} className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white disabled:opacity-60">
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-sm text-neutral-600 hover:text-emerald-700">
          {mode === "signin" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
