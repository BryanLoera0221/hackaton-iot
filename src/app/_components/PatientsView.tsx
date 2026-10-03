"use client";

import { useState } from "react";
import {
  UserRound,
  ShieldCheck,
  Stethoscope,
  Phone,
  Clock,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Caregiver, CaregiverRole, Patient } from "~/domain/types";
import { CAREGIVERS, PATIENTS } from "~/mock/data";
import { riskLabel } from "~/app/_lib/format";
import { initials } from "./primitives";

/* ── helpers ──────────────────────────────────────────────────────────────── */

const ROLE_LABEL: Record<CaregiverRole, string> = {
  admin: "Administrador",
  enfermero: "Enfermero/a",
};

const ROLE_COLOR: Record<CaregiverRole, { bg: string; text: string; border: string }> = {
  admin: { bg: "#eef2ff", text: "#3730a3", border: "#a5b4fc" },
  enfermero: { bg: "#ecfdf5", text: "#065f46", border: "#6ee7b7" },
};

const RISK_COLOR: Record<string, string> = {
  alto: "#b3261e",
  medio: "#c7861a",
  bajo: "#0d7c55",
};

function caregiversOf(patientId: string): Caregiver[] {
  return CAREGIVERS.filter((c) => c.patientIds.includes(patientId));
}

function patientsOf(caregiverId: string): Patient[] {
  const cg = CAREGIVERS.find((c) => c.id === caregiverId);
  if (!cg) return [];
  return PATIENTS.filter((p) => cg.patientIds.includes(p.id));
}

/* ── sub-componentes ──────────────────────────────────────────────────────── */

function RoleBadge({ role }: { role: CaregiverRole }) {
  const { bg, text, border } = ROLE_COLOR[role];
  const Icon = role === "admin" ? ShieldCheck : Stethoscope;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: bg,
        color: text,
        border: `1px solid ${border}`,
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        padding: "2px 10px",
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={13} strokeWidth={2} />
      {ROLE_LABEL[role]}
    </span>
  );
}

function CaregiverPill({ cg }: { cg: Caregiver }) {
  const { bg, text, border } = ROLE_COLOR[cg.role];
  const Icon = cg.role === "admin" ? ShieldCheck : Stethoscope;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: "8px 12px",
        minWidth: 0,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: border,
          color: text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {initials(cg.name)}
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: text,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {cg.name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
          <Icon size={12} strokeWidth={2} color={text} />
          <span style={{ fontSize: 12, color: text, opacity: 0.8 }}>
            {ROLE_LABEL[cg.role]} · Turno {cg.shift}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── tarjeta de paciente con cuidadores ───────────────────────────────────── */

function PatientCareCard({ patient }: { patient: Patient }) {
  const caregivers = caregiversOf(patient.id);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fg-pcc">
      <div className="fg-pcc-header">
        <div className="fg-avatar" style={{ width: 48, height: 48, fontSize: 15 }}>
          {patient.photoUrl ? (
            <img src={patient.photoUrl} alt="" />
          ) : (
            initials(patient.name)
          )}
        </div>

        <div className="fg-pcc-info">
          <div className="fg-pcc-name">{patient.name}</div>
          <div className="fg-pcc-meta">
            <span className="fg-pcc-room-badge">Hab. {patient.room} · Cama {patient.bed}</span>
            <span>·</span>
            <span>{patient.age} años</span>
            <span>·</span>
            <span style={{ color: RISK_COLOR[patient.risk], fontWeight: 600 }}>
              Riesgo {riskLabel[patient.risk]}
            </span>
          </div>
        </div>

        <div className="fg-pcc-counts">
          <div className="fg-pcc-count-chip">
            <Users size={14} strokeWidth={2} />
            {caregivers.length} cuidador{caregivers.length !== 1 ? "es" : ""}
          </div>
          <button
            className="fg-pcc-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <><ChevronUp size={16} />Ocultar</>
            ) : (
              <><ChevronDown size={16} />Ver cuidadores</>
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="fg-pcc-caregivers">
          {caregivers.length === 0 ? (
            <p className="fg-pcc-empty">Sin cuidadores asignados</p>
          ) : (
            caregivers.map((cg) => <CaregiverPill key={cg.id} cg={cg} />)
          )}
        </div>
      )}
    </div>
  );
}

/* ── tarjeta de cuidador con sus pacientes ────────────────────────────────── */

