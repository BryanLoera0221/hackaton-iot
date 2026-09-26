"use client";

/** Marcas de registro "+" en las esquinas de un objeto enmarcado (Industry). */
export function Corners() {
  return (
    <>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
    </>
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
