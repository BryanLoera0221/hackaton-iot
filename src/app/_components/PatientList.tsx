"use client";

import { Circle, OctagonAlert, TriangleAlert } from "lucide-react";
import type { ActiveAlert, Patient } from "~/domain/types";
import { elapsed, riskLabel } from "~/app/_lib/format";
import { FALLGUARD_CONFIG } from "~/mock/data";
import { initials } from "./primitives";

const STROKE = 1.5;

/** Placeholder circular: foto si existe, si no las iniciales del paciente. */
function Avatar({ patient }: { patient: Patient }) {
  return (
    <div className="fg-avatar" aria-hidden>
      {patient.photoUrl ? <img src={patient.photoUrl} alt="" /> : initials(patient.name)}
    </div>
  );
}

/**
 * Roadmap: mini-gráfica de peso de la celda de carga. Serie determinista a
 * partir del ID para que no tiemble en cada render.
 */
function Sparkline({ seed, base }: { seed: string; base: number }) {
  const h = [...seed].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7);
  const points = Array.from({ length: 12 }, (_, i) => {
    const jitter = (((h >> i) & 7) - 3.5) / 3.5; // −1 … 1
    const y = 8 - jitter * 4.5;
    return `${(i * 48) / 11},${y.toFixed(1)}`;
  }).join(" ");

  return (
    <svg width="48" height="16" viewBox="0 0 48 16" aria-hidden focusable="false">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        vectorEffect="non-scaling-stroke"
      />
      <title>{`Tendencia de peso, ${base} kg`}</title>
    </svg>
  );
}

function PatientState({ alert, now }: { alert: ActiveAlert | null; now: number }) {
  if (!alert) {
    return (
      <div className="fg-pcard-state fg-pcard-state-normal">
        <Circle size={14} strokeWidth={STROKE} color="var(--color-scooter)" aria-hidden />
        <span>En cama · normal</span>
      </div>
    );
  }

  if (alert.type === "fall") {
    return (
      <div className="fg-pcard-state">
        <OctagonAlert size={18} strokeWidth={STROKE} aria-hidden />
        <span className="fg-pcard-state-elapsed">Caída · {elapsed(alert.exitAt ?? alert.t, now)}</span>
      </div>
    );
  }

  return (
    <div className="fg-pcard-state">
      <TriangleAlert size={18} strokeWidth={STROKE} aria-hidden />
      <span className="fg-pcard-state-elapsed">Fuera de cama · {elapsed(alert.t, now)}</span>
    </div>
  );
}

function PatientCard({
  patient,
  alert,
  now,
  onOpen,
}: {
  patient: Patient;
  alert: ActiveAlert | null;
  now: number;
  onOpen: (alertId: string) => void;
}) {
  const variant = alert ? alert.type : "normal";
  const clickable = alert != null;

  return (
    <div
      className={`fg-pcard fg-pcard-${variant} ${variant === "exit" ? "hatch" : ""}`}
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
      <div className="fg-pcard-row1">
        <Avatar patient={patient} />
        <span className="fg-pcard-room">{patient.room}</span>
        <span className="fg-pcard-bed">{patient.bed}</span>
      </div>

      <div>
        <div className="fg-pcard-name">{patient.name}</div>
        <div className="fg-pcard-meta">
          {patient.age} años · {riskLabel[patient.risk]}
        </div>
      </div>

      <div className="fg-pcard-status">
        <PatientState alert={alert} now={now} />

        {FALLGUARD_CONFIG.showWeight && patient.weightKg != null && (
          <div className="fg-pcard-weight">
            <span>{alert ? "0.0" : patient.weightKg.toFixed(1)} kg</span>
            {!alert && <Sparkline seed={patient.id} base={patient.weightKg} />}
          </div>
        )}
      </div>
    </div>
  );
}

export function PatientList({
  patients,
  alertOf,
  now,
  onOpen,
}: {
  patients: Patient[];
  alertOf: (pid: string) => ActiveAlert | null;
  now: number;
  onOpen: (alertId: string) => void;
}) {
  return (
    <div className="fg-patient-grid">
      {patients.map((patient) => (
        <PatientCard
          key={patient.id}
          patient={patient}
          alert={alertOf(patient.id)}
          now={now}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
