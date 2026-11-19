"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession, ROLE_HOME } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    router.replace(session ? ROLE_HOME[session.role] : "/login");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-500">Loading…</p>
    </main>
  );
}
