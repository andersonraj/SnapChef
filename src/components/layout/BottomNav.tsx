"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Package, Camera, ChefHat, Users } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/pantry", label: "Pantry", icon: Package },
  { href: "/scan", label: "Scan", icon: Camera },
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/potluck", label: "Potluck", icon: Users },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <ul className="glass mx-auto flex max-w-md items-center justify-between rounded-full px-2 py-2 shadow-xl">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          if (href === "/scan") {
            return (
              <li key={href}>
                <Link href={href} aria-label="Scan"
                  className={`bg-brand glow -mt-9 flex h-16 w-16 items-center justify-center rounded-full text-white ring-4 ring-white ${active ? "scale-110" : ""}`}>
                  <Icon size={26} />
                </Link>
              </li>
            );
          }
          return (
            <li key={href}>
              <Link href={href}
                className={`flex flex-col items-center gap-0.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold ${
                  active ? "bg-emerald-100 text-emerald-700" : "text-neutral-500 hover:text-emerald-600"
                }`}>
                <Icon size={20} className={`transition-transform duration-300 ${active ? "scale-125" : ""}`} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
