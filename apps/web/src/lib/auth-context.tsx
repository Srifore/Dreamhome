"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, clearTokens, getAccessToken, setTokens } from "./api";
import type { AuthenticatedUser } from "./types";

interface AuthContextValue {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<AuthenticatedUser>("/auth/me")
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const tokens = await api.post<{ accessToken: string; refreshToken: string }>(
      "/auth/login",
      { email, password },
      { skipAuth: true },
    );
    setTokens(tokens.accessToken, tokens.refreshToken);
    const me = await api.get<AuthenticatedUser>("/auth/me");
    setUser(me);
    router.push("/");
  }

  function logout() {
    clearTokens();
    setUser(null);
    router.push("/login");
  }

  function hasPermission(permission: string) {
    if (!user) return false;
    return user.permissions.includes("*") || user.permissions.includes(permission);
  }

  /** Re-fetches the current account after a profile change (e.g. email) so the UI (sidebar,
   *  profile page) reflects it immediately without requiring a full re-login. */
  async function refreshUser() {
    const me = await api.get<AuthenticatedUser>("/auth/me");
    setUser(me);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
