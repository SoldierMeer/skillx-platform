import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { GraduationCap, Mail, KeyRound, ArrowRight, ArrowLeft } from "lucide-react-native";
import { COLORS } from "../../src/constants/theme";
import { useMobileAuth } from "../../src/hooks/useMobileAuth";

export default function LoginScreen() {
  const router = useRouter();
  const { requestOtp, verifyOtp, user, isLoading } = useMobileAuth();

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const otpInputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (user) {
      router.replace("/(tabs)/explore");
    }
  }, [user]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const validateEmail = (val: string) => {
    setEmail(val);
    setErrorMsg("");
    if (!val.trim()) {
      setEmailError("Institutional email is required");
      return false;
    }
    if (!val.trim().toLowerCase().endsWith("@iba-suk.edu.pk")) {
      setEmailError("Only @iba-suk.edu.pk institutional emails are permitted");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSendOtp = async () => {
    if (!validateEmail(email)) return;
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await requestOtp(email.trim().toLowerCase());
      setStep("otp");
      setCooldown(60);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to send OTP code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    setErrorMsg("");
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto advance focus
    if (text && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setErrorMsg("Please enter complete 6-digit OTP code");
      return;
    }
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await verifyOtp(email.trim().toLowerCase(), code);
      router.replace("/(tabs)/explore");
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Invalid OTP code");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <GraduationCap size={40} color={COLORS.teal} />
          </View>
          <Text style={styles.appTitle}>SkillX</Text>
          <Text style={styles.appSubtitle}>Sukkur IBA Peer Skill Exchange</Text>
          <View style={styles.campusTag}>
            <Text style={styles.campusTagText}>RESTRICTED TO @iba-suk.edu.pk</Text>
          </View>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          {errorMsg ? (
            <View style={styles.errorAlert}>
              <Text style={styles.errorAlertText}>{errorMsg}</Text>
            </View>
          ) : null}

          {step === "email" ? (
            <View>
              <Text style={styles.label}>Campus Email Address</Text>
              <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
                <Mail size={20} color={COLORS.slate400} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="student.name@iba-suk.edu.pk"
                  placeholderTextColor={COLORS.slate400}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={validateEmail}
                  editable={!isSubmitting}
                />
              </View>
              {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!email.trim() || !!emailError || isSubmitting) && styles.buttonDisabled,
                ]}
                onPress={handleSendOtp}
                disabled={!email.trim() || !!emailError || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Send Login Code</Text>
                    <ArrowRight size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep("email")}
                disabled={isSubmitting}
              >
                <ArrowLeft size={16} color={COLORS.navy} />
                <Text style={styles.backButtonText}>Change email</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Enter 6-digit Verification Code</Text>
              <Text style={styles.otpSubtext}>
                Sent to <Text style={{ fontWeight: "600" }}>{email}</Text>
              </Text>

              <View style={styles.otpGrid}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(el) => (otpInputs.current[i] = el)}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onChangeText={(txt) => handleOtpChange(txt, i)}
                    onKeyPress={(e) => handleOtpKeyPress(e, i)}
                    editable={!isSubmitting}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (otp.join("").length !== 6 || isSubmitting) && styles.buttonDisabled,
                ]}
                onPress={handleVerifyOtp}
                disabled={otp.join("").length !== 6 || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <KeyRound size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Verify & Enter</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                {cooldown > 0 ? (
                  <Text style={styles.resendCooldown}>Resend code in {cooldown}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOtp} disabled={isSubmitting}>
                    <Text style={styles.resendLink}>Didn't receive code? Resend</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate50,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.navy,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.navy,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: COLORS.slate500,
    marginTop: 4,
  },
  campusTag: {
    marginTop: 12,
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  campusTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.navy,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.slate200,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.slate700,
    marginBottom: 8,
  },
  otpSubtext: {
    fontSize: 13,
    color: COLORS.slate500,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.slate200,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: COLORS.slate900,
  },
  fieldError: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 6,
  },
  primaryButton: {
    backgroundColor: COLORS.navy,
    height: 48,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 13,
    color: COLORS.navy,
    fontWeight: "600",
    marginLeft: 6,
  },
  otpGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  otpBox: {
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.slate300,
    borderRadius: 8,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: COLORS.navy,
    backgroundColor: "#F8FAFC",
  },
  otpBoxFilled: {
    borderColor: COLORS.teal,
    backgroundColor: "#FFFFFF",
  },
  resendContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  resendCooldown: {
    fontSize: 13,
    color: COLORS.slate400,
  },
  resendLink: {
    fontSize: 13,
    color: COLORS.teal,
    fontWeight: "600",
  },
  errorAlert: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorAlertText: {
    color: "#B91C1C",
    fontSize: 13,
  },
});
