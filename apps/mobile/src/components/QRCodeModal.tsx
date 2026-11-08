import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { QrPayload } from "@skillx/shared-contracts";
import { Theme } from "../constants/theme";
import { mobileApiClient } from "../services/mobileApiClient";

interface QRCodeModalProps {
  sessionId: string;
  verificationPin?: string;
  campusHub: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeModal({
  sessionId,
  verificationPin,
  campusHub,
  isOpen,
  onClose
}: QRCodeModalProps) {
  const [qrPayload, setQrPayload] = useState<QrPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    async function fetchPayload() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await mobileApiClient.get(`/bookings/${sessionId}/qr-payload`);
        setQrPayload(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to generate QR code");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPayload();
  }, [isOpen, sessionId]);

  if (!isOpen) return null;

  const qrString = qrPayload ? JSON.stringify(qrPayload) : "";

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Physical Handshake QR</Text>
            <Text style={styles.subtitle}>Present to tutor at {campusHub}</Text>
          </View>

          {/* QR Display Area */}
          <View style={styles.qrContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color={Theme.colors.primary} />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : qrString ? (
              <QRCode
                value={qrString}
                size={220}
                color={Theme.colors.primary}
                backgroundColor="white"
              />
            ) : null}
          </View>

          {/* Fallback PIN Box */}
          {verificationPin && (
            <View style={styles.pinBox}>
              <Text style={styles.pinLabel}>4-Digit Fallback PIN</Text>
              <Text style={styles.pinCode}>{verificationPin}</Text>
            </View>
          )}

          <Text style={styles.instruction}>
            Scanning this code releases the 1 token locked in escrow to your tutor.
          </Text>

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  card: {
    backgroundColor: "white",
    borderRadius: Theme.borderRadius.xl,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10
  },
  header: {
    alignItems: "center",
    marginBottom: 20
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Theme.colors.primary
  },
  subtitle: {
    fontSize: 12,
    color: Theme.colors.muted,
    marginTop: 4
  },
  qrContainer: {
    padding: 16,
    backgroundColor: "white",
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    minHeight: 240,
    minWidth: 240,
    justifyContent: "center",
    alignItems: "center"
  },
  errorText: {
    color: Theme.colors.danger,
    fontSize: 12,
    textAlign: "center"
  },
  pinBox: {
    marginTop: 16,
    backgroundColor: Theme.colors.goldLight,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderRadius: Theme.borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: "center"
  },
  pinLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Theme.colors.gold,
    textTransform: "uppercase"
  },
  pinCode: {
    fontSize: 20,
    fontFamily: "monospace",
    fontWeight: "900",
    color: Theme.colors.primary,
    letterSpacing: 4
  },
  instruction: {
    fontSize: 11,
    color: Theme.colors.muted,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 16
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center"
  },
  closeBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700"
  }
});
