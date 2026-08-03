"use client";

import { createContext, useContext } from "react";
import type { AuthUser } from "@/lib/auth";

type AuthContextValue = { user: AuthUser; logout: () => void };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthContextProvider({
  value,
  children,
}: {
  value: AuthContextValue;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthGate");
  return ctx;
}
