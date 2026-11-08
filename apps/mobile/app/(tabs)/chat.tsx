import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Clock, MapPin, ChevronRight } from "lucide-react-native";
import { COLORS } from "../../src/constants/theme";
import { CAMPUS_HUBS } from "@skillx/shared-contracts";
import { mobileApiClient } from "../../src/services/mobileApiClient";
import { useMobileAuth } from "../../src/hooks/useMobileAuth";

interface ChatSession {
  id: string;
  learnerId: string;
  learnerName: string;
  tutorId: string;
  tutorName: string;
  skill: string;
  campusHub: string;
  status: string;
  scheduledTime: string;
}

export default function ChatListScreen() {
  const router = useRouter();
  const { user } = useMobileAuth();

  const { data: sessions = [], isLoading, refetch } = useQuery<ChatSession[]>({
    queryKey: ["chat-sessions"],
    queryFn: async () => {
      const res = await mobileApiClient.get("/bookings", {
        params: { role: "all" },
      });
      return (res.data.data || []).filter((s: ChatSession) =>
        ["accepted", "in_progress"].includes(s.status)
      );
    },
  });

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.teal} />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquare size={48} color={COLORS.slate300} />
              <Text style={styles.emptyTitle}>No Active Conversations</Text>
              <Text style={styles.emptySubtitle}>
                Chat rooms are automatically opened when a tutor accepts a booking request.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isLearner = user?.id === item.learnerId;
            const peerName = isLearner ? item.tutorName : item.learnerName;
            const hubInfo = CAMPUS_HUBS[item.campusHub as keyof typeof CAMPUS_HUBS];

            return (
              <TouchableOpacity
                style={styles.chatCard}
                onPress={() => router.push(`/chat/${item.id}`)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {peerName
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.chatDetails}>
                  <View style={styles.chatHeader}>
                    <Text style={styles.peerName}>{peerName}</Text>
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveText}>Active</Text>
                    </View>
                  </View>

                  <Text style={styles.skillTopic}>{item.skill}</Text>

                  <View style={styles.metaRow}>
                    <MapPin size={12} color={COLORS.teal} />
                    <Text style={styles.metaText}>{hubInfo?.name || item.campusHub}</Text>
                  </View>
                </View>

                <ChevronRight size={20} color={COLORS.slate400} />
              </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.slate700,
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.slate400,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.navy,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  chatDetails: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginRight: 8,
  },
  peerName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.slate900,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  skillTopic: {
    fontSize: 13,
    color: COLORS.teal,
    fontWeight: "600",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.slate500,
  },
});
