# Handoff: FallGuard — Nurse Station Dashboard

## Overview
FallGuard is a hospital early-warning system (hackathon project). An Arduino Mega on each bed detects two events in real time: **falls** (MPU6050: free-fall → impact → stillness) and **unassisted bed exits** (occupancy buttons under the mattress). Events arrive over serial → Node.js gateway → HTTP POST → Next.js (T3: tRPC + Prisma + SQLite) → **Server-Sent Events** → this dashboard.

The dashboard runs on a shared wall monitor or tablet at the nurse station. It must be readable at a glance from a distance (1–2 s), stay calm by default, and be impossible to misread when a fall is confirmed: who, which room/bed, how urgent, with no clicking needed.

## About the Design Files
The files in this bundle are **design references created in HTML**. They are prototypes that show the intended look and behavior. They are not production code to copy directly. Recreate them in the target codebase, which per the brief is an existing **Next.js T3 app** (React, tRPC, Prisma). Use its patterns: React components, the existing SSE stream for pushed events, and tRPC mutations for "attend". `FallGuard Dashboard.dc.html` opens directly in a browser (it needs `support.js` and `ds/styles.css` next to it). The logic class at the bottom of the file shows every derived value and state transition.

## Fidelity
**High-fidelity.** Colors, type sizes, borders and states are final. Recreate them pixel-accurately. Styling comes from the **Industry** design system (`ds/styles.css`): steel-blue wireframe look, Barlow Condensed headings over Barlow body, square corners, hairline borders, "+" registration marks at the corners of framed objects. Two functional severity colors (red, amber) were added outside the system on purpose. See Design Tokens.

---

## Severity system (core concept)
Three levels. Each is encoded on **four channels at once** (color, icon shape, border style, size), so it still reads with color blindness or glare.

| Level | Label (copy) | Color | Icon (Lucide, stroke 1.5) | Border | Motion | Size in alert band |
|---|---|---|---|---|---|---|
| 1 Normal | "En observación" | Ink on light ground, steel accent `#5980a6` | `circle` (hollow) | 1px hairline | None | Single calm strip "Sin alertas activas" |
| 2 Bed exit | "Fuera de cama" | Amber diagonal hatch | `triangle-alert` | 2px **dashed** `#b7791f` | None | Half-width card, room number 68px |
| 3 Fall | "Caída confirmada" | Solid red `#b3261e`, white text (≈6.4:1) | `octagon-alert` | 3px **solid** `#7a1712` | Halo pulse, 1.6s loop | **Full-width**, always first, room number 104px |

