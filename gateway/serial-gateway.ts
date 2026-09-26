import { SerialPort, ReadlineParser } from "serialport";

// Ajusta esto a tu puerto real:
//   Windows -> "COM5"
//   macOS   -> "/dev/tty.usbmodemXXXX" (corre `ls /dev/tty.*` para ver cuál es)
//   Linux   -> "/dev/ttyACM0" o "/dev/ttyUSB0"
const SERIAL_PORT = process.env.SERIAL_PORT ?? "/dev/ttyACM0";
const BAUD_RATE = Number(process.env.BAUD_RATE ?? 9600);
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

async function reportFall(patientExternalId: string) {
  try {
    const res = await fetch(`${APP_URL}/api/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientExternalId }),
    });
    if (!res.ok) {
      console.error(`[gateway] el server respondió ${res.status}:`, await res.text());
    } else {
      console.log(`[gateway] alerta reportada para paciente ${patientExternalId}`);
    }
  } catch (err) {
    console.error("[gateway] no se pudo contactar la app (¿está corriendo `npm run dev`?):", err);
  }
}

function start() {
  const port = new SerialPort({ path: SERIAL_PORT, baudRate: BAUD_RATE });
  const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

  port.on("open", () => {
    console.log(`[gateway] escuchando ${SERIAL_PORT} @ ${BAUD_RATE} baud`);
  });

  port.on("error", (err) => {
    console.error("[gateway] error de puerto serial:", err.message);
    console.error(
      "[gateway] tip: corre `npx tsx list-ports.ts` (o revisa el Monitor Serial del IDE de Arduino) para confirmar el nombre del puerto.",
    );
  });

  parser.on("data", (line: string) => {
    const clean = line.trim();
    if (!clean) return;
    console.log(`[gateway] <- ${clean}`);

    // Formato esperado desde el Arduino: "FALL,<patientId>"
    const [tag, patientId] = clean.split(",");
    if (tag === "FALL" && patientId) {
      void reportFall(patientId.trim());
    }
  });
}

start();
