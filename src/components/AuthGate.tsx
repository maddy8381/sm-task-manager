"use client";

import { useEffect, useState } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthContextProvider } from "@/lib/auth-context";
import {
  clearStoredToken,
  fetchMe,
  getStoredToken,
  logout as logoutRequest,
  storeToken,
  type AuthUser,
} from "@/lib/auth";

type Status = "checking" | "authenticated" | "unauthenticated";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      // One-time check of localStorage on mount — nothing to defer through
      // a promise since there's no stored token to validate.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("unauthenticated");
      return;
    }
    fetchMe(token)
      .then((res) => {
        setUser(res.user);
        setStatus("authenticated");
      })
      .catch(() => {
        clearStoredToken();
        setStatus("unauthenticated");
      });
  }, []);

  function handleAuthenticated(nextUser: AuthUser, token: string) {
    storeToken(token);
    setUser(nextUser);
    setStatus("authenticated");
  }

  function handleLogout() {
    const token = getStoredToken();
    clearStoredToken();
    setUser(null);
    setStatus("unauthenticated");
    if (token) logoutRequest(token).catch(() => {});
  }

  if (status === "checking") {
    return <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-400">Loading…</div>;
  }

  if (status !== "authenticated" || !user) {
    return <AuthForm onAuthenticated={handleAuthenticated} />;
  }

  return <AuthContextProvider value={{ user, logout: handleLogout }}>{children}</AuthContextProvider>;
}
