# Frontend FallGuard — cómo cambiar los datos

El dashboard funciona hoy con datos mock. **Todo lo que se ve sale de un solo
archivo: [`src/mock/data.ts`](../src/mock/data.ts).** Ningún componente tiene
datos quemados.

## Cambiar la demo

| Qué quieres cambiar | Dónde |
|---|---|
| Nombre de la estación / piso | `FALLGUARD_CONFIG.station` |
| Enfermeros del turno | `FALLGUARD_CONFIG.nurses` (el primero queda seleccionado) |
| Pacientes, habitaciones, edad, riesgo | `PATIENTS` |
| Alertas activas al abrir | `INITIAL_ALERTS` |
| Historial del turno (métrica del pitch) | `INITIAL_HISTORY` |
| Segunda línea de la celda "Camilla" con peso + mini-gráfica | `showWeight: true` |
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

## Pasar a datos reales

Hay tres puntos marcados con `CAMBIO A DATOS REALES` en
[`src/app/_lib/useFallGuard.ts`](../src/app/_lib/useFallGuard.ts):

1. **Pacientes** — reemplazar `PATIENTS` por `api.patients.list.useQuery()`.
2. **Atender** — llamar `api.alerts.acknowledge.mutate({ id, by: nurse })` y que
   el server reemita por SSE, para que todas las pantallas se limpien juntas.
3. **Eventos en vivo** — poner `useLiveFeed: true`; el hook se suscribe a
   `/api/alerts/stream`. Requiere que los IDs de paciente que manda el gateway
   coincidan con los del frontend (por eso conviene hacer 1 primero).

La forma de los datos ya es la definitiva: los componentes consumen los tipos de
[`src/domain/types.ts`](../src/domain/types.ts) y no les importa de dónde salen.

## Estructura

```
src/domain/types.ts          tipos compartidos (mock y real)
src/mock/data.ts             ← los datos
src/styles/industry.css      sistema de diseño (tokens, .btn .seg .table .dialog .blueprint)
src/styles/fallguard.css     severidades y pantallas
src/app/_lib/useFallGuard.ts estado: alertas, historial, escalada, atender
src/app/_lib/format.ts       formato de horas, contadores y tiempos de respuesta
src/app/_components/         header, banda de alertas, lista, historial, diálogo, demo
src/app/page.tsx             arma las tres pestañas
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
