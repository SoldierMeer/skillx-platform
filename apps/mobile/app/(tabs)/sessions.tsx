import React, { useState } from "react";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import {
  QrCode,
  Scan,
  MessageSquare,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
} from "lucide-react-native";
import { COLORS } from "../../src/constants/theme";
import { BookingStatus, CAMPUS_HUBS } from "@skillx/shared-contracts";
import { mobileApiClient } from "../../src/services/mobileApiClient";
import { useMobileAuth } from "../../src/hooks/useMobileAuth";
import { QRCodeModal } from "../../src/components/QRCodeModal";
import { QRScannerModal } from "../../src/components/QRScannerModal";

interface SessionItem {
  id: string;
  learnerId: string;
  learnerName: string;
  tutorId: string;
  tutorName: string;
  skill: string;
  campusHub: string;
  scheduledTime: string;
  durationHours: number;
  tokenCost: number;
  status: BookingStatus;
  verificationPin?: string;
}

export default function SessionsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useMobileAuth();

  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  // QR Modals state
  const [showQrSessionId, setShowQrSessionId] = useState<string | null>(null);
  const [scanQrSessionId, setScanQrSessionId] = useState<string | null>(null);

  const { data: sessions = [], isLoading, refetch } = useQuery<SessionItem[]>({
    queryKey: ["bookings"],
    queryFn: async () => {
      const res = await mobileApiClient.get("/bookings", {
        params: { role: "all" },
      });
      return res.data.data || [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: "accept" | "reject" | "cancel";
      reason?: string;
    }) => {
      const res = await mobileApiClient.patch(`/bookings/${id}/status`, {
        action,
        reason,
      });
      return res.data;
    },
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (err: any) => {
      Alert.alert("Action Failed", err.response?.data?.message || err.message || "Could not update status");
    },
  });

  const activeSessions = sessions.filter((s) =>
    ["pending", "accepted", "in_progress"].includes(s.status)
  );
  const historySessions = sessions.filter((s) =>
    ["completed", "cancelled", "rejected"].includes(s.status)
  );

  const displayedSessions = activeTab === "active" ? activeSessions : historySessions;

  const renderStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case "pending":
        return <Text style={[styles.statusBadge, styles.statusPending]}>Pending Confirmation</Text>;
      case "accepted":
        return <Text style={[styles.statusBadge, styles.statusAccepted]}>Confirmed / Escrow Locked</Text>;
      case "in_progress":
        return <Text style={[styles.statusBadge, styles.statusInProgress]}>In Progress</Text>;
      case "completed":
        return <Text style={[styles.statusBadge, styles.statusCompleted]}>Completed</Text>;
      case "cancelled":
        return <Text style={[styles.statusBadge, styles.statusCancelled]}>Cancelled</Text>;
      case "rejected":
        return <Text style={[styles.statusBadge, styles.statusCancelled]}>Declined</Text>;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Segmented Control */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "active" && styles.tabButtonActive]}
          onPress={() => setActiveTab("active")}
        >
          <Text style={[styles.tabButtonText, activeTab === "active" && styles.tabButtonTextActive]}>
            Active ({activeSessions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "history" && styles.tabButtonActive]}
          onPress={() => setActiveTab("history")}
        >
          <Text style={[styles.tabButtonText, activeTab === "history" && styles.tabButtonTextActive]}>
            History ({historySessions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.teal} />
        </View>
      ) : (
        <FlatList
          data={displayedSessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Clock size={44} color={COLORS.slate300} />
              <Text style={styles.emptyTitle}>
                {activeTab === "active" ? "No Active Sessions" : "No Session History"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === "active"
                  ? "Book a tutor or share your skills from the Explore tab."
                  : "Completed and cancelled sessions will appear here."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isLearner = user?.id === item.learnerId;
            const peerName = isLearner ? item.tutorName : item.learnerName;
            const hubInfo = CAMPUS_HUBS[item.campusHub as keyof typeof CAMPUS_HUBS];

            return (
              <View style={styles.sessionCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View>
                    <View style={styles.badgeRow}>
                      <View style={[styles.roleBadge, isLearner ? styles.roleLearner : styles.roleTutor]}>
                        <Text style={[styles.roleText, isLearner ? styles.roleTextLearner : styles.roleTextTutor]}>
                          {isLearner ? "LEARNER" : "TUTOR"}
                        </Text>
                      </View>
                      {renderStatusBadge(item.status)}
                    </View>
                    <Text style={styles.skillTitle}>{item.skill}</Text>
                    <Text style={styles.peerText}>
                      with <Text style={{ fontWeight: "700" }}>{peerName}</Text>
                    </Text>
                  </View>
                  <View style={styles.tokenEscrowBadge}>
                    <Text style={styles.tokenEscrowText}>{item.tokenCost} Token</Text>
                  </View>
                </View>

                {/* Hub & Time Info */}
                <View style={styles.metaSection}>
                  <View style={styles.metaRow}>
                    <MapPin size={14} color={COLORS.teal} />
                    <Text style={styles.metaText}>{hubInfo?.name || item.campusHub}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Clock size={14} color={COLORS.slate400} />
                    <Text style={styles.metaText}>
                      {new Date(item.scheduledTime).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>

                {/* Action Controls */}
                {/* 1. Pending as Tutor */}
                {!isLearner && item.status === "pending" && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnDecline]}
                      onPress={() =>
                        updateStatusMutation.mutate({ id: item.id, action: "reject" })
                      }
                    >
                      <XCircle size={16} color="#DC2626" />
                      <Text style={styles.btnDeclineText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnAccept]}
                      onPress={() =>
                        updateStatusMutation.mutate({ id: item.id, action: "accept" })
                      }
                    >
                      <CheckCircle2 size={16} color="#FFFFFF" />
                      <Text style={styles.btnAcceptText}>Accept Session</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 2. Pending as Learner */}
                {isLearner && item.status === "pending" && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnCancel]}
                      onPress={() =>
                        updateStatusMutation.mutate({ id: item.id, action: "cancel" })
                      }
                    >
                      <Text style={styles.btnCancelText}>Cancel Request (Refund Token)</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 3. Accepted or In-Progress */}
                {["accepted", "in_progress"].includes(item.status) && (
                  <View style={styles.inProgressSection}>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.chatButton}
                        onPress={() => router.push(`/chat/${item.id}`)}
                      >
                        <MessageSquare size={16} color={COLORS.navy} />
                        <Text style={styles.chatButtonText}>Chat</Text>
                      </TouchableOpacity>

                      {isLearner ? (
                        <TouchableOpacity
                          style={styles.qrButton}
                          onPress={() => setShowQrSessionId(item.id)}
                        >
                          <QrCode size={16} color="#FFFFFF" />
                          <Text style={styles.qrButtonText}>Show QR Handshake</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.scanButton}
                          onPress={() => setScanQrSessionId(item.id)}
                        >
                          <Scan size={16} color="#FFFFFF" />
                          <Text style={styles.scanButtonText}>Scan Learner QR</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Verification PIN Fallback Info */}
                    {isLearner && item.verificationPin && (
                      <View style={styles.pinNotice}>
                        <ShieldCheck size={14} color={COLORS.gold} />
                        <Text style={styles.pinNoticeText}>
                          PIN: <Text style={{ fontWeight: "800" }}>{item.verificationPin}</Text> (Share only in person)
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Completed Session History */}
                {item.status === "completed" && (
                  <View style={styles.completedNotice}>
                    <CheckCircle2 size={16} color="#16A34A" />
                    <Text style={styles.completedText}>
                      Session Completed — Tokens Released to Tutor
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Show QR Modal (Learner) */}
      {showQrSessionId && (
        <QRCodeModal
          visible={!!showQrSessionId}
          onClose={() => setShowQrSessionId(null)}
          sessionId={showQrSessionId}
          verificationPin={
            sessions.find((s) => s.id === showQrSessionId)?.verificationPin
          }
        />
      )}

      {/* Scan QR Modal (Tutor) */}
      {scanQrSessionId && (
        <QRScannerModal
          visible={!!scanQrSessionId}
          onClose={() => setScanQrSessionId(null)}
          sessionId={scanQrSessionId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
            queryClient.invalidateQueries({ queryKey: ["wallet"] });
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#EFF6FF",
  },
  tabButtonText: {
    fontSize: 14,
    color: COLORS.slate500,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: COLORS.navy,
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  emptyContainer: {
    paddingVertical: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.slate700,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.slate400,
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleLearner: {
    backgroundColor: "#EFF6FF",
  },
  roleTutor: {
    backgroundColor: "#F0FDF4",
  },
  roleText: {
    fontSize: 10,
    fontWeight: "800",
  },
  roleTextLearner: {
    color: COLORS.navy,
  },
  roleTextTutor: {
    color: "#16A34A",
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
    color: COLORS.gold,
  },
  statusAccepted: {
    backgroundColor: "#ECFDF5",
    color: "#059669",
  },
  statusInProgress: {
    backgroundColor: "#F3E8FF",
    color: "#7E22CE",
  },
  statusCompleted: {
    backgroundColor: "#E0E7FF",
    color: COLORS.navy,
  },
  statusCancelled: {
    backgroundColor: "#FEE2E2",
    color: "#DC2626",
  },
  skillTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.slate900,
  },
  peerText: {
    fontSize: 13,
    color: COLORS.slate500,
    marginTop: 2,
  },
  tokenEscrowBadge: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tokenEscrowText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.gold,
  },
  metaSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate100,
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.slate600,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnDecline: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  btnDeclineText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 13,
  },
  btnAccept: {
    backgroundColor: COLORS.teal,
  },
  btnAcceptText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  btnCancel: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: COLORS.slate300,
  },
  btnCancelText: {
    color: COLORS.slate700,
    fontWeight: "600",
    fontSize: 13,
  },
  inProgressSection: {
    marginTop: 12,
  },
  chatButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  chatButtonText: {
    color: COLORS.navy,
    fontWeight: "700",
    fontSize: 13,
  },
  qrButton: {
    flex: 2,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.teal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  qrButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  scanButton: {
    flex: 2,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  scanButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  pinNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  pinNoticeText: {
    fontSize: 12,
    color: COLORS.gold,
  },
  completedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#F0FDF4",
    padding: 8,
    borderRadius: 6,
  },
  completedText: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "600",
  },
});
