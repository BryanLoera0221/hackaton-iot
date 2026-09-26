"use client";

import { OctagonAlert, TriangleAlert } from "lucide-react";

const STROKE = 1.5;

/** Icono chico de severidad sobre fondo claro (listas y tablas). */
export function SeverityIcon({ type, size = 20 }: { type: "fall" | "exit"; size?: number }) {
  return type === "fall" ? (
    <OctagonAlert size={size} strokeWidth={STROKE} color="#b3261e" aria-hidden />
  ) : (
    <TriangleAlert size={size} strokeWidth={STROKE} color="#a06b12" aria-hidden />
  );
}

type SegOption<T extends string> = { value: T; label: string };

/** Control segmentado del sistema Industry. */
export function Seg<T extends string>({
  name,
  value,
  options,
  onChange,
  small = false,
  ariaLabel,
}: {
  name: string;
  value: T;
  options: readonly SegOption<T>[];
  onChange: (value: T) => void;
  small?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div className={small ? "seg seg-sm" : "seg"} role="group" aria-label={ariaLabel}>
      {options.map((opt) => (
        <label key={opt.value} className="seg-opt">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

/** Lista de nombres → opciones del control segmentado. */
export function toOptions(values: readonly string[]) {
  return values.map((v) => ({ value: v, label: v }));
}

/** Iniciales de un nombre, para el placeholder de foto del paciente. */
export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
