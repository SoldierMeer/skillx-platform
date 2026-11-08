import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Coins,
  Lock,
  Award,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  LogOut,
  GraduationCap,
} from "lucide-react-native";
import { COLORS } from "../../src/constants/theme";
import { TransactionType } from "@skillx/shared-contracts";
import { mobileApiClient } from "../../src/services/mobileApiClient";
import { useMobileAuth } from "../../src/hooks/useMobileAuth";

interface TransactionItem {
  id: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  sessionId?: string;
}

export default function WalletScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useMobileAuth();

  const { data: ledger = [], isLoading, refetch } = useQuery<TransactionItem[]>({
    queryKey: ["wallet-transactions"],
    queryFn: async () => {
      const res = await mobileApiClient.get("/wallet/transactions");
      return res.data.data || [];
    },
  });

  const handleRefresh = async () => {
    await refreshUser();
    await refetch();
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out of SkillX?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const renderTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case "escrow_lock":
        return <ArrowUpRight size={18} color="#DC2626" />;
      case "escrow_release":
      case "initial_grant":
      case "escrow_refund":
        return <ArrowDownLeft size={18} color="#16A34A" />;
      default:
        return <Coins size={18} color={COLORS.navy} />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Profile Info */}
      <View style={styles.profileSection}>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.name || "Student"}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <Text style={styles.profileDept}>{user?.department}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color="#DC2626" />
        </TouchableOpacity>
      </View>

      {/* Balance Cards Carousel / Row */}
      <View style={styles.balanceGrid}>
        {/* Available Balance */}
        <View style={[styles.balanceCard, styles.availableCard]}>
          <View style={styles.cardIconRow}>
            <Coins size={22} color={COLORS.gold} />
            <Text style={styles.cardBadge}>Available</Text>
          </View>
          <Text style={styles.balanceAmount}>{user?.tokenBalance ?? 0}</Text>
          <Text style={styles.balanceLabel}>SkillX Tokens</Text>
        </View>

        {/* Escrow Locked */}
        <View style={[styles.balanceCard, styles.escrowCard]}>
          <View style={styles.cardIconRow}>
            <Lock size={20} color={COLORS.navy} />
            <Text style={[styles.cardBadge, { color: COLORS.navy }]}>Locked</Text>
          </View>
          <Text style={[styles.balanceAmount, { color: COLORS.navy }]}>
            {user?.tokensInEscrow ?? 0}
          </Text>
          <Text style={styles.balanceLabel}>In Escrow</Text>
        </View>

        {/* Lifetime Earned */}
        <View style={[styles.balanceCard, styles.earnedCard]}>
          <View style={styles.cardIconRow}>
            <Award size={20} color={COLORS.teal} />
            <Text style={[styles.cardBadge, { color: COLORS.teal }]}>Earned</Text>
          </View>
          <Text style={[styles.balanceAmount, { color: COLORS.teal }]}>
            {user?.tokensEarned ?? 0}
          </Text>
          <Text style={styles.balanceLabel}>Lifetime Hours</Text>
        </View>
      </View>

      {/* Ledger Header */}
      <View style={styles.ledgerHeader}>
        <Text style={styles.ledgerTitle}>ACID Transaction Ledger</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <RefreshCw size={15} color={COLORS.teal} />
          <Text style={styles.refreshText}>Sync</Text>
        </TouchableOpacity>
      </View>

      {/* Ledger List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.teal} />
        </View>
      ) : (
        <FlatList
          data={ledger}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={handleRefresh}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Transactions</Text>
              <Text style={styles.emptySubtitle}>
                Your token transfers and escrow releases will be logged here.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isNegative = item.type === "escrow_lock";
            return (
              <View style={styles.txRow}>
                <View style={styles.txIconContainer}>{renderTransactionIcon(item.type)}</View>

                <View style={styles.txDetails}>
                  <Text style={styles.txDescription}>
                    {item.description || item.type.replace(/_/g, " ").toUpperCase()}
                  </Text>
                  <Text style={styles.txDate}>
                    {new Date(item.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>

                <View style={styles.txAmountWrapper}>
                  <Text style={[styles.txAmount, isNegative ? styles.txNegative : styles.txPositive]}>
                    {isNegative ? "-" : "+"}
                    {item.amount} Token
                  </Text>
                  <Text style={styles.balanceAfterText}>Bal: {item.balanceAfter}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate50,
  },
  profileSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.navy,
  },
  profileEmail: {
    fontSize: 12,
    color: COLORS.slate500,
    marginTop: 2,
  },
  profileDept: {
    fontSize: 12,
    color: COLORS.teal,
    fontWeight: "600",
    marginTop: 2,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  balanceGrid: {
    flexDirection: "row",
    padding: 16,
    gap: 10,
  },
  balanceCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  availableCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  escrowCard: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  earnedCard: {
    backgroundColor: "#F0FDFA",
    borderColor: "#99F6E4",
  },
  cardIconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.gold,
    textTransform: "uppercase",
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.gold,
    marginTop: 8,
  },
  balanceLabel: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 2,
    fontWeight: "500",
  },
  ledgerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  ledgerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.navy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  refreshText: {
    fontSize: 12,
    color: COLORS.teal,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 8,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.slate600,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.slate400,
    marginTop: 4,
    textAlign: "center",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  txIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.slate100,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txDescription: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.slate800,
  },
  txDate: {
    fontSize: 11,
    color: COLORS.slate400,
    marginTop: 2,
  },
  txAmountWrapper: {
    alignItems: "flex-end",
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  txPositive: {
    color: "#16A34A",
  },
  txNegative: {
    color: "#DC2626",
  },
  balanceAfterText: {
    fontSize: 10,
    color: COLORS.slate400,
    marginTop: 2,
  },
});
