import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Camera, ChefHat, Users, Wallet, Utensils, ChevronRight, Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/layout/SignOutButton";
import CountUp from "@/components/ui/CountUp";

export default function DashboardPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function Skeleton() {
  return (
    <main className="space-y-5 p-5">
      <div className="skeleton h-14 w-2/3" />
      <div className="skeleton h-44" />
      <div className="grid grid-cols-2 gap-3"><div className="skeleton h-24" /><div className="skeleton h-24" /></div>
    </main>
  );
}

async function DashboardContent() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const in3Days = new Date(now.getTime() + 3 * 864e5).toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 864e5).toISOString();

  const [profile, pantry, expiring, receipts, meals] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.from("pantry_items").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "in_stock"),
    supabase.from("pantry_items").select("id,name,quantity,unit,expires_on").eq("user_id", user.id).eq("status", "in_stock")
      .not("expires_on", "is", null).lte("expires_on", in3Days).order("expires_on").limit(5),
    supabase.from("receipts").select("total_amount").eq("user_id", user.id).gte("created_at", weekAgo),
    supabase.from("meal_logs").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("cooked_at", weekAgo),
  ]);

  const firstName = profile.data?.display_name?.split(" ")[0] ?? "Chef";
  const spent = (receipts.data ?? []).reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
  const expiringItems = expiring.data ?? [];

  return (
    <main className="space-y-5 p-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">Welcome back</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Hey {firstName} 👋</h1>
        </div>
        <SignOutButton />
      </header>

      <section className="bg-hero relative overflow-hidden rounded-3xl p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 left-10 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl" />
        <p className="relative text-sm font-medium text-emerald-100">Your kitchen right now</p>
        <p className="relative mt-1 text-6xl font-extrabold tracking-tight"><CountUp value={pantry.count ?? 0} /></p>
        <p className="relative text-emerald-100">items in your pantry</p>
        <div className="relative mt-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm backdrop-blur">
            <Flame size={15} />
            {expiringItems.length ? `${expiringItems.length} need using soon` : "Nothing expiring. Nice!"}
          </span>
          <Link href="/scan" className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-lg">
            <Camera size={16} /> Scan
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Wallet size={18} /></span>
          <p className="mt-2 text-2xl font-extrabold"><CountUp value={spent} prefix="$" decimals={2} /></p>
          <p className="text-xs text-neutral-500">Groceries (7 days)</p>
        </div>
        <Link href="/history" className="rounded-2xl bg-white p-4 shadow-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Utensils size={18} /></span>
          <p className="mt-2 text-2xl font-extrabold"><CountUp value={meals.count ?? 0} /></p>
          <p className="flex items-center text-xs text-neutral-500">Meals cooked <ChevronRight size={12} /></p>
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link href="/recipes" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <span className="bg-brand flex h-10 w-10 items-center justify-center rounded-xl text-white"><ChefHat size={20} /></span>
          <span className="text-sm font-bold leading-tight">Cook with what I have</span>
        </Link>
        <Link href="/potluck" className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600"><Users size={20} /></span>
          <span className="text-sm font-bold leading-tight">Group Potluck</span>
        </Link>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Use these soon</h2>
        {expiringItems.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-neutral-500 shadow-sm">
            Nothing expiring in the next 3 days. Scan your fridge to fill your pantry!
          </p>
        ) : (
          <ul className="space-y-2">
            {expiringItems.map((item) => {
              const days = Math.round((Date.parse(item.expires_on!) - Date.parse(today)) / 864e5);
              const hot = days <= 0;
              return (
                <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${hot ? "bg-red-500" : "bg-amber-400"}`} />
                  <div className="flex-1">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-neutral-500">{item.quantity} {item.unit}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${hot ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                    {days < 0 ? "Expired" : days === 0 ? "Today" : `${days}d left`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
