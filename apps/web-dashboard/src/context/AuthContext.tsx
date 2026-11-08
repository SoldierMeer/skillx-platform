"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { UserProfile, Department, AuthResponse } from "@skillx/shared-contracts";
import { apiClient } from "@/lib/apiClient";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requestOtp: (email: string, name: string, department: Department) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (email: string, otp: string) => Promise<AuthResponse>;
  logout: () => void;
  refreshUser: () => Promise<UserProfile | null>;
  updateLocalUser: (updated: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from localStorage on client mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("skillx_token");
      const storedUser = localStorage.getItem("skillx_user");

      if (storedToken) {
        setToken(storedToken);
      }
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to parse stored auth state", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const res = await apiClient.get("/auth/me");
      if (res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem("skillx_user", JSON.stringify(res.data.user));
        return res.data.user;
      }
    } catch {
      // Token might be invalid
    }
    return null;
  }, []);

  // Fetch fresh user profile if token is present
  useEffect(() => {
    if (token) {
      refreshUser();
    }
  }, [token, refreshUser]);

  const requestOtp = async (
    email: string,
    name: string,
    department: Department
  ): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post("/auth/request-otp", {
      email,
      name,
      department
    });
    return res.data;
  };

  const verifyOtp = async (email: string, otp: string): Promise<AuthResponse> => {
    const res = await apiClient.post("/auth/verify-otp", {
      email,
      otp
    });
    const authData: AuthResponse = res.data;

    setToken(authData.tokens.accessToken);
    setUser(authData.user);
    localStorage.setItem("skillx_token", authData.tokens.accessToken);
    localStorage.setItem("skillx_user", JSON.stringify(authData.user));

    return authData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("skillx_token");
    localStorage.removeItem("skillx_user");
    window.location.href = "/auth";
  };

  const updateLocalUser = (updated: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      localStorage.setItem("skillx_user", JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        requestOtp,
        verifyOtp,
        logout,
        refreshUser,
        updateLocalUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
