"use client";

import { Cctv, History, Info, LayoutGrid } from "lucide-react";
import type { Tab } from "~/domain/types";

const STROKE = 1.5;

const ITEMS = [
  { value: "panel", label: "Panel", icon: LayoutGrid },
  { value: "historial", label: "Historial", icon: History },
  { value: "camara", label: "Cámara IA", icon: Cctv },
  { value: "sistema", label: "Sistema", icon: Info },
] as const satisfies readonly { value: Tab; label: string; icon: typeof LayoutGrid }[];

export function NavRail({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  return (
    <nav className="fg-rail" aria-label="Navegación principal">
      <span className="fg-rail-logo" aria-hidden>
        FG
      </span>

      {ITEMS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          className={`fg-rail-btn ${tab === value ? "fg-rail-btn-active" : ""}`}
          onClick={() => onTab(value)}
          aria-current={tab === value ? "page" : undefined}
        >
          <Icon size={22} strokeWidth={STROKE} aria-hidden />
          {label}
        </button>
      ))}

      <div className="fg-rail-live">
        <span className="fg-rail-live-dot" aria-hidden />
        <span className="fg-rail-live-text">En vivo</span>
      </div>
    </nav>
  );
}
