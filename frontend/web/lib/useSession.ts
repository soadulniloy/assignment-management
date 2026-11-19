"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "./auth";
import type { Role, Session } from "./types";

/**
 * Redirects to /login unless a session exists with the required role.
 * Returns the session once the check has passed, otherwise null.
 */
export function useRequireRole(role: Role): Session | null {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== role) {
      router.replace("/login");
      return;
    }
    setSession(s);
  }, [router, role]);

  return session;
}
