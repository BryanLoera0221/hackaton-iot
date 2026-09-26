"use client";

import { useEffect } from "react";
import { Check, OctagonAlert, TriangleAlert } from "lucide-react";
import type { ActiveAlert, Patient } from "~/domain/types";
import { elapsed, hmsTenths, riskLabel, typeLabel } from "~/app/_lib/format";
import { FALLGUARD_CONFIG } from "~/mock/data";
import { Seg, initials, toOptions } from "./primitives";

const STROKE = 1.5;

/**
 * Secuencia del sensor. Los offsets de la caída son simulados: cuando el
 * gateway mande los timestamps reales del MPU6050, se reemplazan aquí.
 */
function sensorSequence(alert: ActiveAlert) {
  const steps: Array<{ t: number; label: string }> = [];

  if (alert.exitAt != null) {
    steps.push({ t: alert.exitAt, label: "Camilla vacía · sensor de ocupación" });
  }

  if (alert.type === "fall") {
    steps.push({ t: alert.t - 2300, label: "Caída libre detectada · MPU6050" });
    steps.push({ t: alert.t - 2000, label: "Impacto" });
    steps.push({ t: alert.t, label: "Quietud confirmada · caída registrada" });
  } else {
    steps.push({ t: alert.t, label: "Camilla vacía · sensor de ocupación" });
  }

  return steps;
}

export function EventDialog({
  alert,
  patient,
  now,
  nurse,
  onNurse,
  onClose,
  onAttend,
}: {
  alert: ActiveAlert;
  patient: Patient;
  now: number;
  nurse: string;
  onNurse: (nurse: string) => void;
  onClose: () => void;
  onAttend: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isFall = alert.type === "fall";

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog fg-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${typeLabel[alert.type]} · habitación ${patient.room}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`fg-dialog-strip ${isFall ? "fg-dialog-strip-fall" : "fg-dialog-strip-exit hatch"}`}>
          {isFall ? (
            <OctagonAlert size={34} strokeWidth={STROKE} aria-hidden />
          ) : (
            <TriangleAlert size={34} strokeWidth={STROKE} aria-hidden />
          )}
          <span className="fg-dialog-title">{typeLabel[alert.type]}</span>
          <span className="fg-dialog-elapsed">{elapsed(alert.exitAt ?? alert.t, now)}</span>
        </div>

        <div className="fg-dialog-body">
          <div className="fg-dialog-patient">
            <div className="fg-dialog-avatar" aria-hidden>
              {patient.photoUrl ? <img src={patient.photoUrl} alt="" /> : initials(patient.name)}
            </div>
            <div>
              <div className="fg-dialog-room">
                <span className="fg-dialog-room-n">{patient.room}</span>
                <span className="fg-dialog-room-bed">Cama {patient.bed}</span>
              </div>
              <div className="fg-dialog-name">{patient.name}</div>
              <div className="fg-dialog-sub">
                {patient.age} años · {riskLabel[patient.risk]}
              </div>
            </div>
          </div>

          <div>
            <div className="fg-seq-title">Secuencia del sensor</div>
            <div className="fg-seq">
              {sensorSequence(alert).map((step) => (
                <div key={step.label} style={{ display: "contents" }}>
                  <span className="fg-seq-time">{hmsTenths(step.t)}</span>
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="fg-dialog-footer">
          <span className="fg-topbar-shift-label">Atiende</span>
          <Seg
            name="dialog-nurse"
            value={nurse}
            options={toOptions(FALLGUARD_CONFIG.nurses)}
            onChange={onNurse}
            small
            ariaLabel="Enfermero que atiende"
          />

          <div className="fg-footer-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cerrar
            </button>
            <button type="button" className="fg-btn-ack" onClick={onAttend}>
              <Check size={22} strokeWidth={STROKE} aria-hidden />
              Marcar como atendida
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
