# Handoff: FallGuard — Nurse Station Dashboard (v2 · "Columna de alertas")

## Overview
FallGuard is a hospital early-warning system (hackathon project). An Arduino Mega on each bed detects two events in real time: **falls** (MPU6050: free-fall → impact → stillness) and **unassisted bed exits** (occupancy buttons under the mattress). Events flow over serial → Node.js gateway → HTTP POST → Next.js (T3: tRPC + Prisma + SQLite) → **Server-Sent Events** → this dashboard.

The dashboard runs on a shared wall monitor or tablet at the nurse station. It must be readable at a glance from a distance (1–2 s), stay calm by default, and be impossible to misread when a fall is confirmed: who, which room/bed, how urgent, with no clicking needed.

v2 is the approved direction. It uses the **"Columna de alertas"** layout (a fixed alerts column on the left) and the **teal clinical palette** (Scooter / Alabaster / Heather / Blue Lagoon / Sapphire).

## About the Design Files
The files in this bundle are **design references created in HTML**. They are prototypes that show the intended look and behavior, not production code to copy directly. Recreate them in the target codebase, which is an existing **Next.js T3 app** (React, tRPC, Prisma). Use its patterns: React components, the existing SSE stream for pushed events, and tRPC mutations for "attend".

`FallGuard Dashboard v2.dc.html` opens directly in a browser (it needs `support.js` and `ds/styles.css` next to it). The logic class at the bottom of the file contains all mock data, derived values and state transitions. It is the best spec for behavior.

## Fidelity
**High-fidelity.** Colors, type sizes, radii and states are final. Recreate them pixel-accurately.

The base stylesheet `ds/styles.css` (Industry design system) is used only for its fonts (Barlow Condensed / Barlow) and a few native-element classes (`.seg`, `.btn`, `.table`, `.dialog-backdrop`). Its accent tokens are overridden on the root with the teal palette (see Design Tokens). v2 **does not** use the Industry "blueprint" corner marks. Surfaces are white cards with 8px radius.

---

## Severity system (core concept)
Three levels. Each is encoded on **four channels at once** (color, icon shape, border style, size), so it still reads with color blindness or glare.

| Level | Label (copy) | Color | Icon (Lucide, stroke 1.5) | Border | Motion | Size in alerts column |
|---|---|---|---|---|---|---|
| 1 Normal | "En cama · normal" | White card, Scooter `#2F9D94` accent | `circle` (hollow) | 1px Heather `#BCC5CC` | None | "Sin alertas activas" empty state |
| 2 Bed exit | "Fuera de cama" | Amber diagonal hatch | `triangle-alert` | 2px **dashed** `#c7861a` | None | Compact card, room number 68px |
| 3 Fall | "Caída confirmada" | Solid red `#b3261e`, white text (≈6.4:1) | `octagon-alert` | 3px **solid** `#7a1712` | Halo pulse, 1.6s loop | Always at the top, full column width, room number 104px |

- **Amber hatch:** `repeating-linear-gradient(135deg, #fbe9c3 0 10px, #fdf4e1 10px 20px)`
- **Fall pulse:** `@keyframes fgPulse { 0% { box-shadow: 0 0 0 0 rgba(179,38,30,.55) } 70% { box-shadow: 0 0 0 16px rgba(179,38,30,0) } 100% { box-shadow: 0 0 0 0 rgba(179,38,30,0) } }`, `animation: fgPulse 1.6s ease-out infinite`. Disable it under `prefers-reduced-motion`.
- Red and amber are functional colors, kept separate from the teal brand palette. Never use teal for alerts or red/amber for decoration.

**Escalation (2 → 3):** when a patient with an active bed-exit alert then falls, the **same alert** is upgraded in place and keeps the original exit time as `exitAt`. The card turns red and moves to the top of the column, since falls are sorted first. It shows two pill chips: `Salió de cama HH:MM:SS` → `Caída {N s} después`. Response time is measured from the **first** alert (`exitAt ?? t`).

---

## Layout (all views)
Root: `display:grid; grid-template-columns: 72px 500px minmax(0,1fr); min-height:100vh; background:#F7F6F2`.

### Column 1 — Navigation rail (72px)
- Background Sapphire `#063154`. Sticky, full height. Flex column centered, gap 10px, padding 20px 0.
- "FG" monogram at the top: Barlow Condensed 600, 24px, `#F7F6F2`, margin-bottom 18px.
- Three nav buttons, each 56×56px, radius 8px, icon 22px over a label 11px. Items: **Panel** (Lucide `layout-grid`), **Historial** (`history`), **Sistema** (`info`).
  - Active: background Scooter `#2F9D94`, color `#fff`.
  - Inactive: transparent, color Heather `#BCC5CC`.
