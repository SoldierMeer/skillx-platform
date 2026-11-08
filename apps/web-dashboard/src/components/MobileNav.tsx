"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Compass, Calendar, Coins, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function MobileNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  if (pathname === "/auth" || !isAuthenticated) return null;

  const navItems = [
    { label: "Explore", href: "/explore", icon: Compass, active: pathname === "/explore" || pathname === "/" },
    { label: "Bookings", href: "/bookings", icon: Calendar, active: pathname?.startsWith("/bookings") },
    { label: "Wallet", href: "/wallet", icon: Coins, active: pathname === "/wallet" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full py-1 px-2 rounded-xl transition-all ${
                item.active
                  ? "text-iba-navy font-bold"
                  : "text-slate-400 hover:text-slate-600 font-medium"
              }`}
            >
              <div
                className={`p-1 rounded-full transition-transform ${
                  item.active ? "scale-110 text-teal-600" : ""
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] leading-tight tracking-tight mt-0.5">
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
