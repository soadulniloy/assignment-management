"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/lib/auth";
import type { Role, Session } from "@/lib/types";
import { DemoBadge, ResetDemoButton } from "@/components/DemoMode";

const NAV: Record<Role, { href: string; label: string }[]> = {
  Admin: [{ href: "/admin", label: "Admin Dashboard" }],
  Teacher: [{ href: "/teacher", label: "Teacher Dashboard" }],
  Student: [{ href: "/student", label: "Student Dashboard" }],
};

export default function DashboardLayout({
  session,
  title,
  children,
}: {
  session: Session;
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-indigo-700">
              Assignment Manager
            </Link>
            <nav className="hidden gap-4 sm:flex">
              {NAV[session.role].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-slate-600 hover:text-indigo-600"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <DemoBadge />
            <ResetDemoButton />
            <span className="text-sm text-slate-600">
              {session.name}{" "}
              <span className="text-slate-400">({session.role})</span>
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {children}
      </main>
    </div>
  );
}
