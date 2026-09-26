"use client";

import type { HistoryEntry, HistoryFilter, Patient } from "~/domain/types";
import { hms, responseTime, typeLabelShort } from "~/app/_lib/format";
import { Corners, Seg } from "./primitives";
import { SeverityIcon } from "./HandledPanel";

const FILTERS = [
  { value: "todas", label: "Todas" },
  { value: "fall", label: "Caídas" },
  { value: "exit", label: "Salidas de cama" },
] as const satisfies readonly { value: HistoryFilter; label: string }[];

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="fg-metric blueprint">
      <Corners />
      <div className="fg-metric-label">{label}</div>
      <div className="fg-metric-value">{value}</div>
      {sub && <div className="fg-metric-label">{sub}</div>}
    </div>
  );
}

export function HistoryView({
  history,
  patientById,
  filter,
  onFilter,
  avgResponse,
}: {
  history: HistoryEntry[];
  patientById: Map<string, Patient>;
  filter: HistoryFilter;
  onFilter: (filter: HistoryFilter) => void;
  avgResponse: (type?: "fall" | "exit") => number | null;
}) {
  const rows = filter === "todas" ? history : history.filter((h) => h.type === filter);
  const fmt = (v: number | null) => (v == null ? "—" : responseTime(v));

  return (
    <div className="fg-view">
      <h1>Historial de alertas</h1>

      {/* La métrica del pitch: cuánto baja el tiempo de respuesta con FallGuard. */}
      <div className="fg-metric-grid">
        <Metric
          label="Tiempo promedio de respuesta"
          value={fmt(avgResponse())}
          sub={`${history.length} alertas atendidas en este turno`}
        />
        <Metric
          label="Caídas · respuesta promedio"
          value={fmt(avgResponse("fall"))}
          sub={`${history.filter((h) => h.type === "fall").length} atendidas`}
        />
        <Metric
          label="Salidas de cama · respuesta promedio"
          value={fmt(avgResponse("exit"))}
          sub={`${history.filter((h) => h.type === "exit").length} atendidas`}
        />
      </div>

      <div className="fg-filter-row">
        <Seg
          name="history-filter"
          value={filter}
          options={FILTERS}
          onChange={onFilter}
          ariaLabel="Filtrar historial"
        />
      </div>

      <div className="fg-table-wrap">
        <table className="table fg-table">
          <thead>
            <tr>
              <th>Hora</th>
              <th>Evento</th>
              <th>Habitación</th>
              <th>Paciente</th>
              <th>Atendió</th>
              <th style={{ textAlign: "right" }}>Tiempo de respuesta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => {
              const patient = patientById.get(entry.pid);
              return (
                <tr key={entry.id}>
                  <td className="tabular">{hms(entry.t)}</td>
                  <td>
                    <span className="fg-cell-event">
                      <SeverityIcon type={entry.type} />
                      {typeLabelShort[entry.type]}
                    </span>
                  </td>
                  <td className="fg-cell-room">
                    {patient?.room ?? "—"} {patient?.bed ?? ""}
                  </td>
                  <td>{patient?.name ?? entry.pid}</td>
                  <td>{entry.nurse}</td>
                  <td className="fg-cell-right">{responseTime(entry.resp)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="fg-empty">
                  Sin alertas atendidas para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
