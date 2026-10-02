"use client";

import { ModelTester } from "~/app/_components/ModelTester";

/** Vista Cámara IA: prueba del modelo de detección de caídas de Roboflow. */
export function CameraView() {
  return (
    <div className="fg-view">
      <p className="fg-section-sub" style={{ marginBottom: 28, maxWidth: "70ch" }}>
        Un modelo de visión artificial analiza la imagen de la cámara y marca a las personas que
        detecta en el suelo. Prueba con la cámara del equipo o sube una imagen.
      </p>

      <h2 style={{ fontSize: 28, marginBottom: 16, color: "var(--color-sapphire)" }}>
        Probar el modelo
      </h2>
      <ModelTester />
    </div>
  );
}
