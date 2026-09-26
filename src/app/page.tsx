"use client";

import { useState } from "react";
import type { HistoryFilter, Tab } from "~/domain/types";
import { FALLGUARD_CONFIG } from "~/mock/data";
import { useFallGuard } from "~/app/_lib/useFallGuard";
import { AppHeader } from "~/app/_components/AppHeader";
import { AlertBand } from "~/app/_components/AlertBand";
import { PatientList } from "~/app/_components/PatientList";
import { HandledPanel } from "~/app/_components/HandledPanel";
import { HistoryView } from "~/app/_components/HistoryView";
import { SystemView } from "~/app/_components/SystemView";
import { EventDialog } from "~/app/_components/EventDialog";
import { DemoFooter } from "~/app/_components/DemoFooter";

export default function DashboardPage() {
  const state = useFallGuard();

  const [tab, setTab] = useState<Tab>("panel");
  const [shiftNurse, setShiftNurse] = useState<string>(FALLGUARD_CONFIG.nurses[0]!);
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
      <main>
        <AppHeader tab={tab} onTab={setTab} nurse={shiftNurse} onNurse={setShiftNurse} now={0} />
        <div className="fg-view">
          <p className="fg-section-sub">Conectando con las camillas…</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <AppHeader
        tab={tab}
        onTab={setTab}
        nurse={shiftNurse}
        onNurse={setShiftNurse}
        now={state.now}
      />

      {tab === "panel" && (
        <div className="fg-view">
          <AlertBand
            alerts={state.alerts}
            patientById={state.patientById}
            now={state.now}
            patientCount={state.patients.length}
            lastHandledAt={state.history[0]?.t ?? null}
            onOpen={openDetail}
            onAttend={attendFromCard}
          />

          <div className="fg-columns">
            <PatientList
              patients={state.patients}
              alertOf={state.alertOf}
              now={state.now}
              occupiedBeds={state.occupiedBeds}
              onOpen={openDetail}
            />
            <HandledPanel
              history={state.history}
              patientById={state.patientById}
              avgResponse={state.avgResponse()}
              onSeeAll={() => setTab("historial")}
            />
          </div>
        </div>
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

      {tab === "sistema" && <SystemView />}

      {FALLGUARD_CONFIG.showDemoFooter && <DemoFooter state={state} />}

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
