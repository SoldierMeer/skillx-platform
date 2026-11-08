import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Theme } from "../constants/theme";

interface TokenBadgeProps {
  tokenBalance: number;
  escrowBalance?: number;
}

export function TokenBadge({ tokenBalance, escrowBalance = 0 }: TokenBadgeProps) {
  return (
    <View style={styles.container}>
      <View style={styles.tokenPill}>
        <Text style={styles.icon}>🪙</Text>
        <Text style={styles.tokenText}>{tokenBalance} Tokens</Text>
      </View>
      {escrowBalance > 0 && (
        <View style={styles.escrowPill}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.escrowText}>{escrowBalance}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderRadius: Theme.borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)"
  },
  tokenPill: {
    flexDirection: "row",
    alignItems: "center"
  },
  icon: {
    fontSize: 12,
    marginRight: 4
  },
  tokenText: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "800"
  },
  escrowPill: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255, 255, 255, 0.2)",
    paddingLeft: 8,
    marginLeft: 8
  },
  escrowText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "700"
  }
});