function CaregiverCard({ cg }: { cg: Caregiver }) {
  const patients = patientsOf(cg.id);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fg-cgcard">
      <div className="fg-cgcard-header">
        <span className="fg-cgcard-avatar">{initials(cg.name)}</span>
        <div className="fg-cgcard-info">
          <div className="fg-cgcard-name">{cg.name}</div>
          <div className="fg-cgcard-badges">
            <RoleBadge role={cg.role} />
            <span className="fg-cgcard-shift">
              <Clock size={13} strokeWidth={2} />
              Turno {cg.shift}
            </span>
            {cg.phone && (
              <span className="fg-cgcard-phone">
                <Phone size={13} strokeWidth={2} />
                {cg.phone}
              </span>
            )}
          </div>
        </div>
        <div className="fg-cgcard-right">
          <div className="fg-pcc-count-chip">
            <UserRound size={14} strokeWidth={2} />
            {patients.length} pac.
          </div>
          <button
            className="fg-pcc-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? (
              <><ChevronUp size={16} />Ocultar</>
            ) : (
              <><ChevronDown size={16} />Ver pacientes</>
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="fg-cgcard-patients">
          {patients.length === 0 ? (
            <p className="fg-pcc-empty">Sin pacientes asignados</p>
          ) : (
            patients.map((p) => (
              <div key={p.id} className="fg-cgcard-patient-row">
                <span className="fg-cgcard-patient-room">{p.room}·{p.bed}</span>
                <span className="fg-cgcard-patient-name">{p.name}</span>
                <span
                  className="fg-cgcard-patient-risk"
                  style={{ color: RISK_COLOR[p.risk] }}
                >
                  {riskLabel[p.risk]}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── vista principal ──────────────────────────────────────────────────────── */

type ViewMode = "pacientes" | "cuidadores";
type RoleFilter = "todos" | CaregiverRole;

export function PatientsView() {
  const [mode, setMode] = useState<ViewMode>("pacientes");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("todos");

  const filteredPatients = PATIENTS.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.room.includes(search) ||
      p.bed.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCaregivers = CAREGIVERS.filter((cg) => {
    const matchRole = roleFilter === "todos" || cg.role === roleFilter;
    const matchSearch = cg.name.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  return (
    <div className="fg-view fg-pv">
      <h1>Pacientes y Cuidadores</h1>
      <p className="fg-section-sub" style={{ marginBottom: 20 }}>
        {PATIENTS.length} pacientes · {CAREGIVERS.length} cuidadores registrados
      </p>

      {/* Controles */}
      <div className="fg-pv-controls">
        <div className="fg-pv-tabs">
          <button
            className={`fg-pv-tab ${mode === "pacientes" ? "fg-pv-tab-active" : ""}`}
            onClick={() => setMode("pacientes")}
          >
            <UserRound size={16} strokeWidth={2} />
            Pacientes
          </button>
          <button
            className={`fg-pv-tab ${mode === "cuidadores" ? "fg-pv-tab-active" : ""}`}
            onClick={() => setMode("cuidadores")}
          >
            <Stethoscope size={16} strokeWidth={2} />
            Cuidadores
          </button>
        </div>

        <div className="fg-pv-search-wrap">
          <Search size={16} strokeWidth={2} className="fg-pv-search-icon" />
          <input
            className="fg-pv-search"
            type="search"
            placeholder={
              mode === "pacientes" ? "Buscar paciente, hab…" : "Buscar cuidador…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {mode === "cuidadores" && (
          <div className="fg-pv-role-filters">
            {(["todos", "admin", "enfermero"] as const).map((r) => (
              <button
                key={r}
                className={`fg-pv-role-btn ${roleFilter === r ? "fg-pv-role-btn-active" : ""}`}
                onClick={() => setRoleFilter(r)}
              >
                {r === "todos" ? "Todos" : r === "admin" ? "Administradores" : "Enfermeros/as"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="fg-pv-list">
        {mode === "pacientes" ? (
          filteredPatients.length === 0 ? (
            <p className="fg-empty">Sin resultados para &ldquo;{search}&rdquo;</p>
          ) : (
            filteredPatients.map((p) => <PatientCareCard key={p.id} patient={p} />)
          )
        ) : filteredCaregivers.length === 0 ? (
          <p className="fg-empty">Sin resultados para &ldquo;{search}&rdquo;</p>
        ) : (
          filteredCaregivers.map((cg) => <CaregiverCard key={cg.id} cg={cg} />)
        )}
      </div>
    </div>
  );
}
