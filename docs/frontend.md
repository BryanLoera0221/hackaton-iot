# Frontend FallGuard — cómo cambiar los datos

`FALLGUARD_CONFIG.useLiveFeed` decide de dónde sale todo:
- `false` → mock puro. Todo lo que se ve sale de un solo archivo:
  [`src/mock/data.ts`](../src/mock/data.ts). Ningún componente tiene datos
  quemados.
- `true` (default hoy) → pacientes e historial salen de tRPC
  (`api.patients.list`, `api.alerts.list`) contra la base Prisma, y los
  eventos en vivo llegan por SSE (`/api/alerts/stream`). Ver
  [`docs/setup-backend.md`](./setup-backend.md) para levantar la base y el
  gateway. El botón de abajo del dashboard cambia solo según la bandera:
  "Demo" (mock, local) o "Demo en vivo" (pega al backend real).

## Cambiar la demo

| Qué quieres cambiar | Dónde |
|---|---|
| Piso / ala (subtítulo del Panel) | `FALLGUARD_CONFIG.floor` |
| Enfermeros del turno | `FALLGUARD_CONFIG.nurses` (el primero queda seleccionado) |
| Pacientes, habitaciones, edad, riesgo | `PATIENTS` |
| Alertas activas al abrir | `INITIAL_ALERTS` |
| Historial del turno (métrica del pitch) | `INITIAL_HISTORY` |
| Peso + mini-gráfica al lado del estado de la tarjeta | `showWeight: true` |
| Barra de botones de simulación | `showDemoFooter` |

Los tiempos de los mocks son **relativos** (`secondsAgo`, `minutesAgo`), así que
la demo siempre se ve recién ocurrida sin tocar nada.

### Ejemplo: una caída que escaló desde salida de cama

```ts
export const INITIAL_ALERTS = [
  // se levantó hace 86 s y se cayó hace 74 s → la tarjeta muestra los dos chips
  { pid: "306A", type: "fall", secondsAgo: 74, exitSecondsAgo: 86 },
];
```

## Cómo está conectado a datos reales

Los tres puntos marcados con `CAMBIO A DATOS REALES` en
[`src/app/_lib/useFallGuard.ts`](../src/app/_lib/useFallGuard.ts) ya están
resueltos:

1. **Pacientes** — `api.patients.list.useQuery()`, mapeado de la fila de
   Prisma al `Patient` de dominio.
2. **Atender** — `api.alerts.acknowledge.mutate({ id, by: nurse })`; el
   server reemite `alert-acknowledged` por SSE para que todas las pantallas
   se limpien juntas.
3. **Eventos en vivo** — con `useLiveFeed: true`, el hook se suscribe a
   `/api/alerts/stream` (`alert` y `alert-acknowledged`). Los IDs de paciente
   son el `externalId` de Prisma, que es el mismo string plano
   (`"301A"`) que usa el dominio del frontend — no hace falta mapear nada
   más.

La forma de los datos ya es la definitiva: los componentes consumen los tipos de
[`src/domain/types.ts`](../src/domain/types.ts) y no les importa de dónde salen.
Volver a `useLiveFeed: false` sigue dando una demo 100% mock funcional —
`PATIENTS`/`INITIAL_ALERTS`/`INITIAL_HISTORY` no se tocaron.

## Estructura

```
src/domain/types.ts          tipos compartidos (mock y real)
src/mock/data.ts             ← los datos
src/styles/industry.css      sistema de diseño (tokens teal, .btn .seg .table .dialog)
src/styles/fallguard.css     severidades, riel, columna de alertas y pantallas
src/app/_lib/useFallGuard.ts estado: alertas, historial, escalada, atender
src/app/_lib/format.ts       formato de horas, contadores y tiempos de respuesta
src/app/_components/         riel de navegación, columna de alertas, tarjetas, historial, diálogo, demo
src/app/page.tsx             arma el layout de 3 columnas y las pestañas
```

## Detalles que no se ven pero importan

- **La lista de pacientes nunca se reordena.** Va fija por número de habitación
  para que en la pantalla de pared cada paciente esté siempre en el mismo punto.
- **Las alertas sí se ordenan:** caídas primero, y dentro de cada grupo la más
  vieja arriba.
- **Escalada 2 → 3:** cuando un paciente fuera de cama se cae, no aparece una
  alerta nueva — la misma tarjeta pasa de ámbar a roja y conserva la hora de
  salida, así el tiempo de respuesta se mide desde el primer aviso.
- **El pulso de la caída se apaga** con `prefers-reduced-motion`.
- El estado inicial se arma en el cliente (los timestamps son relativos a
  `Date.now()`); por eso hay un "Conectando con las camillas…" de un frame.
