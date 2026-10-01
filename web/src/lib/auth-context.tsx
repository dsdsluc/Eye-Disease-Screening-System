"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  updateProfile as updateProfileRequest,
  type AuthUser,
  type ProfileUpdate,
} from "@/lib/account";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, fullName: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateProfile: (profile: ProfileUpdate) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await loginRequest(email, password);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const register = useCallback(async (email: string, fullName: string, password: string) => {
    const created = await registerRequest(email, fullName, password);
    setUser(created);
    return created;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (profile: ProfileUpdate) => {
    setUser(await updateProfileRequest(profile));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
