"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={signOut} aria-label="Sign out"
      className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100">
      <LogOut size={20} />
    </button>
  );
}
