"use client";

import { useState } from "react";
import type { HistoryFilter, Tab } from "~/domain/types";
import { FALLGUARD_CONFIG } from "~/mock/data";
import { useFallGuard } from "~/app/_lib/useFallGuard";
import { NavRail } from "~/app/_components/NavRail";
import { TopBar } from "~/app/_components/TopBar";
import { AlertBand } from "~/app/_components/AlertBand";
import { PatientList } from "~/app/_components/PatientList";
import { HistoryView } from "~/app/_components/HistoryView";
import { SystemView } from "~/app/_components/SystemView";
import { CameraView } from "~/app/_components/CameraView";
import { EventDialog } from "~/app/_components/EventDialog";
import { DemoFooter } from "~/app/_components/DemoFooter";
import { LiveDemoFooter } from "~/app/_components/LiveDemoFooter";

export default function DashboardPage() {
  const state = useFallGuard();

  const [tab, setTab] = useState<Tab>("panel");
  // Sin selector de turno en la UI: se acredita siempre al primer enfermero
  // configurado. El diálogo de detalle igual permite elegir quién atiende
  // cada alerta puntual.
  const shiftNurse = FALLGUARD_CONFIG.nurses[0]!;
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("todas");

  /** Alerta abierta en el diálogo de detalle, y quién la atendería desde ahí. */
  const [detailAlertId, setDetailAlertId] = useState<string | null>(null);
  const [detailNurse, setDetailNurse] = useState<string | null>(null);

  const openDetail = (alertId: string) => {
    setDetailAlertId(alertId);
    setDetailNurse(shiftNurse);
  };

  const closeDetail = () => setDetailAlertId(null);

  /** Atender desde la tarjeta: se acredita directo al enfermero de turno. */
  const attendFromCard = (alertId: string) => {
    state.attend(alertId, shiftNurse);
    if (detailAlertId === alertId) closeDetail();
  };

  const detailAlert = state.alerts.find((a) => a.id === detailAlertId) ?? null;
  const detailPatient = detailAlert ? state.patientById.get(detailAlert.pid) ?? null : null;

  if (!state.ready) {
    // El estado inicial se arma en el cliente (timestamps relativos a "ahora").
    return (
      <main className="fg-app">
        <NavRail tab={tab} onTab={setTab} />
        <div className="fg-main" style={{ gridColumn: "2 / -1" }}>
          <p className="fg-section-sub">Conectando con las camillas…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="fg-app">
      <NavRail tab={tab} onTab={setTab} />

      <AlertBand
        alerts={state.alerts}
        patientById={state.patientById}
        now={state.now}
        patientCount={state.patients.length}
        lastHandledAt={state.history[0]?.t ?? null}
        avgResponseToday={state.avgResponse()}
        onOpen={openDetail}
        onAttend={attendFromCard}
      />

      <div className="fg-main">
        <TopBar
          tab={tab}
          now={state.now}
          patientCount={state.patients.length}
          occupiedBeds={state.occupiedBeds}
          historyCount={state.history.length}
        />

        {tab === "panel" && (
          <PatientList
            patients={state.patients}
            alertOf={state.alertOf}
            now={state.now}
            onOpen={openDetail}
          />
        )}

        {tab === "historial" && (
          <HistoryView
            history={state.history}
            patientById={state.patientById}
            filter={historyFilter}
            onFilter={setHistoryFilter}
            avgResponse={state.avgResponse}
          />
        )}

        {tab === "camara" && <CameraView />}

        {tab === "sistema" && <SystemView />}

        {FALLGUARD_CONFIG.showDemoFooter &&
          (FALLGUARD_CONFIG.useLiveFeed ? (
            <LiveDemoFooter state={state} />
          ) : (
            <DemoFooter state={state} />
          ))}
      </div>

      {detailAlert && detailPatient && (
        <EventDialog
          alert={detailAlert}
          patient={detailPatient}
          now={state.now}
          nurse={detailNurse ?? shiftNurse}
          onNurse={setDetailNurse}
          onClose={closeDetail}
          onAttend={() => {
            state.attend(detailAlert.id, detailNurse ?? shiftNurse);
            closeDetail();
          }}
        />
      )}
    </main>
  );
}
