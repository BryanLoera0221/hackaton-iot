# FallGuard — Fall detection dashboard (T3 stack)

Sistema de alerta de caídas para hospital: sensores → app Next.js (T3:
TypeScript + tRPC + Prisma + Tailwind) → dashboard en tiempo real para
enfermeros. Hay tres caminos de hardware que llegan al mismo backend:

```
Arduino Mega + MPU6050 (USB serial)  --gateway/-->  \
Mega+WiFi R3 (ESP8266, WiFi directo) --HTTP POST-->   api Next.js -- Prisma (SQLite) -- SSE --> Dashboard
Raspberry Pi (sensor de peso, WiFi)  --HTTP POST-->  /
```

- **arduino/fall_detection/** — sketch original que detecta la caída
  (free-fall + impacto + confirmación de orientación) y la manda por Serial
  como `FALL,<patientId>`. Camino de respaldo por USB, sin WiFi.
- **gateway/** — script Node/TypeScript que lee ese puerto serial y hace
  POST a `/api/alerts` cada vez que llega una línea `FALL,...` o
  `BEDEXIT,...`.
- **arduino/anticaidas-arduino/** — firmware real del sensor de caída:
  RobotDyn MEGA+WiFi R3 (ATmega2560 + ESP8266) + GY-521 (MPU6050), con WiFi
  directo. Le pega a `POST /api/iot/fall` con un contrato fijo por ese
  firmware — ver la sección de abajo. Es su propio repo Git anidado; no se
  toca su código desde acá, solo se le da su `Secrets.h` local (SSID +
  contraseña + IP del backend) para que sepa a quién pegarle.
- **src/app/api/iot/** — capa de traducción para hardware real: `fall/`
  recibe el contrato del Mega+WiFi R3, `bed/` recibe el contrato del script
  de la Raspberry Pi (sensor de peso), `status/` es un heartbeat opcional.
  Todas resuelven un `deviceId` físico a un paciente vía el modelo `Device`
  y delegan en la misma lógica de `src/server/alerts-service.ts` — no hay
  reglas de negocio duplicadas entre esta capa y `/api/alerts`.
- **src/app/api/alerts/** — el contrato "de la app": lo usa el gateway
  serial, el botón de demo en vivo (`alerts.simulate` por tRPC) y cualquier
  otro caller que ya conozca el `patientExternalId` de cama (`"301A"`, no un
  `deviceId` de hardware). `/api/alerts/stream` es el SSE hacia el
  navegador, eventos `alert` y `alert-acknowledged`.
- **src/server/alerts-service.ts** — única lógica de crear/escalar una
  alerta (salida de cama → caída en la misma fila) y de auto-resolver una
  salida de cama cuando el paciente vuelve (`reportBedStatus`). La usan
  `/api/alerts`, `/api/iot/*` y la mutación tRPC `alerts.simulate` por
  igual.
- **prisma/schema.prisma** — modelos `Patient` (con `bed`, `age`, `risk`,
  `weightKg?`, `photoUrl?`), `Room`, `Alert` (con `type: "fall" | "exit"` y
  `exitAt`), y `Device` (`id` = deviceId del hardware, `kind: "fall" |
  "bed"`, `patientId`) — traduce un sensor físico a un paciente.

## Puesta en marcha rápida

```bash
# 1. instalar deps de la app
npm install

# 2. crear la base de datos (SQLite, cero setup)
npx prisma db push
npx prisma db seed   # crea las 12 camas + el Device "FALL-001" de prueba

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

## Exponer el backend en la red local (para el Mega+WiFi R3)

El ESP8266 se conecta como **cliente WiFi** (`WIFI_STA`) a la misma red que
esta computadora, y le pega por HTTP plano a `BACKEND_BASE_URL` — no hay
túnel ni dominio público, solo tienen que estar en la misma red local.

1. **`next dev` / `next start` ya escuchan en todas las interfaces** (`0.0.0.0`),
   no solo `localhost` — no hace falta ninguna bandera extra. Verificado:
   con el server corriendo, `curl http://<IP-de-esta-máquina>:3000` responde
   igual que `localhost:3000`.
2. **Encuentra la IP de esta máquina en la red WiFi:**
   ```bash
   ip -4 addr show | grep inet   # o: hostname -I
   ```
   Es una IP asignada por DHCP — **puede cambiar** si esta máquina se
   reconecta a la red; si el ESP deja de conectar, repite este paso.
3. **Firewall:** en Fedora con `firewalld`, confirma que el puerto no esté
   bloqueado:
   ```bash
   sudo firewall-cmd --list-ports          # busca 3000/tcp o un rango que lo cubra
   sudo firewall-cmd --add-port=3000/tcp --permanent && sudo firewall-cmd --reload
   ```
4. **Configura el ESP:** copia
   `arduino/anticaidas-arduino/firmware/esp8266_iot/Secrets.h.example` a
   `Secrets.h` (gitignored) en esa misma carpeta y pon el SSID/contraseña de
   la red WiFi compartida y `BACKEND_BASE_URL` con la IP del paso 2, ej.
   `"http://10.100.0.143:3000"`.
5. **Ojo con redes institucionales/universitarias:** muchas tienen
   *client isolation* (AP isolation) activado, que bloquea que dos
   dispositivos conectados a la misma red WiFi se vean entre sí aunque
   ambos tengan internet — esto haría que el ESP nunca llegue a esta
   computadora aunque todo lo de arriba esté bien. Si el POST del ESP nunca
   llega (nada en los logs de `npm run dev`), prueba con un hotspot móvil
   (el celular de alguien) como red compartida en su lugar — casi ningún
   hotspot personal aísla clientes entre sí.

## Hardware real por WiFi (`/api/iot/*`)

Estos endpoints traducen un `deviceId` de hardware (no un `patientExternalId`
de cama) a un paciente, vía la tabla `Device`. Registrar un dispositivo nuevo
es una fila en esa tabla (ver `prisma/seed.ts` para `"FALL-001"` y
`"BED-001"`, ambos mapeados a la cama de prueba `301A`).

- **`POST /api/iot/fall`** — contrato fijo por el firmware "Anticaídas"
  (Mega+WiFi R3). Sin autenticación ni TLS en esta etapa; `2xx` es lo que
  el ESP8266 espera para sacar el evento de su cola interna, si no
  reintenta cada 5s.
  ```bash
  curl -X POST localhost:3000/api/iot/fall -H 'Content-Type: application/json' \
    -d '{"deviceId":"FALL-001","event":"POSSIBLE_FALL","accelerationMagnitude":2.7,"gyroMagnitude":150.4,"orientationChange":0}'
  ```
  Las magnitudes se reciben y se descartan — no hay necesidad hoy de
  guardarlas. `deviceId` desconocido → `404` (visible en logs si un
  dispositivo no está registrado).
- **`POST /api/iot/bed`** — contrato fijo por el script real de la
  Raspberry Pi (sensor de peso HX711). Sin autenticación. Manda al
  arrancar, en cada cambio de valor y cada 30s como latido — por eso
  `occupied` repetido es idempotente (no crea alertas duplicadas ni pisa
  una ya activa).
  ```bash
  curl -X POST localhost:3000/api/iot/bed -H 'Content-Type: application/json' \
    -d '{"deviceId":"BED-001","occupied":0}'
  ```
  `occupied` es `0` o `1` (número, no booleano) — así lo manda el script de
  la Pi. `occupied: 0` (se levantó) crea una alerta de salida de cama (igual
  que `/api/alerts` con `type:"exit"`). `occupied: 1` (volvió) **auto-resuelve**
  esa alerta si sigue sin escalar a caída (acreditada a "Sistema (regresó a
  la cama)") — pero nunca toca una alerta ya escalada a `"fall"`, esa
  siempre necesita que un enfermero la atienda. `deviceId` desconocido →
  `404` (la Pi lo reporta como fallo de envío y reintenta cada 5s).
- **`POST /api/iot/status`** — heartbeat opcional para avisar "sigo vivo"
  sin tener un evento real que reportar. No hace falta que el firmware lo
  llame para que esto funcione: `/api/iot/fall` y `/api/iot/bed` ya
  marcan "en línea" al dispositivo que les pega, así que un MEGA o una Pi
  que solo mandan sus eventos reales ya cuentan como vistos.
  ```bash
  curl -X POST localhost:3000/api/iot/status -H 'Content-Type: application/json' \
    -d '{"deviceId":"FALL-001"}'
  ```
  `GET /api/iot/status` devuelve el estado de todos los dispositivos
  conocidos (`{id, kind, online, lastSeenAt}`), útil para revisar sin
  esperar al log. El seguimiento vive en `src/server/device-status.ts`
  (en memoria, no persiste en la base): si un dispositivo lleva más de 30s
  sin reportar nada, la consola del server (`npm run dev`) imprime un aviso
  de que parece offline; en cuanto vuelve a reportar, imprime que está en
  línea de nuevo. Son solo mensajes de consola — el dashboard no muestra
  este estado todavía.

## Aviso SMS opcional con Twilio

Para una caída nueva o una salida de cama que escala a caída, las rutas REST
`/api/iot/fall` y `/api/alerts` pueden solicitar un SMS mediante la
[API oficial de Twilio](https://www.twilio.com/docs/messaging/api/message-resource).
La mutación de simulación del dashboard no envía SMS. Un evento repetido
para la misma alerta activa tampoco genera otro envío.

La función está **apagada por defecto**. Configura en `.env`
`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `FALL_SMS_RECIPIENT` (número
autorizado en formato E.164, por ejemplo `+52...`) y una opción de remitente:
`TWILIO_FROM` (número de Twilio en formato E.164) o
`TWILIO_MESSAGING_SERVICE_SID` (servicio con un remitente configurado).
Después establece `FALL_SMS_ENABLED=true` y reinicia el servidor. Nunca
coloques estas credenciales en el firmware ni en variables `NEXT_PUBLIC_*`.

Esta integración llama directamente a `api.twilio.com`. Los listados de
Twilio encontrados en RapidAPI son de terceros y uno solicita el Auth Token
de Twilio en el cuerpo; no se deben entregar credenciales a ese intermediario.
La [cuenta de prueba de Twilio](https://www.twilio.com/docs/usage/trials)
tiene restricciones de destinatarios y contenido; el texto libre de esta
integración requiere una cuenta habilitada para ello. Revisa en Twilio que
tu remitente pueda enviar SMS a México y los costos antes de activar el
aviso. No se enviaron mensajes reales durante esta implementación.

El texto enviado es genérico: “FallGuard: posible caida. Revise el panel de
enfermeria.” No incluye nombre, identificador, habitación ni lecturas del
sensor. El teléfono configurado sí se transmite al proveedor. La respuesta
`queued` o `accepted` significa que Twilio aceptó la solicitud, **no** que el SMS llegó al
destinatario. Los fallos del proveedor se registran sin credenciales ni número
y no bloquean la persistencia, SSE o respuesta al dispositivo. El envío vive
en memoria del proceso; un cierre del servidor durante la petición puede
perder ese aviso. La alerta del panel sigue siendo el canal principal.

Las rutas IoT de esta etapa no tienen autenticación ni TLS: activa SMS solo
en una red controlada. No expongas esos endpoints a Internet sin agregar
autenticación, control de abuso y transporte seguro.

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
