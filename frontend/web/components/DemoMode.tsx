"use client";

import { DEMO_MODE } from "@/lib/api";
import { resetDemoData } from "@/lib/demo";

/**
 * Small "Demo mode" badge. Renders nothing when the app talks to the real
 * API. With `detail`, it also shows the one-line explanation underneath.
 */
export function DemoBadge({ detail = false }: { detail?: boolean }) {
  if (!DEMO_MODE) return null;
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <span
        className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
        title="Demo mode — data is stored in your browser only"
      >
        Demo mode
      </span>
      {detail && (
        <span className="text-xs text-amber-700">
          Demo mode — data is stored in your browser only, no backend needed.
        </span>
      )}
    </span>
  );
}

/**
 * Clears the demo database (localStorage `am_demo_db`), re-seeds it, and
 * refreshes the current view. Renders nothing outside demo mode.
 */
export function ResetDemoButton() {
  if (!DEMO_MODE) return null;
  return (
    <button
      onClick={() => {
        resetDemoData();
        window.location.reload();
      }}
      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
      title="Clear the demo data in your browser and start over with the seeded accounts"
    >
      Reset demo data
    </button>
  );
}
