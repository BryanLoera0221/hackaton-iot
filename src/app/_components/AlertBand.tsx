"use client";

import { Check, Circle, OctagonAlert, TriangleAlert } from "lucide-react";
import type { ActiveAlert, Patient } from "~/domain/types";
import { alertSummary, elapsed, hms, minutesAgo, riskLabel } from "~/app/_lib/format";
import { Corners } from "./primitives";

const STROKE = 1.5;

/** La tarjeta entera abre el detalle; el botón "Atender" no debe propagarse. */
function cardProps(onOpen: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen();
      }
    },
  };
}

function FallCard({
  alert,
  patient,
  now,
  onOpen,
  onAttend,
}: {
  alert: ActiveAlert;
  patient: Patient;
  now: number;
  onOpen: () => void;
  onAttend: () => void;
}) {
  const escalatedAfter = alert.exitAt != null ? Math.round((alert.t - alert.exitAt) / 1000) : null;

  return (
    <div className="fg-card-fall fg-pulse blueprint" {...cardProps(onOpen)}>
      <Corners />

      <div className="fg-col-room">
        <div className="fg-room">{patient.room}</div>
        <div className="fg-bed">Cama {patient.bed}</div>
      </div>

      <div>
        <div className="fg-type">
          <OctagonAlert size={44} strokeWidth={STROKE} aria-hidden />
          Caída confirmada
        </div>
        <div className="fg-name">{patient.name}</div>
        <div className="fg-meta">
          {patient.age} años · {riskLabel[patient.risk]} · detectada a las {hms(alert.t)}
        </div>

        {escalatedAfter != null && (
          <div className="fg-chips">
            <span className="fg-chip">Salió de cama {hms(alert.exitAt!)}</span>
            <span className="fg-chip fg-chip-strong">Caída {escalatedAfter} s después</span>
          </div>
        )}
      </div>

      <div className="fg-col-action">
        <div>
          <div className="fg-elapsed">{elapsed(alert.exitAt ?? alert.t, now)}</div>
          <div className="fg-elapsed-label">sin atender</div>
        </div>
        <button
          type="button"
          className="fg-btn-attend-fall blueprint"
          onClick={(e) => {
            e.stopPropagation();
            onAttend();
          }}
        >
          <Corners />
          <Check size={26} strokeWidth={STROKE} aria-hidden />
          Atender
        </button>
      </div>
    </div>
  );
}

function ExitCard({
  alert,
  patient,
  now,
  onOpen,
  onAttend,
}: {
  alert: ActiveAlert;
  patient: Patient;
  now: number;
  onOpen: () => void;
  onAttend: () => void;
}) {
  return (
    <div className="fg-card-exit hatch" {...cardProps(onOpen)}>
      <Corners />

      <div>
        <div className="fg-room">{patient.room}</div>
        <div className="fg-bed">Cama {patient.bed}</div>
      </div>

      <div>
        <div className="fg-type">
          <TriangleAlert size={30} strokeWidth={STROKE} aria-hidden />
          Fuera de cama
        </div>
        <div className="fg-name">{patient.name}</div>
        <div className="fg-meta">
          {riskLabel[patient.risk]} · desde las {hms(alert.t)}
        </div>
      </div>

      <div className="fg-col-action">
        <div className="fg-elapsed">{elapsed(alert.t, now)}</div>
        <button
          type="button"
          className="btn btn-secondary fg-btn-attend-exit"
          onClick={(e) => {
            e.stopPropagation();
            onAttend();
          }}
        >
          Atender
        </button>
      </div>
    </div>
  );
}

export function AlertBand({
  alerts,
  patientById,
  now,
  patientCount,
  lastHandledAt,
  onOpen,
  onAttend,
}: {
  alerts: ActiveAlert[];
  patientById: Map<string, Patient>;
  now: number;
  patientCount: number;
  lastHandledAt: number | null;
  onOpen: (alertId: string) => void;
  onAttend: (alertId: string) => void;
}) {
  const falls = alerts.filter((a) => a.type === "fall").length;
  const exits = alerts.length - falls;

  return (
    <section className="fg-band">
      <div className="fg-section-head">
        <h2>Alertas activas</h2>
        {alerts.length > 0 && <span className="fg-section-sub">{alertSummary(falls, exits)}</span>}
      </div>

      {alerts.length === 0 ? (
        <div className="fg-calm blueprint">
          <Corners />
          <Circle size={32} strokeWidth={STROKE} className="fg-calm-icon" aria-hidden />
          <div>
            <div className="fg-calm-title">Sin alertas activas</div>
            <div className="fg-calm-sub">
              {patientCount} pacientes en observación
              {lastHandledAt != null &&
                ` · última alerta atendida hace ${minutesAgo(lastHandledAt, now)} min`}
            </div>
          </div>
        </div>
      ) : (
        <div className="fg-alert-grid">
          {alerts.map((alert) => {
            const patient = patientById.get(alert.pid);
            if (!patient) return null;

            const shared = {
              alert,
              patient,
              now,
              onOpen: () => onOpen(alert.id),
              onAttend: () => onAttend(alert.id),
            };

            return alert.type === "fall" ? (
              <FallCard key={alert.id} {...shared} />
            ) : (
              <ExitCard key={alert.id} {...shared} />
            );
          })}
        </div>
      )}
    </section>
  );
}
