"use client";

import React from "react";
import {
  Coins,
  Lock,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Gift,
  ShieldCheck,
  Info
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";

export default function WalletPage() {
  const { user } = useAuth();
  const { data: wallet, isLoading, refetch, isFetching } = useWallet();

  const tokenBalance = wallet ? wallet.tokenBalance : user?.tokenBalance ?? 0;
  const escrowBalance = wallet ? wallet.escrowBalance : user?.escrowBalance ?? 0;
  const totalEarned = wallet ? wallet.totalEarned : 0;
  const totalSpent = wallet ? wallet.totalSpent : 0;
  const transactions = wallet?.recentTransactions || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            SkillX Token Ledger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ACID double-spend protected campus token economy.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Main Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="bg-gradient-to-tr from-amber-600 to-amber-500 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-amber-100">
              Available Tokens
            </span>
            <Coins className="w-5 h-5 text-amber-200" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black">{tokenBalance}</span>
            <span className="text-xs font-bold text-amber-100">Tokens</span>
          </div>
          <p className="text-[11px] text-amber-100/90 mt-2">
            Ready to spend on booking peer tutoring sessions
          </p>
        </div>

        {/* In Escrow */}
        <div className="bg-gradient-to-tr from-slate-900 to-iba-navy text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-teal-300">
              Locked In Escrow
            </span>
            <Lock className="w-5 h-5 text-teal-300" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black">{escrowBalance}</span>
            <span className="text-xs font-bold text-slate-300">Tokens</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-2">
            Reserved for pending & accepted sessions
          </p>
        </div>

        {/* Total Earned */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
              Lifetime Earned
            </span>
            <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900">{totalEarned}</span>
            <span className="text-xs font-bold text-slate-500">Tokens</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Earned by tutoring Sukkur IBA peers
          </p>
        </div>
      </div>

      {/* Economics Explainer Banner */}
      <div className="bg-teal-50/70 border border-teal-200/80 rounded-3xl p-5 flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs text-teal-950 space-y-1">
          <h4 className="font-extrabold text-sm text-teal-900">
            How Dual-Token Economics Works
          </h4>
          <p className="text-teal-800/90 leading-relaxed">
            • <strong>1 Token = 1 Hour</strong> of verified peer tutoring.<br />
            • When you book a session, 1 token is temporarily locked in an ACID escrow ledger.<br />
            • The token is only released to the tutor once the 4-digit physical handshake PIN is verified at the campus hub.
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
        <h3 className="text-base font-extrabold text-slate-900">
          Recent Audit Ledger Transactions
        </h3>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isPositive =
                tx.type === "promo_credit" || tx.type === "escrow_release";
              const formattedDate = new Date(tx.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });

              return (
                <div
                  key={tx.id}
                  className="py-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                        tx.type === "promo_credit"
                          ? "bg-amber-100 text-amber-700"
                          : tx.type === "escrow_release"
                          ? "bg-emerald-100 text-emerald-700"
                          : tx.type === "escrow_lock"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {tx.type === "promo_credit" ? (
                        <Gift className="w-4 h-4" />
                      ) : tx.type === "escrow_release" ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : tx.type === "escrow_lock" ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 capitalize">
                        {tx.type.replace("_", " ")}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {tx.transactionId} &bull; {formattedDate}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-black text-sm ${
                        isPositive ? "text-emerald-600" : "text-slate-800"
                      }`}
                    >
                      {isPositive ? `+${tx.amount}` : `-${tx.amount}`} Token
                    </span>
                    <span className="block text-[10px] text-slate-400 capitalize">
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No transactions found yet. Your registration promo tokens and bookings will be listed here.
          </div>
        )}
      </div>
    </div>
  );
}
