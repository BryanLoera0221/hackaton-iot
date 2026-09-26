"use client";

import { Bed, Circle, OctagonAlert, TriangleAlert } from "lucide-react";
import type { ActiveAlert, Patient } from "~/domain/types";
import { elapsed, riskLabel } from "~/app/_lib/format";
import { FALLGUARD_CONFIG } from "~/mock/data";

const STROKE = 1.5;

/**
 * Roadmap: mini-gráfica de peso de la celda de carga. Serie determinista a
 * partir del ID para que no tiemble en cada render.
 */
function Sparkline({ seed, base }: { seed: string; base: number }) {
  const h = [...seed].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7);
  const points = Array.from({ length: 12 }, (_, i) => {
    const jitter = (((h >> i) & 7) - 3.5) / 3.5; // −1 … 1
    const y = 9 - jitter * 5;
    return `${(i * 64) / 11},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <svg width="64" height="18" viewBox="0 0 64 18" aria-hidden focusable="false">
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
      <title>{`Tendencia de peso, ${base} kg`}</title>
    </svg>
  );
}

function BedCell({ patient, occupied }: { patient: Patient; occupied: boolean }) {
  return (
    <div className="fg-bedcell">
      <Bed size={22} strokeWidth={STROKE} aria-hidden style={{ marginTop: 1, flexShrink: 0 }} />
      <div>
        <div className="fg-bedcell-main">{occupied ? "Ocupada" : "Vacía"}</div>
        {/* Segunda línea reservada para el sensor de peso (FSR / celda de carga). */}
        {FALLGUARD_CONFIG.showWeight && patient.weightKg != null && (
          <div className="fg-bedcell-weight">
            <span>{occupied ? patient.weightKg.toFixed(1) : "0.0"} kg</span>
            {occupied && <Sparkline seed={patient.id} base={patient.weightKg} />}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusCell({ alert, now }: { alert: ActiveAlert | null; now: number }) {
  if (!alert) {
    return (
      <div className="fg-status">
        <Circle size={16} strokeWidth={STROKE} aria-hidden />
        <span className="fg-status-normal">En observación</span>
      </div>
    );
  }

  if (alert.type === "fall") {
    return (
      <div className="fg-status">
        <OctagonAlert size={26} strokeWidth={STROKE} aria-hidden />
        <span className="fg-status-label">Caída</span>
        <span className="fg-status-elapsed">{elapsed(alert.exitAt ?? alert.t, now)}</span>
      </div>
    );
  }

  return (
    <div className="fg-status">
      <TriangleAlert size={22} strokeWidth={STROKE} aria-hidden />
      <span className="fg-status-label">Fuera de cama</span>
      <span className="fg-status-elapsed">{elapsed(alert.t, now)}</span>
    </div>
  );
}

export function PatientList({
  patients,
  alertOf,
  now,
  occupiedBeds,
  onOpen,
}: {
  patients: Patient[];
  alertOf: (pid: string) => ActiveAlert | null;
  now: number;
  occupiedBeds: number;
  onOpen: (alertId: string) => void;
}) {
  return (
    <section className="fg-col-patients">
      <div className="fg-section-head">
        <h2>Pacientes monitoreados</h2>
        <span className="fg-section-sub">
          {patients.length} camas · {occupiedBeds} ocupadas
        </span>
      </div>

      <div className="fg-plist-head">
        <span>Habitación</span>
        <span>Paciente</span>
        <span>Camilla</span>
        <span>Estado</span>
      </div>

      {/* El orden lo fija el número de habitación: una alerta nunca reordena
          la lista, así cada paciente queda siempre en el mismo punto de la
          pantalla de pared. */}
      {patients.map((patient) => {
        const alert = alertOf(patient.id);
        const variant = alert ? `fg-prow-${alert.type}` : "";
        const clickable = alert != null;

        return (
          <div
            key={patient.id}
            className={`fg-prow ${variant}`}
            {...(clickable
              ? {
                  role: "button" as const,
                  tabIndex: 0,
                  onClick: () => onOpen(alert.id),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpen(alert.id);
                    }
                  },
                }
              : {})}
          >
            <div>
              <span className="fg-prow-room">{patient.room}</span>{" "}
              <span className="fg-prow-bed">{patient.bed}</span>
            </div>

            <div>
              <div className="fg-prow-name">{patient.name}</div>
              <div className="fg-prow-sub">
                {patient.age} años · {riskLabel[patient.risk]}
              </div>
            </div>

            <BedCell patient={patient} occupied={!alert} />
            <StatusCell alert={alert} now={now} />
          </div>
        );
      })}
    </section>
  );
}