- Bottom (`margin-top:auto`): live indicator, an 8px Scooter dot over "En vivo" (11px, Heather).

### Column 2 — Alerts column (500px, always visible)
- Background `#ffffff`, right border `1px solid #BCC5CC`, padding 24px, flex column gap 16px, sticky full height with `overflow-y:auto`.
- Header: "Alertas activas" (Barlow Condensed 600, 32px, Sapphire) and a right-aligned summary such as "1 caída · 1 salida" (15px, `#51606c`).
- **Empty state:** 1px Heather border, radius 8, padding 28px 24px. Hollow circle 36px in Scooter, "Sin alertas activas" (Barlow Condensed 600, 32px, Sapphire), and the subline "12 pacientes en cama · última alerta atendida hace N min" (16px, `#51606c`).
- Alerts are sorted **falls first**, then oldest first.
- **Fall card** (vertical stack): background `#b3261e`, color `#fff`, border `3px solid #7a1712`, radius 8, padding 22px, gap 10px, pulse animation. Clicking it opens the detail dialog.
  - Row 1: room number (Barlow Condensed 600, **104px**, line-height .9, tabular) with "Cama A" below (22px/500, margin-top 12px). Right-aligned elapsed `M:SS` (Barlow Condensed 600, 48px) over "sin atender" (15px).
  - Octagon icon 40px + "Caída confirmada" (Barlow Condensed 600, 44px).
  - Patient name 30px/500. Meta 17px: "{edad} años · {riesgo} · HH:MM:SS".
  - Escalation chips (only when `exitAt` is set): 16px, 1px white border, radius 999px, padding 2px 10px, nowrap, wrapping row. The second chip has background `#7a1712`.
  - Full-width button **"Atender"** with a check icon: background `#fff`, text `#7a1712`, radius 8, 24px, padding 14px, hover `#fbe8e6`. It **attends immediately**, credited to the shift nurse, and must `stopPropagation`.
- **Bed-exit card:** amber hatch, `2px dashed #c7861a`, radius 8, padding 16px 18px. Grid `auto | minmax(0,1fr) | auto`, gap 16px. Clickable (opens detail).
  - Room number 68px + "Cama A" 16px/500.
  - Triangle icon 26px + "Fuera de cama" (Barlow Condensed 600, 30px, `#6b4608`). Name 20px/500 (ellipsis). "desde las HH:MM:SS" 14px `#4a3208`.
  - Right: elapsed 34px + secondary button "Atender" (17px, padding 8px 16px, border `#6b4608`, background `#fff`, radius 8, hover `#fbe9c3`).
- **Footer metric** (`margin-top:auto`): 1px Heather box, radius 8, padding 16px 18px. "Respuesta promedio hoy" (15px, `#51606c`) with the value on the right (Barlow Condensed 600, 34px, Blue Lagoon `#025F67`).

### Column 3 — Main content
- Padding 24px 32px 32px.
- **Top bar** (flex, wraps, gap 16px 24px, margin-bottom 22px):
  - Left: page title (Barlow Condensed 600, 34px, Sapphire) over a subtitle (15px, `#51606c`).
    - Panel: "Pacientes monitoreados" / "Piso 3, ala B · 12 camas · N ocupadas".
    - Historial: "Historial de alertas" / "N alertas atendidas en este turno".
    - Sistema: "Sistema de severidad" / "Cómo se distingue cada nivel de alerta".
  - Right: "Turno" (14px) + `.seg` with "L. Ramírez / M. Soto / J. Herrera" (radius 8, checked option filled Scooter). Then the clock `HH:MM:SS` (Barlow Condensed 600, 34px, Sapphire, tabular, ticks every second).
- **Demo footer** (hackathon only, `showSimulator`): top border Heather, padding 14px 32px. "Demostración: simular un evento del Arduino" + secondary buttons "Salida de cama", "Caída", "Salida → caída (6 s)" and a ghost "Reiniciar". Replace it with the real SSE feed in production, or keep it behind a dev flag.

---

## Views

### 1. Panel
**Patient cards grid:** `display:grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px`. **Order is fixed by room number.** Cards never reorder when an alert arrives, so each patient keeps the same spot on the wall screen.

Card anatomy (flex column, gap 10px, `min-width:0`):
1. **Profile picture placeholder:** a 40×40 circle (`border-radius:50%`, 1px dashed border) to be replaced by the patient photo (`object-fit: cover`, same size; fall back to the placeholder or initials). Next to it the room number (Barlow Condensed 600, 30px) + bed letter 17px.
2. Name 18px/500 (one line, ellipsis). Below it "{edad} años · {Riesgo alto de caída | Riesgo medio | Riesgo bajo}" 13px (ellipsis).
3. Status row (14px, `padding-top:8px`, top divider, `justify-content:space-between`): state on the left, optional weight reading on the right (see Roadmap).

