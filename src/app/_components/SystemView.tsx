"use client";

import { Circle, OctagonAlert, TriangleAlert } from "lucide-react";

const STROKE = 1.5;

const SPECS = [
  {
    level: "Nivel 1",
    name: "En observación",
    swatch: "#fff",
    icon: <Circle size={30} strokeWidth={STROKE} color="var(--color-scooter)" aria-hidden />,
    rows: [
      ["Color", "Tarjeta blanca, acento Scooter"],
      ["Icono", "Círculo hueco"],
      ["Borde", "1px Heather"],
      ["Movimiento", "Ninguno"],
      ["En la columna", "Sin alertas activas · estado vacío"],
    ],
  },
  {
    level: "Nivel 2",
    name: "Fuera de cama",
    swatch: "var(--exit-hatch-a)",
    icon: <TriangleAlert size={30} strokeWidth={STROKE} color="#6b4608" aria-hidden />,
    rows: [
      ["Color", "Trama diagonal ámbar"],
      ["Icono", "Triángulo"],
      ["Borde", "2px punteado #c7861a"],
      ["Movimiento", "Ninguno"],
      ["En la columna", "Tarjeta compacta, habitación a 68px"],
    ],
  },
  {
    level: "Nivel 3",
    name: "Caída confirmada",
    swatch: "var(--fall-fill)",
    icon: <OctagonAlert size={30} strokeWidth={STROKE} color="#fff" aria-hidden />,
    rows: [
      ["Color", "Rojo sólido #b3261e, texto blanco"],
      ["Icono", "Octágono"],
      ["Borde", "3px sólido #7a1712"],
      ["Movimiento", "Halo pulsante, 1.6 s"],
      ["En la columna", "Siempre arriba, ancho completo, habitación a 104px"],
    ],
  },
];

const SCALE = [104, 80, 68, 56, 48, 44, 34, 32, 30];

export function SystemView() {
  return (
    <div className="fg-view">
      <p className="fg-section-sub" style={{ marginBottom: 28, maxWidth: "70ch" }}>
        Cada nivel está codificado en cuatro canales a la vez —color, forma del icono, estilo de
        borde y tamaño— para que se distinga igual con daltonismo, con reflejo en la pantalla o de
        reojo desde el otro lado de la estación.
      </p>

      <div className="fg-spec-grid">
        {SPECS.map((spec) => (
          <div key={spec.name} className="fg-spec">
            <div className="fg-spec-swatch" style={{ background: spec.swatch }}>
              {spec.icon}
            </div>
            <div className="fg-spec-level">{spec.level}</div>
            <div className="fg-spec-name">{spec.name}</div>
            {spec.rows.map(([key, value]) => (
              <div key={key} className="fg-spec-row">
                <span className="fg-spec-key">{key}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 28, marginBottom: 16, color: "var(--color-sapphire)" }}>
        Escalada: salida de cama → caída
      </h2>
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
        <div className="fg-flow-step">Atendida · respuesta medida desde 14:31:02</div>
      </div>
      <p className="fg-section-sub" style={{ marginTop: -20, marginBottom: 36, maxWidth: "70ch" }}>
        La alerta no se duplica: la misma tarjeta pasa de ámbar a roja en su lugar y conserva la
        hora de salida, para que el tiempo de respuesta se mida desde el primer aviso.
      </p>

      <h2 style={{ fontSize: 28, marginBottom: 16, color: "var(--color-sapphire)" }}>
        Escala tipográfica para lectura a distancia
      </h2>
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

      <h2 style={{ fontSize: 28, marginBottom: 16, color: "var(--color-sapphire)" }}>
        Roadmap: sensor de peso
      </h2>
      <div className="fg-spec" style={{ maxWidth: 560 }}>
        <div className="fg-spec-row">
          <span className="fg-spec-key">Hoy</span>
          <span>Botón bajo el colchón · estado binario ocupada/vacía</span>
        </div>
        <div className="fg-spec-row">
          <span className="fg-spec-key">Siguiente</span>
          <span>FSR o celda de carga · «68.2 kg» y mini-gráfica al lado del estado</span>
        </div>
        <div className="fg-spec-row">
          <span className="fg-spec-key">Después</span>
          <span>Patrones de movimiento · «Movimiento inquieto» reemplaza la etiqueta</span>
        </div>
        <p className="fg-section-sub" style={{ marginTop: 12 }}>
          La fila de estado de la tarjeta ya reserva su lado derecho para esto: nada pide
          rediseñar la pantalla. Actívalo con <code>showWeight</code> en{" "}
          <code>src/mock/data.ts</code>.
        </p>
      </div>
    </div>
  );
}
