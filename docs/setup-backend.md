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
  confirmación de orientación) y la manda por Serial como `FALL,<patientId>`.
- **gateway/** — script Node/TypeScript que lee el puerto serial y hace POST a
  `/api/alerts` cada vez que llega una línea `FALL,...`.
- **src/app** — la app Next.js: dashboard (App Router), ruta `/api/alerts` (recibe
  del gateway) y `/api/alerts/stream` (SSE hacia el navegador). `alerts.ts` es el
  router de tRPC que usa el frontend para leer/reconocer alertas.
- **prisma/schema.prisma** — modelos `Patient`, `Room`, `FallAlert`.

## Puesta en marcha rápida

```bash
# 1. instalar deps de la app
npm install

# 2. crear la base de datos (SQLite, cero setup)
npx prisma db push
npx prisma db seed   # si agregas un seed.ts con pacientes de prueba

# 3. correr la app
npm run dev          # http://localhost:3000

# 4. en otra terminal: el gateway
cd gateway
npm install
npm run start        # ajusta el puerto serial en serial-gateway.ts (SERIAL_PORT)
```

Sube `arduino/fall_detection/fall_detection.ino` al Mega con el IDE de Arduino
(instala la librería solo si quieres — el sketch lee el MPU6050 con `Wire` puro,
sin dependencias externas).

## Notas de la demo

- Si no tienes 2-3 sensores físicos, simula pacientes extra llamando
  `POST /api/alerts` a mano (curl/Postman) con distintos `patientId`.
- El buzzer/LED local en el Arduino sigue sonando aunque el WiFi/USB falle —
  es tu "fail-safe" para mencionar a los jueces.
- El feed en tiempo real usa Server-Sent Events (no WebSockets) — más simple
  de mantener vivo dentro de Next.js sin infraestructura extra.
