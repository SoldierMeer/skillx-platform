import { useState, useEffect, useCallback } from "react";
import * as Haptics from "expo-haptics";
import { UserProfile, Department, AuthResponse } from "@skillx/shared-contracts";
import { mobileApiClient } from "../services/mobileApiClient";
import { saveToken, saveUser, getToken, getUser, clearAuth } from "../services/authStorage";

export function useMobileAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadAuth() {
      try {
        const storedToken = await getToken();
        const storedUser = await getUser();
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } catch (err) {
        console.error("Error loading auth from SecureStore", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuth();
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await mobileApiClient.get("/auth/me");
      if (res.data?.user) {
        setUser(res.data.user);
        await saveUser(res.data.user);
        return res.data.user;
      }
    } catch {
      // Ignored
    }
    return null;
  }, []);

  const requestOtp = async (email: string, name: string, department: Department) => {
    const res = await mobileApiClient.post("/auth/request-otp", {
      email,
      name,
      department
    });
    return res.data;
  };

  const verifyOtp = async (email: string, otp: string) => {
    const res = await mobileApiClient.post("/auth/verify-otp", {
      email,
      otp
    });
    const authData: AuthResponse = res.data;

    await saveToken(authData.tokens.accessToken);
    await saveUser(authData.user);
    setToken(authData.tokens.accessToken);
    setUser(authData.user);

    // Provide haptic feedback on successful OTP verification
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics unavailable on emulator
    }

    return authData;
  };

  const logout = async () => {
    await clearAuth();
    setToken(null);
    setUser(null);
  };

  return {
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(token && user),
    requestOtp,
    verifyOtp,
    logout,
    refreshProfile,
    setUser
  };
}
