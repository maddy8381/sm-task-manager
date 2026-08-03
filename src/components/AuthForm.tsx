"use client";

import { useState } from "react";
import { login, signup, type AuthUser } from "@/lib/auth";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:ring-blue-950";
const labelClass = "mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400";

export function AuthForm({ onAuthenticated }: { onAuthenticated: (user: AuthUser, token: string) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result =
        mode === "signup"
          ? await signup({ name: name.trim(), email: email.trim(), password })
          : await login({ email: email.trim(), password });
      onAuthenticated(result.user, result.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {mode === "login" ? "Log in" : "Create your account"}
        </h1>
        <p className="mb-5 text-xs text-zinc-500 dark:text-zinc-400">
          {mode === "login"
            ? "Welcome back to Task Board."
            : "One-time setup — you'll stay signed in on this browser."}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "signup" ? (
            <div>
              <label className={labelClass}>Name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Your name"
              />
            </div>
          ) : null}
          <div>
            <label className={labelClass}>Email</label>
            <input
              autoFocus={mode === "login"}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
            />
          </div>

          {error ? <p className="text-xs text-red-500">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setMode((m) => (m === "login" ? "signup" : "login"));
            setError(null);
          }}
          className="mt-4 w-full text-center text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
