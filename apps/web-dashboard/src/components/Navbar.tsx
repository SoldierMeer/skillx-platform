"use client";

import React, { useState } from "react";
import Link from "next/navigation";
import { usePathname } from "next/navigation";
import { Coins, Lock, LogOut, User as UserIcon, BookOpen, Calendar, Compass } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: wallet } = useWallet();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Hide on auth page
  if (pathname === "/auth") return null;

  const currentTokens = wallet ? wallet.tokenBalance : user?.tokenBalance ?? 0;
  const currentEscrow = wallet ? wallet.escrowBalance : user?.escrowBalance ?? 0;

  return (
    <header className="sticky top-0 z-40 w-full bg-iba-navy text-white shadow-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <a href="/explore" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-teal-400 flex items-center justify-center font-black text-xl text-white shadow-inner group-hover:scale-105 transition-transform">
              SX
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
                Skill<span className="text-teal-400">X</span>
              </span>
              <span className="hidden sm:block text-[10px] text-teal-200/80 uppercase tracking-widest font-semibold">
                Sukkur IBA University
              </span>
            </div>
          </a>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          <a
            href="/explore"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname === "/explore" || pathname === "/"
                ? "bg-white/15 text-white"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Compass className="w-4 h-4 text-teal-300" />
            Explore
          </a>
          <a
            href="/bookings"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname?.startsWith("/bookings")
                ? "bg-white/15 text-white"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4 text-teal-300" />
            Bookings
          </a>
          <a
            href="/wallet"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              pathname === "/wallet"
                ? "bg-white/15 text-white"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Coins className="w-4 h-4 text-amber-400" />
            Wallet
          </a>
        </nav>

        {/* User Balance & Profile */}
        <div className="flex items-center space-x-3">
          {isAuthenticated && user ? (
            <>
              {/* Wallet Pill */}
              <a
                href="/wallet"
                className="flex items-center space-x-2 bg-slate-900/60 hover:bg-slate-900/80 border border-amber-500/30 px-3 py-1.5 rounded-full transition-all text-xs font-semibold"
              >
                <div className="flex items-center gap-1 text-amber-400">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{currentTokens}</span>
                  <span className="hidden xs:inline text-white/70">Tokens</span>
                </div>
                {currentEscrow > 0 && (
                  <div className="flex items-center gap-0.5 text-blue-300 border-l border-white/20 pl-2">
                    <Lock className="w-3 h-3" />
                    <span>{currentEscrow}</span>
                  </div>
                )}
              </a>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 focus:outline-none p-1 rounded-full hover:ring-2 hover:ring-teal-400 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-xs shadow">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </button>

                {dropdownOpen && (
                  <div
                    onClick={() => setDropdownOpen(false)}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-50 text-slate-800 border border-slate-100"
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      <span className="inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700">
                        {user.department}
                      </span>
                    </div>

                    <a
                      href="/wallet"
                      className="block px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Coins className="w-4 h-4 text-amber-600" />
                      Manage Token Wallet
                    </a>

                    <button
                      onClick={logout}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <a
              href="/auth"
              className="bg-accent hover:bg-accent-hover text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
            >
              Sign In
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
