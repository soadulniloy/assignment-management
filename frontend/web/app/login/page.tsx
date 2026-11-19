"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, DEMO_MODE } from "@/lib/api";
import { saveLogin, ROLE_HOME } from "@/lib/auth";
import { Alert, Button, Field, inputCls } from "@/components/ui";
import { DemoBadge, ResetDemoButton } from "@/components/DemoMode";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@school.com", password: "Admin123!" },
  { role: "Teacher", email: "teacher@school.com", password: "Teacher123!" },
  { role: "Student", email: "student@school.com", password: "Student123!" },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loginWith(emailValue: string, passwordValue: string) {
    setError("");
    setBusy(true);
    try {
      const res = await api.login(emailValue.trim(), passwordValue);
      saveLogin(res);
      router.replace(ROLE_HOME[res.role]);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : DEMO_MODE
            ? "Login failed. Try one of the demo accounts below."
            : "Login failed. Make sure the API is running at " +
                (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5224") +
                "."
      );
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void loginWith(email, password);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-indigo-700">
            Assignment Manager
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to your dashboard
          </p>
          <div className="mt-2 flex justify-center">
            <DemoBadge detail />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.com"
                className={inputCls}
                disabled={busy}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className={inputCls}
                disabled={busy}
              />
            </Field>
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700">
            Try a demo account
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {DEMO_MODE
              ? "Seeded in your browser for this demo — no backend needed."
              : "Seeded in the backend database for evaluation."}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.role}
                variant="secondary"
                disabled={busy}
                onClick={() => void loginWith(account.email, account.password)}
              >
                {account.role}
              </Button>
            ))}
          </div>
          <dl className="mt-4 space-y-1 text-xs text-slate-500">
            {DEMO_ACCOUNTS.map((account) => (
              <div key={account.role} className="flex justify-between gap-2">
                <dt className="font-medium text-slate-600">{account.role}</dt>
                <dd>
                  {account.email} / {account.password}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex justify-center">
            <ResetDemoButton />
          </div>
        </div>
      </div>
    </main>
  );
}
