import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { X, Camera as CameraIcon } from "lucide-react-native";
import { COLORS } from "../constants/theme";
import { mobileApiClient } from "../services/mobileApiClient";

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  sessionId: string;
  onSuccess: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  visible,
  onClose,
  sessionId,
  onSuccess,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanning(true);
      setVerifying(false);
    }
  }, [visible]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (!scanning || verifying) return;
    setScanning(false);
    setVerifying(true);

    try {
      const parsed = JSON.parse(data);
      if (!parsed.sessionId || !parsed.hash || !parsed.timestamp) {
        throw new Error("Invalid SkillX QR payload format");
      }

      if (parsed.sessionId !== sessionId) {
        Alert.alert(
          "Session Mismatch",
          "This QR code does not belong to this active session.",
          [{ text: "Retry", onPress: () => { setScanning(true); setVerifying(false); } }]
        );
        return;
      }

      // Haptic confirmation on read
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Verify QR handshake on backend
      await mobileApiClient.post(`/bookings/${sessionId}/verify-qr`, {
        sessionId: parsed.sessionId,
        learnerId: parsed.learnerId,
        timestamp: parsed.timestamp,
        hash: parsed.hash,
      });

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Alert.alert("Verified!", "Session verified & tokens released to your wallet.", [
        {
          text: "Done",
          onPress: () => {
            onClose();
            onSuccess();
          },
        },
      ]);
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Verification Failed", err.response?.data?.message || err.message || "Failed to verify QR handshake", [
        {
          text: "Retry",
          onPress: () => {
            setScanning(true);
            setVerifying(false);
          },
        },
      ]);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Peer QR Code</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {!permission ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.teal} />
          </View>
        ) : !permission.granted ? (
          <View style={styles.centerContainer}>
            <CameraIcon size={48} color={COLORS.navy} />
            <Text style={styles.permissionText}>
              SkillX requires camera access to scan physical session QR codes at campus hubs.
            </Text>
            <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
              <Text style={styles.permButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
            />

            {/* Target Reticle Overlay */}
            <View style={styles.overlay}>
              <View style={styles.reticle}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                {verifying && (
                  <View style={styles.verifyingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.verifyingText}>Verifying Handshake...</Text>
                  </View>
                )}
              </View>
              <Text style={styles.instruction}>
                Align the learner's QR code within the frame to verify attendance and release tokens.
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    height: 60,
    marginTop: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: COLORS.slate50,
  },
  permissionText: {
    fontSize: 14,
    color: COLORS.slate700,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
    lineHeight: 20,
  },
  permButton: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  cameraWrapper: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  reticle: {
    width: 250,
    height: 250,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: COLORS.teal,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  verifyingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  verifyingText: {
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 12,
    fontWeight: "600",
  },
  instruction: {
    color: "#E2E8F0",
    fontSize: 14,
    textAlign: "center",
    marginTop: 36,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
});
