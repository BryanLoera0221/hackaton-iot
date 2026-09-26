"use client";

import { Circle, OctagonAlert, TriangleAlert } from "lucide-react";
import { Corners } from "./primitives";

const STROKE = 1.5;

const SPECS = [
  {
    level: "Nivel 1",
    name: "En observación",
    icon: <Circle size={30} strokeWidth={STROKE} color="var(--color-accent)" aria-hidden />,
    rows: [
      ["Color", "Tinta sobre fondo claro, acento acero"],
      ["Icono", "Círculo hueco"],
      ["Borde", "1px hairline"],
      ["Movimiento", "Ninguno"],
      ["En la banda", "Una sola franja: «Sin alertas activas»"],
    ],
  },
  {
    level: "Nivel 2",
    name: "Fuera de cama",
    icon: <TriangleAlert size={30} strokeWidth={STROKE} color="#9a6716" aria-hidden />,
    rows: [
      ["Color", "Trama diagonal ámbar"],
      ["Icono", "Triángulo"],
      ["Borde", "2px punteado #b7791f"],
      ["Movimiento", "Ninguno"],
      ["En la banda", "Media tarjeta, habitación a 68px"],
    ],
  },
  {
    level: "Nivel 3",
    name: "Caída confirmada",
    icon: <OctagonAlert size={30} strokeWidth={STROKE} color="#b3261e" aria-hidden />,
    rows: [
      ["Color", "Rojo sólido #b3261e, texto blanco"],
      ["Icono", "Octágono"],
      ["Borde", "3px sólido #7a1712"],
      ["Movimiento", "Halo pulsante, 1.6 s"],
      ["En la banda", "Ancho completo, siempre primera, habitación a 104px"],
    ],
  },
];

const SCALE = [104, 68, 48, 34, 30];

export function SystemView() {
  return (
    <div className="fg-view">
      <h1>Sistema de severidad</h1>
      <p className="fg-section-sub" style={{ marginBottom: 28, maxWidth: "70ch" }}>
        Cada nivel está codificado en cuatro canales a la vez —color, forma del icono, estilo de
        borde y tamaño— para que se distinga igual con daltonismo, con reflejo en la pantalla o de
        reojo desde el otro lado de la estación.
      </p>

      <div className="fg-spec-grid">
        {SPECS.map((spec) => (
          <div key={spec.name} className="fg-spec blueprint">
            <Corners />
            <div className="fg-spec-level">{spec.level}</div>
            <div className="fg-spec-name">
              {spec.icon} {spec.name}
            </div>
            {spec.rows.map(([key, value]) => (
              <div key={key} className="fg-spec-row">
                <span className="fg-spec-key">{key}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 28, marginBottom: 16 }}>Escalada: salida de cama → caída</h2>
      <div className="fg-flow">
        <div className="fg-flow-step hatch" style={{ border: "2px dashed var(--exit-border)", color: "var(--exit-text)" }}>
          Fuera de cama · 14:31:02
        </div>
        <span className="fg-flow-arrow" aria-hidden>
          →
        </span>
        <div
          className="fg-flow-step"
          style={{ background: "var(--fall-fill)", color: "#fff", border: "3px solid var(--fall-deep)" }}
        >
          Caída confirmada · 6 s después
        </div>
        <span className="fg-flow-arrow" aria-hidden>
          →
        </span>
        <div className="fg-flow-step blueprint">
          <Corners />
          Atendida · respuesta medida desde 14:31:02
        </div>
      </div>
      <p className="fg-section-sub" style={{ marginTop: -20, marginBottom: 36, maxWidth: "70ch" }}>
        La alerta no se duplica: la misma tarjeta pasa de ámbar a roja en su lugar y conserva la
        hora de salida, para que el tiempo de respuesta se mida desde el primer aviso.
      </p>

      <h2 style={{ fontSize: 28, marginBottom: 16 }}>Escala tipográfica para lectura a distancia</h2>
      <div className="fg-scale">
        {SCALE.map((px) => (
          <div key={px} className="fg-scale-row">
            <span className="fg-scale-px">{px} px</span>
            <span className="fg-scale-sample" style={{ fontSize: px }}>
              306
            </span>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 28, marginBottom: 16 }}>Roadmap: celda de la camilla</h2>
      <div className="fg-spec blueprint" style={{ maxWidth: 560 }}>
        <Corners />
        <div className="fg-spec-row">
          <span className="fg-spec-key">Hoy</span>
          <span>Botón bajo el colchón · «Ocupada» / «Vacía»</span>
        </div>
        <div className="fg-spec-row">
          <span className="fg-spec-key">Siguiente</span>
          <span>FSR o celda de carga · segunda línea con «68.2 kg» y mini-gráfica</span>
        </div>
        <div className="fg-spec-row">
          <span className="fg-spec-key">Después</span>
          <span>Patrones de movimiento · «Movimiento inquieto» en la primera línea</span>
        </div>
        <p className="fg-section-sub" style={{ marginTop: 12 }}>
          La columna ya tiene ancho fijo y dos líneas: nada de esto pide rediseñar la pantalla.
          Actívalo con <code>showWeight</code> en <code>src/mock/data.ts</code>.
        </p>
      </div>
    </div>
  );
}
