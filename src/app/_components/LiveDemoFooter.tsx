"use client";

import { useEffect, useRef } from "react";
import type { FallGuardState } from "~/app/_lib/useFallGuard";
import { api } from "~/trpc/react";

/**
 * Como DemoFooter, pero en vez de mutar el estado local del navegador, pega
 * al backend real (tRPC → Prisma → SSE). Lo que se ve en pantalla viene solo
 * del viaje redondo por /api/alerts/stream, igual que si lo mandara el
 * Arduino — sirve para probar el pipeline completo sin hardware.
 *
 * Se muestra en vez de DemoFooter cuando FALLGUARD_CONFIG.useLiveFeed es true
 * (ver src/app/page.tsx). Apagarlo con showDemoFooter: false en
 * src/mock/data.ts.
 */
export function LiveDemoFooter({ state }: { state: FallGuardState }) {
  const simulate = api.alerts.simulate.useMutation();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const trigger = (type: "fall" | "exit") => {
    const patient = state.pickIdlePatient();
    if (patient) simulate.mutate({ patientExternalId: patient.id, type });
  };

  const triggerEscalation = () => {
    const patient = state.pickIdlePatient();
    if (!patient) return;
    simulate.mutate({ patientExternalId: patient.id, type: "exit" });
    timers.current.push(
      setTimeout(() => simulate.mutate({ patientExternalId: patient.id, type: "fall" }), 6000),
    );
  };

  return (
    <div className="fg-demo">
      <span className="fg-demo-label">
        Demo en vivo · dispara eventos contra el backend real (Prisma + SSE)
      </span>
      <button type="button" className="btn btn-secondary" onClick={() => trigger("exit")}>
        Salida de cama
      </button>
      <button type="button" className="btn btn-secondary" onClick={() => trigger("fall")}>
        Caída
      </button>
      <button type="button" className="btn btn-secondary" onClick={triggerEscalation}>
        Salida → caída (6 s)
      </button>
    </div>
  );
}