Variants:
- **Normal:** background `#fff`, `1px solid #BCC5CC`, radius 8, padding 14px, shadow `0 1px 2px rgba(6,49,84,.08)`. Avatar `#e6ebee` with a `#9aa7b1` dashed border. Room number in Sapphire. Divider `#dfe3e6`. Status is a 12px hollow circle in Scooter + "En cama · normal" in Blue Lagoon.
- **Out of bed:** amber hatch, `2px dashed #c7861a`, radius 8, padding 13px, clickable (opens detail). Avatar `#fdf4e1` with a `#c7861a` border. Meta `#4a3208`. Dashed divider `#c7861a`. Status is a 16px triangle + "Fuera de cama · M:SS" (700, `#6b4608`).
- **Fall:** background `#b3261e`, white text, `3px solid #7a1712`, radius 8, padding 12px, clickable. Avatar `#7a1712` with a white dashed border. Divider `rgba(255,255,255,.5)`. Status is a 16px octagon + "Caída · M:SS" (700).

Padding shrinks as the border thickens (14 / 13 / 12), so all cards keep the same outer size.

Handled alerts are not shown on the Panel. They live only in **Historial**, and the Panel stays focused on current patients.

### 2. Historial
- Three metric cards (grid `auto-fit, minmax(min(100%,240px),1fr)`, gap 16px; white, 1px Heather, radius 8, padding 20px 22px):
  - "Tiempo promedio de respuesta": 56px Blue Lagoon, with "N alertas atendidas en este turno" below.
  - "Caídas · respuesta promedio": 56px Sapphire, with the fall count below.
  - "Salidas de cama · respuesta promedio": 56px Sapphire, with the exit count below.
  - Response time is the pitch metric. This view is the only place handled alerts appear.
- Filter `.seg` (radius 8): "Todas / Caídas / Salidas de cama".
- Table inside a white card (1px Heather, radius 8, padding 4px 12px), `.table` at 17px. Headers are sentence case (`text-transform:none`), 14px `#51606c`. Row rules `#dfe3e6`.
  - Columns: Hora (HH:MM:SS), Evento (icon + label), Habitación (Barlow Condensed 22px, Sapphire), Paciente, Atendió, Tiempo de respuesta (right-aligned).
  - Response format: `42 s` or `1 min 24 s`.

### 3. Sistema (reference page; optional in production)
- Three spec cards for the severity levels (a specimen swatch 96px tall plus the Color / Forma / Borde / Movimiento / En la columna rows).
- The exit → fall transition diagram, and a note on the weight-sensor slot.

### 4. Event detail (dialog)
Opens when clicking an active alert card or an alerted patient card.
- Backdrop `rgba(6,49,84,.55)`, z-index 50; clicking it closes the dialog.
- Dialog `min(680px,100%)`, background `#F7F6F2`, 1px Heather border, radius 10, overflow hidden.
- Header strip: red (fall, bottom border 3px `#7a1712`) or amber hatch (exit, bottom border 2px dashed `#c7861a`). It holds the icon, the title (Barlow Condensed 34px) and a live elapsed timer on the right.
- Body (padding 24px, gap 22px):
  - A 64px avatar placeholder, the room number (80px, Sapphire) + bed 28px, the name 28px/500 and "{edad} años · {riesgo}".
  - "Secuencia del sensor" list (grid `120px | 1fr`, 16px), timestamps `HH:MM:SS.s`:
    - Escalated: "Camilla vacía · sensor de ocupación" (exitAt).
    - Fall: "Caída libre detectada · MPU6050" (t − 2.3 s), "Impacto" (t − 2.0 s), "Quietud confirmada · caída registrada" (t). These offsets are mocked. Use real timestamps if the Arduino/gateway sends them.
    - Exit: "Camilla vacía · sensor de ocupación".
  - Footer: "Atiende" + nurse `.seg` (defaults to the shift nurse), "Cerrar" (secondary, radius 8), and **"Marcar como atendida"** (Blue Lagoon `#025F67` background, white text, radius 8, 19px, hover Sapphire `#063154`).

---

## Interactions & Behavior
- **Push-driven:** events arrive over SSE at any time.
  - On `FALL,<id>`: if the patient has an active `exit` alert, upgrade it to `fall` (`exitAt = old.t`, `t = now`). Otherwise create a new fall alert.
  - On `BEDEXIT,<id>`: create an exit alert unless one is already active for that patient.
