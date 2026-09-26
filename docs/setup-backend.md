# FallGuard — Fall detection dashboard (T3 stack)

Sistema de alerta de caídas para hospital: MPU6050 + Arduino Mega → gateway
Node por USB serial → app Next.js (T3: TypeScript + tRPC + Prisma + Tailwind)
→ dashboard en tiempo real para enfermeros.

## Piezas

```
Arduino Mega (MPU6050)  --USB serial-->  gateway/  --HTTP POST-->  app Next.js
                                                                        |
                                                                  Prisma (SQLite)
                                                                        |
                                                                 SSE  -->  Dashboard
```

- **arduino/fall_detection/** — sketch que detecta la caída (free-fall + impacto +
  confirmación de orientación) y la manda por Serial como `FALL,<patientId>`. No
  hay sensor de salida de cama todavía; `BEDEXIT,<patientId>` ya está soportado
  en el gateway y el backend, listo para cuando exista el hardware.
- **gateway/** — script Node/TypeScript que lee el puerto serial y hace POST a
  `/api/alerts` cada vez que llega una línea `FALL,...` o `BEDEXIT,...`.
- **src/app** — la app Next.js: dashboard (App Router), ruta `/api/alerts` (recibe
  del gateway o del botón de demo en vivo) y `/api/alerts/stream` (SSE hacia el
  navegador, eventos `alert` y `alert-acknowledged`). `alerts.ts` es el router de
  tRPC que usa el frontend para leer/reconocer/simular alertas.
- **src/server/alerts-service.ts** — única lógica de crear/escalar una alerta
  (salida de cama → caída en la misma fila), compartida por la ruta REST y la
  mutación tRPC `alerts.simulate`.
- **prisma/schema.prisma** — modelos `Patient` (con `bed`, `age`, `risk`,
  `weightKg?`, `photoUrl?`), `Room`, `Alert` (con `type: "fall" | "exit"` y
  `exitAt`).

## Puesta en marcha rápida

```bash
# 1. instalar deps de la app
npm install

# 2. crear la base de datos (SQLite, cero setup)
npx prisma db push
npx prisma db seed   # crea las 12 camas de prueba (ver prisma/seed.ts)

# 3. correr la app
npm run dev          # http://localhost:3000

# 4. en otra terminal: el gateway
cd gateway
npm install
npm run start
```

Sube `arduino/fall_detection/fall_detection.ino` al Mega con el IDE de Arduino
(instala la librería solo si quieres — el sketch lee el MPU6050 con `Wire` puro,
sin dependencias externas).

### Variables de entorno del gateway

`gateway/serial-gateway.ts` no usa `.env` — se configuran como variables de
entorno reales antes de `npm run start`:

| Variable | Default | Qué es |
|---|---|---|
| `SERIAL_PORT` | `/dev/ttyACM0` | Puerto donde está el Arduino (`npx tsx list-ports.ts` para listarlos) |
| `BAUD_RATE` | `9600` | Debe coincidir con el `Serial.begin(...)` del sketch |
| `APP_URL` | `http://localhost:3000` | A dónde manda el POST `/api/alerts` |

## Notas de la demo

- `POST /api/alerts` acepta `{ patientExternalId, type }` con
  `type: "fall" | "exit"` (default `"fall"` si se omite). Si el paciente ya
  tenía una alerta de `"exit"` activa y llega `"fall"`, la misma fila escala
  a caída conservando la hora de salida original (`exitAt`) — no se duplica.
  Ejemplos:
  ```bash
  curl -X POST localhost:3000/api/alerts -H 'Content-Type: application/json' \
    -d '{"patientExternalId":"301A","type":"exit"}'
  curl -X POST localhost:3000/api/alerts -H 'Content-Type: application/json' \
    -d '{"patientExternalId":"301A","type":"fall"}'
  ```
- Si no tienes sensores físicos, usa el botón "Demo en vivo" del dashboard
  (visible con `FALLGUARD_CONFIG.useLiveFeed: true`) — pega a
  `alerts.simulate` por tRPC, que corre exactamente la misma lógica que la
  ruta REST de arriba.
- El buzzer/LED local en el Arduino sigue sonando aunque el WiFi/USB falle —
  es tu "fail-safe" para mencionar a los jueces.
- El feed en tiempo real usa Server-Sent Events (no WebSockets) — más simple
  de mantener vivo dentro de Next.js sin infraestructura extra. Dos eventos:
  `alert` (creada o escalada) y `alert-acknowledged` (atendida en cualquier
  pestaña, para que todas se limpien juntas).
