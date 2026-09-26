"use client";

import { useEffect, useRef } from "react";
import type { FallGuardState } from "~/app/_lib/useFallGuard";

/**
 * Solo para la demo del hackathon: simula lo que mandaría el Arduino por
 * serial sobre un paciente al azar que no tenga alerta activa.
 * En producción se apaga con `showDemoFooter: false` en src/mock/data.ts.
 */
export function DemoFooter({ state }: { state: FallGuardState }) {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const simulateExit = () => {
    const patient = state.pickIdlePatient();
    if (patient) state.registerExit(patient.id);
  };

  const simulateFall = () => {
    const patient = state.pickIdlePatient();
    if (patient) state.registerFall(patient.id);
  };

  const simulateEscalation = () => {
    const patient = state.pickIdlePatient();
    if (!patient) return;
    state.registerExit(patient.id);
    timers.current.push(setTimeout(() => state.registerFall(patient.id), 6000));
  };

  return (
    <div className="fg-demo">
      <span className="fg-demo-label">
        Demo · simula eventos del Arduino (reemplazable por el feed SSE real)
      </span>
      <button type="button" className="btn btn-secondary" onClick={simulateExit}>
        Salida de cama
      </button>
      <button type="button" className="btn btn-secondary" onClick={simulateFall}>
        Caída
      </button>
      <button type="button" className="btn btn-secondary" onClick={simulateEscalation}>
        Salida → caída (6 s)
      </button>
      <button type="button" className="btn btn-secondary" onClick={state.reset}>
        Reiniciar
      </button>
    </div>
  );
}