- **Attend:** remove the alert from the column and add a history entry `{pid, type, t: now, resp: (now − (exitAt ?? t))/1000, nurse}`. The patient card returns to Normal. This should be a tRPC mutation that is broadcast back over SSE, so every open screen clears together.
- **Timers:** re-render every 1 s for the clock and all `M:SS` counters.
- **Navigation:** the rail switches Panel / Historial / Sistema. The alerts column stays visible on every view.
- **Hover/focus:** as specified per component. Focus uses `outline: 2px solid #2F9D94; outline-offset: 2px`.
- **Responsive:** built for a 1920×1080 or 1440px-wide wall display. The main grid uses `auto-fill`, so it reflows to fewer columns. Below about 1100px, consider stacking the alerts column above the main content.
- No login or authentication for the MVP.

## State Management
```
alerts:   [{ id, pid, type: 'exit'|'fall', t: ms, exitAt: ms|null }]   // active
history:  [{ id, pid, type, t: ms (attended at), resp: seconds, nurse }]
patients: [{ id:'304A', room:'304', bed:'A', name, age, risk:'alto'|'medio'|'bajo', photoUrl?, weightKg? }]
ui:       { tab: 'panel'|'history'|'system', shiftNurse, detailAlertId, detailNurse, historyFilter, now }
```
- Derived values:
  - Patient status is the type of that patient's active alert, or normal.
  - The bed counts as occupied when there is no active alert (today).
  - Averages come from `history.resp`.
- Suggested Prisma models: `Patient` (with `photoUrl`), `Event` (type, createdAt, escalatedFrom?), `Acknowledgement` (eventId, nurse, at).

## Roadmap hook: weight sensor
The status row of each patient card already reserves its right side. With FSR or load cells, it shows `68.2 kg` (12px, tabular) and a 48×16 sparkline (polyline, stroke 1.2, Scooter; white on fall cards, `#6b4608` on exit cards). The weight drops to 0 when the bed is empty. The prototype shows this with the `showWeight` tweak. Later, the status label can carry finer states such as "Movimiento inquieto". None of this changes the card size.

## Design Tokens
**Brand palette (teal clinical):**
- Scooter `#2F9D94`: calm state, active nav, live dot, segmented control fill.
- Alabaster `#F7F6F2`: page ground, dialog background.
- Heather `#BCC5CC`: card borders, inactive nav icons.
- Blue Lagoon `#025F67`: key metrics, links, primary action.
- Sapphire `#063154`: nav rail, headings, room numbers on normal cards.

**Neutrals:** text `#0b2236`, secondary text `#51606c`, body copy on light `#2a3f4f`, row rule `#dfe3e6`, avatar fill `#e6ebee`, avatar border `#9aa7b1`, card surface `#ffffff`.

**Functional severity colors:**
- Fall: `#b3261e` fill, `#7a1712` deep (border, chip), `#fbe8e6` hover tint, white text.
- Bed exit: `#c7861a` dashed border, `#fbe9c3` / `#fdf4e1` hatch, `#6b4608` text and icon, `#4a3208` secondary text, `#a06b12` small icon on white.

**Root overrides for the base stylesheet:** `--color-accent:#2F9D94; --color-bg:#F7F6F2; --color-text:#0b2236; --color-divider:#BCC5CC`.

**Type:**
- Families: Barlow Condensed 600 for headings and numbers, Barlow 400/500/700 for body (Google Fonts).
- Condensed sizes: 104 / 80 / 68 / 56 / 48 / 44 / 34 / 32 / 30 / 26 / 24 px.
- Body sizes: 30 / 28 / 24 / 22 / 20 / 18 / 17 / 16 / 15 / 14 / 13 / 12 / 11 px.
- Use tabular numbers for all times and counters.

**Radius:** 8px on cards, buttons and seg. 10px on the dialog. 999px on chips. 50% on avatars and dots.
**Shadow:** normal patient card `0 1px 2px rgba(6,49,84,.08)`. No other shadows except the fall pulse.
**Spacing:** 10 / 12 / 14 / 16 / 18 / 20 / 22 / 24 / 28 / 32 px as specified above.

## Assets
- Icons: **Lucide** at stroke-width 1.5, used `circle`, `triangle-alert`, `octagon-alert`, `check`, `layout-grid`, `history`, `info`. Use `lucide-react` in the app.
- Patient photos: not supplied. Cards use a circle placeholder (40px on cards, 64px in the detail dialog). Swap in `photoUrl` when available.
- No other imagery.

## Files
- `FallGuard Dashboard v2.dc.html`: the approved interactive prototype (layout "Columna de alertas" + teal palette). It includes mock data, derivations and state transitions in its logic class. Tweaks: `scenario` (mixto / calma / salida / caida), `showWeight`, `showSimulator`.
- `support.js`: the runtime needed to open the prototype in a browser.
- `ds/styles.css`: the base stylesheet (fonts plus `.seg`, `.btn`, `.table`, `.dialog-backdrop`).
- `Handoff de diseño - FallGuard (sistema de alerta de caídas).md`: the original product brief.
