import { SerialPort } from "serialport";

const ports = await SerialPort.list();
if (ports.length === 0) {
  console.log("No se detectó ningún puerto serial. ¿Está conectado el Arduino?");
} else {
  console.log("Puertos disponibles:");
  for (const p of ports) {
    console.log(`  ${p.path}  (${p.manufacturer ?? "fabricante desconocido"})`);
  }
}
