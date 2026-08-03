"use client";

import { useAuth } from "@/lib/auth-context";

export function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button
      type="button"
      onClick={logout}
      className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
    >
      Log out
    </button>
  );
}
