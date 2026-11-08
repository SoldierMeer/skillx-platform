import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Search, Star, BookOpen, Clock, Calendar, Check } from "lucide-react-native";
import { COLORS } from "../../src/constants/theme";
import { CampusHub, CampusHubEnum } from "@skillx/shared-contracts";
import { mobileApiClient } from "../../src/services/mobileApiClient";
import { useMobileAuth } from "../../src/hooks/useMobileAuth";
import { CampusHubPicker } from "../../src/components/CampusHubPicker";
import { TokenBadge } from "../../src/components/TokenBadge";

const DEPARTMENTS = [
  "All",
  "Computer Science",
  "Software Engineering",
  "Business Administration",
  "Electrical Engineering",
  "Mathematics",
];

interface PeerUser {
  id: string;
  name: string;
  email: string;
  department: string;
  skillsOffered: string[];
  skillsWanted: string[];
  rating: number;
  reviewCount: number;
  tokenBalance: number;
}

export default function ExploreScreen() {
  const queryClient = useQueryClient();
  const { user } = useMobileAuth();

  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");

  // Booking Modal State
  const [selectedTutor, setSelectedTutor] = useState<PeerUser | null>(null);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedHub, setSelectedHub] = useState<CampusHub>(CampusHubEnum.LIBRARY_GROUND);
  const [scheduledHoursAhead, setScheduledHoursAhead] = useState(24);

  // Fetch tutors/peers
  const { data: peers = [], isLoading, refetch } = useQuery<PeerUser[]>({
    queryKey: ["peers", search, selectedDept],
    queryFn: async () => {
      const res = await mobileApiClient.get("/skills/search", {
        params: {
          q: search || undefined,
          department: selectedDept !== "All" ? selectedDept : undefined,
        },
      });
      return res.data.data || [];
    },
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTutor || !selectedSkill) return;
      const scheduledTime = new Date(Date.now() + scheduledHoursAhead * 60 * 60 * 1000).toISOString();
      const res = await mobileApiClient.post("/bookings", {
        tutorId: selectedTutor.id,
        skill: selectedSkill,
        campusHub: selectedHub,
        scheduledTime,
        durationHours: 1,
      });
      return res.data;
    },
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Session Booked!",
        "1 Token has been locked into escrow. The tutor must confirm to accept.",
        [{ text: "OK", onPress: () => setSelectedTutor(null) }]
      );
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: async (err: any) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Booking Failed", err.response?.data?.message || err.message || "Could not book session");
    },
  });

  const openBooking = (tutor: PeerUser) => {
    if (user && user.id === tutor.id) {
      Alert.alert("Anti-Self Trading", "You cannot book a skill session with yourself.");
      return;
    }
    if (user && user.tokenBalance < 1) {
      Alert.alert("Insufficient Tokens", "You need at least 1 Token in your balance to book a session.");
      return;
    }
    setSelectedTutor(tutor);
    setSelectedSkill(tutor.skillsOffered[0] || "General Tutoring");
    setSelectedHub(CampusHubEnum.LIBRARY_GROUND);
    setScheduledHoursAhead(24);
  };

  const filteredPeers = peers.filter((p) => p.id !== user?.id);

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBarContainer}>
        <Search size={18} color={COLORS.slate400} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by skill, tutor, topic..."
          placeholderTextColor={COLORS.slate400}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Department Filter Pills */}
      <View style={styles.deptFilterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.deptList}
        >
          {DEPARTMENTS.map((dept) => {
            const isSelected = selectedDept === dept;
            return (
              <TouchableOpacity
                key={dept}
                style={[styles.deptPill, isSelected && styles.deptPillActive]}
                onPress={() => setSelectedDept(dept)}
              >
                <Text style={[styles.deptPillText, isSelected && styles.deptPillTextActive]}>
                  {dept}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tutor List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.teal} />
          <Text style={styles.loadingText}>Discovering IBA campus peers...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPeers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BookOpen size={48} color={COLORS.slate300} />
              <Text style={styles.emptyTitle}>No Tutors Found</Text>
              <Text style={styles.emptySubtitle}>Try searching for another skill or department</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.tutorCard}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.tutorInfo}>
                  <Text style={styles.tutorName}>{item.name}</Text>
                  <Text style={styles.tutorDept}>{item.department}</Text>
                  <View style={styles.ratingRow}>
                    <Star size={14} color={COLORS.gold} fill={COLORS.gold} />
                    <Text style={styles.ratingText}>
                      {item.rating.toFixed(1)}{" "}
                      <Text style={styles.reviewCount}>({item.reviewCount} reviews)</Text>
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.skillsSection}>
                <Text style={styles.skillsLabel}>Offered Skills:</Text>
                <View style={styles.skillsRow}>
                  {item.skillsOffered.map((skill, idx) => (
                    <View key={idx} style={styles.skillBadge}>
                      <Text style={styles.skillBadgeText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => openBooking(item)}
              >
                <Text style={styles.bookButtonText}>Book 1-Hour Session (1 Token)</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Booking Modal */}
      {selectedTutor && (
        <Modal
          visible={!!selectedTutor}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedTutor(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Book Session with {selectedTutor.name}</Text>
              <Text style={styles.modalSubtitle}>Escrow Deposit: 1 SkillX Token</Text>

              <Text style={styles.modalSectionLabel}>Select Skill</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {selectedTutor.skillsOffered.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.skillSelectChip, selectedSkill === s && styles.skillSelectChipActive]}
                    onPress={() => setSelectedSkill(s)}
                  >
                    <Text style={[styles.skillSelectText, selectedSkill === s && styles.skillSelectTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <CampusHubPicker selectedHub={selectedHub} onSelectHub={setSelectedHub} />

              <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>Schedule</Text>
              <View style={styles.scheduleRow}>
                {[
                  { label: "Tomorrow", hours: 24 },
                  { label: "In 2 Days", hours: 48 },
                  { label: "In 3 Days", hours: 72 },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.hours}
                    style={[
                      styles.scheduleChip,
                      scheduledHoursAhead === item.hours && styles.scheduleChipActive,
                    ]}
                    onPress={() => setScheduledHoursAhead(item.hours)}
                  >
                    <Clock size={14} color={scheduledHoursAhead === item.hours ? COLORS.teal : COLORS.slate500} />
                    <Text
                      style={[
                        styles.scheduleChipText,
                        scheduledHoursAhead === item.hours && styles.scheduleChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setSelectedTutor(null)}
                  disabled={bookMutation.isPending}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => bookMutation.mutate()}
                  disabled={bookMutation.isPending}
                >
                  {bookMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Confirm Escrow (1 Token)</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate50,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.slate900,
  },
  deptFilterWrapper: {
    paddingVertical: 4,
  },
  deptList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  deptPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  deptPillActive: {
    backgroundColor: COLORS.navy,
    borderColor: COLORS.navy,
  },
  deptPillText: {
    fontSize: 13,
    color: COLORS.slate600,
    fontWeight: "500",
  },
  deptPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.slate500,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
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
  },
  tutorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.navy,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  tutorInfo: {
    flex: 1,
  },
  tutorName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.slate900,
  },
  tutorDept: {
    fontSize: 13,
    color: COLORS.slate500,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.slate800,
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: COLORS.slate400,
    fontWeight: "400",
  },
  skillsSection: {
    marginTop: 12,
  },
  skillsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.slate500,
    marginBottom: 6,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  skillBadge: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  skillBadgeText: {
    fontSize: 12,
    color: COLORS.navy,
    fontWeight: "500",
  },
  bookButton: {
    backgroundColor: COLORS.navy,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 14,
  },
  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.navy,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.gold,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 16,
  },
  modalSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.slate700,
    marginBottom: 8,
  },
  skillSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.slate100,
    marginRight: 8,
  },
  skillSelectChipActive: {
    backgroundColor: COLORS.navy,
  },
  skillSelectText: {
    fontSize: 13,
    color: COLORS.slate700,
    fontWeight: "500",
  },
  skillSelectTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scheduleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  scheduleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.slate300,
  },
  scheduleChipActive: {
    borderColor: COLORS.teal,
    backgroundColor: "#F0FDFA",
  },
  scheduleChipText: {
    fontSize: 12,
    color: COLORS.slate600,
  },
  scheduleChipTextActive: {
    color: COLORS.teal,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.slate300,
    alignItems: "center",
  },
  cancelBtnText: {
    color: COLORS.slate700,
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: COLORS.teal,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
