"use client";

import { Check, Circle, OctagonAlert, TriangleAlert } from "lucide-react";
import type { ActiveAlert, Patient } from "~/domain/types";
import { alertSummary, elapsed, hms, minutesAgo, responseTime, riskLabel } from "~/app/_lib/format";

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
    <div className="fg-fallcard fg-pulse" {...cardProps(onOpen)}>
      <div className="fg-fallcard-row1">
        <div>
          <div className="fg-fallcard-room">{patient.room}</div>
          <div className="fg-fallcard-bed">Cama {patient.bed}</div>
        </div>
        <div className="fg-fallcard-elapsed">
          <div className="fg-fallcard-elapsed-value">{elapsed(alert.exitAt ?? alert.t, now)}</div>
          <div className="fg-fallcard-elapsed-label">sin atender</div>
        </div>
      </div>

      <div className="fg-fallcard-type">
        <OctagonAlert size={40} strokeWidth={STROKE} aria-hidden />
        Caída confirmada
      </div>

      <div className="fg-fallcard-name">{patient.name}</div>
      <div className="fg-fallcard-meta">
        {patient.age} años · {riskLabel[patient.risk]} · {hms(alert.t)}
      </div>

      {escalatedAfter != null && (
        <div className="fg-chips">
          <span className="fg-chip">Salió de cama {hms(alert.exitAt!)}</span>
          <span className="fg-chip fg-chip-strong">Caída {escalatedAfter} s después</span>
        </div>
      )}

      <button
        type="button"
        className="fg-fallcard-attend"
        onClick={(e) => {
          e.stopPropagation();
          onAttend();
        }}
      >
        <Check size={26} strokeWidth={STROKE} aria-hidden />
        Atender
      </button>
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
    <div className="fg-exitcard hatch" {...cardProps(onOpen)}>
      <div>
        <div className="fg-exitcard-room">{patient.room}</div>
        <div className="fg-exitcard-bed">Cama {patient.bed}</div>
      </div>

      <div>
        <div className="fg-exitcard-type">
          <TriangleAlert size={26} strokeWidth={STROKE} aria-hidden />
          Fuera de cama
        </div>
        <div className="fg-exitcard-name">{patient.name}</div>
        <div className="fg-exitcard-meta">desde las {hms(alert.t)}</div>
      </div>

      <div className="fg-exitcard-action">
        <div className="fg-exitcard-elapsed">{elapsed(alert.t, now)}</div>
        <button
          type="button"
          className="fg-btn-attend-exit"
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
  avgResponseToday,
  onOpen,
  onAttend,
}: {
  alerts: ActiveAlert[];
  patientById: Map<string, Patient>;
  now: number;
  patientCount: number;
  lastHandledAt: number | null;
  avgResponseToday: number | null;
  onOpen: (alertId: string) => void;
  onAttend: (alertId: string) => void;
}) {
  const falls = alerts.filter((a) => a.type === "fall").length;
  const exits = alerts.length - falls;

  return (
    <section className="fg-alerts">
      <div className="fg-alerts-head">
        <h2>Alertas activas</h2>
        {alerts.length > 0 && <span className="fg-alerts-summary">{alertSummary(falls, exits)}</span>}
      </div>

      {alerts.length === 0 ? (
        <div className="fg-calm">
          <Circle size={36} strokeWidth={STROKE} className="fg-calm-icon" aria-hidden />
          <div>
            <div className="fg-calm-title">Sin alertas activas</div>
            <div className="fg-calm-sub">
              {patientCount} pacientes en cama
              {lastHandledAt != null &&
                ` · última alerta atendida hace ${minutesAgo(lastHandledAt, now)} min`}
            </div>
          </div>
        </div>
      ) : (
        <div className="fg-alert-list">
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

      <div className="fg-alerts-footer">
        <span className="fg-alerts-footer-label">Respuesta promedio hoy</span>
        <span className="fg-alerts-footer-value">
          {avgResponseToday == null ? "—" : responseTime(avgResponseToday)}
        </span>
      </div>
    </section>
  );
}
