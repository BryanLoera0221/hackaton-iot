"use client";

import type { Tab } from "~/domain/types";
import { FALLGUARD_CONFIG } from "~/mock/data";
import { hms } from "~/app/_lib/format";
import { Seg, toOptions } from "./primitives";

function titleFor(tab: Tab, patientCount: number, occupiedBeds: number, historyCount: number) {
  if (tab === "panel") {
    return {
      title: "Pacientes monitoreados",
      subtitle: `${FALLGUARD_CONFIG.floor} · ${patientCount} camas · ${occupiedBeds} ocupadas`,
    };
  }
  if (tab === "historial") {
    return {
      title: "Historial de alertas",
      subtitle: `${historyCount} alertas atendidas en este turno`,
    };
  }
  return {
    title: "Sistema de severidad",
    subtitle: "Cómo se distingue cada nivel de alerta",
  };
}

export function TopBar({
  tab,
  nurse,
  onNurse,
  now,
  patientCount,
  occupiedBeds,
  historyCount,
}: {
  tab: Tab;
  nurse: string;
  onNurse: (nurse: string) => void;
  now: number;
  patientCount: number;
  occupiedBeds: number;
  historyCount: number;
}) {
  const { title, subtitle } = titleFor(tab, patientCount, occupiedBeds, historyCount);

  return (
    <div className="fg-topbar">
      <div>
        <h1 className="fg-topbar-title">{title}</h1>
        <div className="fg-topbar-sub">{subtitle}</div>
      </div>

      <div className="fg-topbar-right">
        <div className="fg-topbar-shift">
          <span className="fg-topbar-shift-label">Turno</span>
          <Seg
            name="nurse"
            value={nurse}
            options={toOptions(FALLGUARD_CONFIG.nurses)}
            onChange={onNurse}
            ariaLabel="Enfermero de turno"
          />
        </div>

        <span className="fg-clock">{hms(now)}</span>
      </div>
    </div>
  );
}
