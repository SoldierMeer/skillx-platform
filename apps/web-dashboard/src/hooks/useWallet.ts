"use client";

import { useQuery } from "@tanstack/react-query";
import { WalletSummary } from "@skillx/shared-contracts";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "./useAuth";

export function useWallet() {
  const { isAuthenticated } = useAuth();

  return useQuery<WalletSummary>({
    queryKey: ["walletSummary"],
    queryFn: async () => {
      const res = await apiClient.get("/wallet");
      return res.data.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000 // Refetch every 30 seconds
  });
}
