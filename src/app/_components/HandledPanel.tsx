"use client";

import { OctagonAlert, TriangleAlert } from "lucide-react";
import type { HistoryEntry, Patient } from "~/domain/types";
import { hm, responseTime, typeLabelShort } from "~/app/_lib/format";
import { Corners } from "./primitives";

const STROKE = 1.5;

/** Icono chico de severidad sobre fondo claro (listas y tablas). */
export function SeverityIcon({ type, size = 20 }: { type: "fall" | "exit"; size?: number }) {
  return type === "fall" ? (
    <OctagonAlert size={size} strokeWidth={STROKE} color="#b3261e" aria-hidden />
  ) : (
    <TriangleAlert size={size} strokeWidth={STROKE} color="#9a6716" aria-hidden />
  );
}

export function HandledPanel({
  history,
  patientById,
  avgResponse,
  onSeeAll,
}: {
  history: HistoryEntry[];
  patientById: Map<string, Patient>;
  avgResponse: number | null;
  onSeeAll: () => void;
}) {
  return (
    <section className="fg-col-handled">
      <div className="fg-handled-head">
        <h2>Atendidas</h2>
        <button type="button" className="btn btn-ghost" onClick={onSeeAll}>
          Ver historial completo
        </button>
      </div>

      <div className="fg-metric blueprint">
        <Corners />
        <div className="fg-metric-label">Tiempo promedio de respuesta hoy</div>
        <div className="fg-metric-value">
          {avgResponse == null ? "—" : responseTime(avgResponse)}
        </div>
      </div>

      {history.slice(0, 6).map((entry) => {
        const patient = patientById.get(entry.pid);
        return (
          <div key={entry.id} className="fg-handled-item">
            <span className="fg-handled-time">{hm(entry.t)}</span>
            <SeverityIcon type={entry.type} />
            <div>
              <div className="fg-handled-main">
                {patient?.room ?? entry.pid} · {patient?.name ?? "—"}
              </div>
              <div className="fg-handled-sub">
                {typeLabelShort[entry.type]} · {entry.nurse}
              </div>
            </div>
            <span className="fg-handled-resp">{responseTime(entry.resp)}</span>
          </div>
        );
      })}

      {history.length === 0 && (
        <p className="fg-empty">Aún no se ha atendido ninguna alerta en este turno.</p>
      )}
    </section>
  );
}
