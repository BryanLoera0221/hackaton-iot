"use client";

import type { Tab } from "~/domain/types";
import { FALLGUARD_CONFIG } from "~/mock/data";
import { hms } from "~/app/_lib/format";
import { Seg, toOptions } from "./primitives";

const TABS = [
  { value: "panel", label: "Panel" },
  { value: "historial", label: "Historial" },
  { value: "sistema", label: "Sistema" },
] as const satisfies readonly { value: Tab; label: string }[];

export function AppHeader({
  tab,
  onTab,
  nurse,
  onNurse,
  now,
}: {
  tab: Tab;
  onTab: (tab: Tab) => void;
  nurse: string;
  onNurse: (nurse: string) => void;
  now: number;
}) {
  return (
    <header className="fg-header">
      <div className="fg-brand">
        <h1>FallGuard</h1>
        <span className="fg-station">{FALLGUARD_CONFIG.station}</span>
      </div>

      <Seg name="tab" value={tab} options={TABS} onChange={onTab} ariaLabel="Vista" />

      <div className="fg-header-group">
        <span className="fg-header-label">Turno</span>
        <Seg
          name="nurse"
          value={nurse}
          options={toOptions(FALLGUARD_CONFIG.nurses)}
          onChange={onNurse}
          ariaLabel="Enfermero de turno"
        />
      </div>

      <div className="fg-header-group">
        <span className="fg-live">
          <span className="fg-live-dot" aria-hidden />
          <span className="fg-live-text">En vivo</span>
        </span>
        <span className="fg-clock">{hms(now)}</span>
      </div>
    </header>
  );
}