**Amber hatch fill:** `repeating-linear-gradient(135deg, #f6e6c4 0 10px, #fbf3e2 10px 20px)`
**Fall pulse:** `@keyframes fgPulse { 0% { box-shadow: 0 0 0 0 rgba(179,38,30,.55) } 70% { box-shadow: 0 0 0 16px rgba(179,38,30,0) } 100% { box-shadow: 0 0 0 0 rgba(179,38,30,0) } }`, `animation: fgPulse 1.6s ease-out infinite`. Recommended: disable under `prefers-reduced-motion` (the prototype doesn't).

**Escalation (2 → 3):** when a patient with an active bed-exit alert then falls, the **same alert** is upgraded in place (amber card becomes red card) and keeps the original exit time as `exitAt`. The fall card then shows two chips: `Salió de cama HH:MM:SS` → `Caída {N s} después`. Response time is measured from the **first** alert (`exitAt ?? t`).

---

## Screens / Views

### Global header (all tabs)
- Flex row, `flex-wrap: wrap`, gap `20px 32px`, padding `16px 32px`, bottom border `1px solid var(--color-divider)`.
- Left (`margin-right:auto`): "FallGuard" in Barlow Condensed 600, 30px, line-height 1. Next to it: "Estación de enfermería · Piso 3, ala B" in Barlow 15px, `--color-neutral-700`.
- Tabs: Industry `.seg` segmented control with options "Panel", "Historial", "Sistema" (15px, padding 8px 16px, `white-space:nowrap`). The checked option gets a solid accent fill (built into `.seg-opt:has(input:checked)`).
- Shift nurse: label "Turno" (14px, neutral-700) + `.seg` with "L. Ramírez", "M. Soto", "J. Herrera". This sets who is credited when a nurse attends from a card.
- Right: live indicator (8×8 square in `--color-accent` + "En vivo", 14px, `--color-accent-700`) and a clock `HH:MM:SS` (Barlow Condensed 600, 30px, tabular numbers, ticks every second).

### 1. Panel (main shared-screen view)
Padding `28px 32px 40px`.

**A. Alert band** ("Alertas activas", h2 32px, plus a summary such as "1 caída · 1 salida de cama", 16px neutral-700). Margin-bottom 36px.
- **No alerts:** `.blueprint` frame with corner marks, padding 24px 28px, flex gap 20px. Hollow circle icon 32px in accent, "Sin alertas activas" (Barlow Condensed 600, 30px), subline "12 pacientes en observación · última alerta atendida hace N min" (16px, neutral-700).
- **Alerts:** grid `repeat(auto-fit, minmax(min(100%, 460px), 1fr))`, gap 20px. Sort: falls first, then oldest first.
  - **Fall card:** `grid-column: 1 / -1`, background `#b3261e`, color `#fff`, border `3px solid #7a1712`, padding 24px 28px, inner grid `auto | minmax(0,1fr) | auto`, gap 28px, pulse animation, blueprint corner marks, cursor pointer (opens detail).
    - Col 1: room number (Barlow Condensed 600, **104px**, line-height .9, tabular). Below it "Cama A" (22px/500, margin-top 16px). Right divider `1px solid rgba(255,255,255,.5)`, padding-right 28px.
    - Col 2: octagon icon 44px + "Caída confirmada" (Barlow Condensed 600, 44px). Patient name 30px/500. Meta line 17px: "{edad} años · {riesgo} · detectada a las HH:MM:SS". If escalated, chips 17px (1px white border, padding 2px 8px, nowrap, row wraps). The second chip has background `#7a1712`.
    - Col 3 (right-aligned): elapsed `M:SS` (Barlow Condensed 600, 48px) + "sin atender" (15px). Button "Atender" with a check icon: white background, text `#7a1712`, 24px, padding 14px 32px, square, blueprint marks, hover `#fbe8e6`. **Attends immediately** (credited to the shift nurse) and stops click propagation.
  - **Bed-exit card:** amber hatch background, `2px dashed #b7791f`, padding 20px 22px, same 3-column grid with gap 20px, corner marks.
    - Room 68px + "Cama A" 18px/500. Triangle icon 30px + "Fuera de cama" (Barlow Condensed 600, 32px) in `#6e4a0e`. Name 22px/500. Meta 15px `#4a3208`: "{riesgo} · desde las HH:MM:SS".
    - Elapsed 36px + `.btn.btn-secondary` "Atender" (18px, padding 10px 20px, white background, border `#6e4a0e`, hover `#f6e6c4`).

**B. Two columns below** (flex, wrap, gap 36px):
- **Patient list** (`flex: 2 1 680px`). h2 "Pacientes monitoreados" 28px + "12 camas · N ocupadas". Header row labels "Habitación / Paciente / Camilla / Estado" (14px neutral-700, sentence case, **no uppercase eyebrows**). Rows use grid `100px | minmax(0,1fr) | minmax(0,190px) | minmax(0,200px)`, gap 16px, min-height 70px, padding 10px 16px. **Order is fixed by room number.** Rows never reorder when an alert arrives, so each patient stays in the same spot on the wall screen.
  - Room: Barlow Condensed 600 34px + bed letter 18px.
  - Patient: name 21px/500. Below it "{edad} años · {Riesgo alto de caída | Riesgo medio | Riesgo bajo}" 14px.
  - Bed cell (Lucide `bed`, 22px): "Ocupada" / "Vacía" (16px). A second line is reserved for the future weight sensor (see Roadmap).
  - Status: see row variants.
  - **Row variants:**
    - Normal: transparent, bottom rule `1px color-mix(in srgb, var(--color-text) 8%, transparent)`. Status is a 16px hollow circle + "En observación" 17px neutral-800.
    - Out of bed: amber hatch, `2px dashed #b7791f`, margin 3px 0, clickable. Status is a triangle 22px + **"Fuera de cama"** (17px/700, `#6e4a0e`) + elapsed.
    - Fall: `#b3261e` background, white text, `3px solid #7a1712`, clickable. Status is an octagon 26px + **"Caída"** 19px/700 + elapsed.
- **Handled alerts** (`flex: 1 1 340px`). h2 "Atendidas" + ghost button "Ver historial completo" (goes to the Historial tab). A blueprint metric box: "Tiempo promedio de respuesta hoy" + value (Barlow Condensed 36px, `--color-accent-800`). Then the last 6 items, each a grid `52px | 22px | 1fr | auto`: time HH:MM, severity icon (red octagon `#b3261e` or amber triangle `#9a6716`, 20px), "{hab} · {nombre}" 16px over "{tipo} · {enfermero}" 13px, and response time.

### 2. Historial
- h1 "Historial de alertas" 40px.
- Three blueprint metric cells (grid `auto-fit, minmax(min(100%,260px),1fr)`, gap 20px, padding 20px 22px): "Tiempo promedio de respuesta" (56px, accent-800) + "N alertas atendidas en este turno"; "Caídas · respuesta promedio"; "Salidas de cama · respuesta promedio". This is the pitch metric.
- Filter `.seg`: "Todas / Caídas / Salidas de cama".
- Industry `.table` at 17px. Headers override the system's uppercase style (`text-transform:none; letter-spacing:0; 14px`). Columns: Hora (HH:MM:SS), Evento (icon + label), Habitación (Barlow Condensed 22px), Paciente, Atendió, Tiempo de respuesta (right-aligned). Response format: `42 s` or `1 min 24 s`.

### 3. Event detail (dialog)
Opens when clicking an active alert card or an alerted patient row. Industry `.dialog-backdrop` (z-index 50; clicking it closes the dialog) + `.dialog.blueprint`, width `min(680px, 100%)`, background `--color-bg`, padding 0.
- Header strip: red (fall) or amber hatch (exit), padding 20px 24px, with the icon, the type title (Barlow Condensed 34px) and a live elapsed timer on the right.
- Body (padding 24px, gap 22px): room 80px + bed 28px; name 28px/500; "{edad} años · {riesgo}".
- "Secuencia del sensor" list (grid `120px | 1fr`, 16px), timestamps with tenths `HH:MM:SS.s`:
  - Escalated: "Camilla vacía · sensor de ocupación" (exitAt).
  - Fall: "Caída libre detectada · MPU6050" (t − 2.3 s), "Impacto" (t − 2.0 s), "Quietud confirmada · caída registrada" (t). The offsets are mocked. Use real timestamps if the Arduino/gateway sends them.
  - Exit: "Camilla vacía · sensor de ocupación".
- Footer: "Atiende" + nurse `.seg` (defaults to the shift nurse); "Cerrar" (`.btn-secondary`); **"Marcar como atendida"** (`.btn-primary.blueprint` with a check icon, 19px).

### 4. Sistema (optional in production)
A reference page showing the severity system for the pitch. It has three spec cards, the exit→fall transition diagram, the type scale for distance reading, and the bed-cell roadmap. You can skip it in the real app or keep it as an internal page.

### Demo footer (hackathon only)
Buttons "Salida de cama", "Caída", "Salida → caída (6 s)" and "Reiniciar" simulate Arduino events on a random patient without an alert. In production, replace this with the real SSE feed. You may keep it behind a dev flag.

---

## Interactions & Behavior
- **Push-driven:** events arrive via SSE at any time. On `FALL,<id>`: if the patient has an active `exit` alert, upgrade it to `fall` (set `exitAt = old.t`, `t = now`). Otherwise create a new fall alert. On `BEDEXIT,<id>`: create an exit alert if none is active for that patient.
- **Attend:** remove the alert from the active list and add a history entry `{pid, type, t: now, resp: (now − (exitAt ?? t))/1000, nurse}`. The patient row returns to Normal. This should be a tRPC mutation that is broadcast back to all open dashboards over SSE, so every screen clears together.
- **Timers:** re-render every 1 s for the clock and every elapsed counter (`M:SS`).
- **Hover:** fall button → `#fbe8e6`. Exit button → `#f6e6c4`. Industry buttons, seg options and table rows use their built-in hover and pressed states. Focus uses a `2px solid var(--color-accent)` outline with a 2px offset.
- **Responsive:** fluid layout. Grids use `minmax(0, …)` and `auto-fit` and wrap. The header wraps, and seg labels are `nowrap`. The main target is a 1920×1080 wall display, and it has been checked down to about 920px.
- No login or authentication for the MVP.

## State Management
```
alerts:   [{ id, pid, type: 'exit'|'fall', t: ms, exitAt: ms|null }]   // active
history:  [{ id, pid, type, t: ms (attended at), resp: seconds, nurse }]
patients: [{ id:'304A', room:'304', bed:'A', name, age, risk:'alto'|'medio'|'bajo', weightKg? }]
ui:       { tab, shiftNurse, detailAlertId, detailNurse, historyFilter, now }
```
Derived: patient status = type of that patient's active alert, or normal. Bed occupied = no active alert (today). Averages come from `history.resp`. Suggested Prisma models: `Patient`, `Event` (type, createdAt, escalatedFrom?), `Acknowledgement` (eventId, nurse, at).

## Roadmap hook: bed sensor cell
The "Camilla" column has a fixed width and two lines. Today it uses line 1 only ("Ocupada"/"Vacía"). When FSR or load-cell sensors arrive, line 2 shows `68.2 kg` (13px, tabular) and a 64×18 sparkline (polyline, stroke 1.2, accent). The prototype shows this through the `showWeight` tweak, and the weight drops to 0 when the bed is empty. A third stage is a line-1 label such as "Movimiento inquieto". None of this requires a layout change.

## Design Tokens
From Industry `ds/styles.css` (use the CSS variables):
- `--color-bg #f2f2f3`, `--color-surface #e9e9ea`, `--color-text #1d1f20`, `--color-accent #5980a6`, `--color-divider` = text at 16%.
- Accent ramp: 100 `#eef6ff`, 500 `#749dc4`, 600 `#597ea3`, 700 `#416180`, 800 `#2c455d`, 900 `#1d2d3d`.
- Neutral ramp: 600 `#7a7a7d`, 700 `#5d5d60`, 800 `#424244`.
- Fonts: `--font-heading` Barlow Condensed 600. `--font-body` Barlow 400/500/700 (Google Fonts).
- Radius: **0** on cards, buttons, seg and dialog (blueprint style). Corner marks: `.blueprint` plus `<i class="corner tl|tr|bl|br">`.
- Spacing scale: `--space-1..8` = 3.4 / 6.8 / 10.2 / 13.6 / 20.4 / 27.2px (the prototype also uses literal 16/20/24/28/32px gaps and padding).

Functional severity colors (added, not in Industry):
- Fall: `#b3261e` (fill), `#7a1712` (deep border and chip), `#fbe8e6` (hover tint), text `#fff`.
- Bed exit: `#b7791f` (dashed border), `#f6e6c4` / `#fbf3e2` (hatch), `#6e4a0e` (text and icon), `#4a3208` (secondary text), `#9a6716` (small icon on the light ground).

Type scale used: 104 / 80 / 68 / 56 / 48 / 44 / 40 / 36 / 34 / 32 / 30 / 28 px (Barlow Condensed) and 30 / 28 / 22 / 21 / 19 / 17 / 16 / 15 / 14 / 13 px (Barlow).

## Assets
- Icons: **Lucide** at stroke-width 1.5, used `circle`, `triangle-alert`, `octagon-alert`, `bed`, `check`. Use `lucide-react` in the app.
- No images or photos.

## Files
- `FallGuard Dashboard.dc.html`: the full interactive prototype (template plus the logic class with mock data, derivations and state transitions).
- `support.js`: the runtime needed to open the prototype in a browser.
- `ds/styles.css`: the Industry design-system stylesheet (tokens plus `.btn`, `.seg`, `.table`, `.dialog`, `.blueprint`).
- Original brief: `Handoff de diseño - FallGuard (sistema de alerta de caídas).md`.
