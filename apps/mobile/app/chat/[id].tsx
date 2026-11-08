import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Send, MapPin, ShieldAlert } from "lucide-react-native";
import { COLORS } from "../../src/constants/theme";
import { CAMPUS_HUBS, ChatMessage } from "@skillx/shared-contracts";
import { mobileApiClient } from "../../src/services/mobileApiClient";
import { useMobileAuth } from "../../src/hooks/useMobileAuth";
import { useMobileSocket } from "../../src/hooks/useMobileSocket";

export default function SessionChatScreen() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>();
  const { user } = useMobileAuth();
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // Fetch session meta
  const { data: session } = useQuery({
    queryKey: ["booking", sessionId],
    queryFn: async () => {
      const res = await mobileApiClient.get(`/bookings/${sessionId}`);
      return res.data.data;
    },
    enabled: !!sessionId,
  });

  // Socket setup
  const {
    messages,
    sendMessage,
    typingUser,
    sendTyping,
    isConnected,
  } = useMobileSocket(sessionId || "");

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText("");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(text);
  };

  const hubInfo = session ? CAMPUS_HUBS[session.campusHub as keyof typeof CAMPUS_HUBS] : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Campus Hub Meeting Banner */}
      <View style={styles.hubBanner}>
        <MapPin size={16} color={COLORS.navy} />
        <View style={styles.hubBannerTextWrapper}>
          <Text style={styles.hubBannerTitle}>
            Meeting Location: {hubInfo?.name || session?.campusHub || "IBA Meeting Hub"}
          </Text>
          <Text style={styles.hubBannerSub}>
            Physical handshake required via QR code to release escrowed tokens.
          </Text>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item.id || `${index}`}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No messages yet. Say hello to coordinate your campus meetup!
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.id;
          return (
            <View
              style={[
                styles.messageBubbleWrapper,
                isMe ? styles.myMessageWrapper : styles.peerMessageWrapper,
              ]}
            >
              {!isMe && <Text style={styles.senderLabel}>{item.senderName}</Text>}
              <View
                style={[
                  styles.messageBubble,
                  isMe ? styles.myMessageBubble : styles.peerMessageBubble,
                ]}
              >
                <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.peerMessageText]}>
                  {item.content}
                </Text>
              </View>
              <Text style={styles.timeLabel}>
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </Text>
            </View>
          );
        }}
      />

      {/* Typing indicator */}
      {typingUser ? (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{typingUser} is typing...</Text>
        </View>
      ) : null}

      {/* Chat Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.slate400}
          value={inputText}
          onChangeText={(text) => {
            setInputText(text);
            sendTyping();
          }}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Send size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate50,
  },
  hubBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderBottomWidth: 1,
    borderBottomColor: "#BFDBFE",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  hubBannerTextWrapper: {
    flex: 1,
  },
  hubBannerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.navy,
  },
  hubBannerSub: {
    fontSize: 11,
    color: COLORS.slate600,
    marginTop: 2,
  },
  messageList: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.slate400,
    textAlign: "center",
  },
  messageBubbleWrapper: {
    marginBottom: 12,
    maxWidth: "80%",
  },
  myMessageWrapper: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  peerMessageWrapper: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  senderLabel: {
    fontSize: 11,
    color: COLORS.slate500,
    marginBottom: 3,
    marginLeft: 4,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  myMessageBubble: {
    backgroundColor: COLORS.teal,
    borderBottomRightRadius: 4,
  },
  peerMessageBubble: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: "#FFFFFF",
  },
  peerMessageText: {
    color: COLORS.slate800,
  },
  timeLabel: {
    fontSize: 10,
    color: COLORS.slate400,
    marginTop: 3,
    marginHorizontal: 4,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  typingText: {
    fontSize: 11,
    fontStyle: "italic",
    color: COLORS.slate400,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.slate100,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    color: COLORS.slate900,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.teal,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.slate300,
  },
});
