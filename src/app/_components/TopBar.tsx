"use client";

import type { Tab } from "~/domain/types";
import { FALLGUARD_CONFIG } from "~/mock/data";
import { hms } from "~/app/_lib/format";

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
  if (tab === "camara") {
    return {
      title: "Detección por cámara",
      subtitle: "Demo · visión artificial para detectar caídas",
    };
  }
  return {
    title: "Sistema de severidad",
    subtitle: "Cómo se distingue cada nivel de alerta",
  };
}

export function TopBar({
  tab,
  now,
  patientCount,
  occupiedBeds,
  historyCount,
}: {
  tab: Tab;
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

      <span className="fg-clock">{hms(now)}</span>
    </div>
  );
}
