# Handoff de diseño — FallGuard

Sep 25, 2026 · @Sam

## Resumen del proyecto

FallGuard es un sistema de alerta temprana para hospitales, desarrollado para un hackathon. Detecta dos eventos del paciente en tiempo real usando un Arduino Mega con sensores en la camilla: **caídas** (vía acelerómetro/giroscopio MPU6050) y **salidas de cama sin asistencia** (vía sensores de ocupación). Cuando ocurre uno de estos eventos, el personal de enfermería recibe una alerta instantánea en un dashboard compartido.

El objetivo del diseño es una interfaz que un enfermero pueda leer de un vistazo, desde una pantalla compartida en la estación de enfermería, y que comunique con claridad la diferencia entre "todo tranquilo", "atención moderada" (salida de cama) y "emergencia" (caída confirmada) — sin generar fatiga de alarmas ni ansiedad innecesaria.

## Usuarios y contexto de uso

- **Usuario principal:** enfermeros en la estación de enfermería, monitoreando varios pacientes a la vez.
- **Dispositivo:** una pantalla compartida (monitor de pared o tablet en el escritorio de la estación), vista desde cierta distancia, no siempre con atención completa puesta en ella.
- **Modo de atención:** el enfermero está haciendo otras tareas la mayor parte del tiempo — la interfaz debe captar su atención solo cuando de verdad importa, y debe poder leerse en 1-2 segundos de un vistazo lateral.
- **Momento de mayor estrés:** cuando hay una caída confirmada, el enfermero necesita saber en el instante: quién, dónde (habitación/cama) y qué tan urgente, sin tener que interpretar ni hacer clic para entender.

## Arquitectura y flujo de datos (contexto técnico)

```
Arduino Mega (MPU6050 + botones de ocupación)
    --USB serial-->  gateway Node.js
    --HTTP POST-->    app Next.js (T3: tRPC + Prisma)
                            |
                       base de datos (SQLite)
                            |
                      SSE (tiempo real)  -->  Dashboard de enfermería
```

- El Arduino corre una máquina de estados que detecta caída (free-fall → impacto → confirmación de quietud) y lee botones bajo el colchón para saber si la camilla está ocupada.
- Cuando confirma un evento, manda una línea por Serial (`FALL,<id>` o `BEDEXIT,<id>`) que un gateway Node.js reenvía como POST a la app.
- La app guarda el evento y lo transmite en tiempo real (vía Server-Sent Events) a cualquier dashboard abierto — sin necesidad de refrescar la página.

Para el diseño, lo relevante de esto es: los eventos llegan **push**, no por acción del usuario, y pueden llegar en cualquier momento — la interfaz vive en un estado "en espera" la mayor parte del tiempo y debe transicionar con claridad cuando algo llega.

## Eventos y estados a diseñar

Tres niveles de severidad, claramente distintos entre sí (no solo por color — también por forma/tamaño, para accesibilidad):

1. **Normal / en observación** — el paciente está en la camilla, sin eventos activos. Estado de fondo, discreto, no debe competir por atención.
2. **Salida de cama (atención moderada)** — el paciente se levantó sin asistencia. Urgencia media: quiere ser notado, pero no es una emergencia. Útil sobre todo para pacientes de alto riesgo de caída.
3. **Caída confirmada (emergencia)** — urgencia máxima. Debe ser imposible de ignorar o confundir con los otros dos estados, incluso de reojo o a la distancia.

Un evento puede pasar de nivel 2 a nivel 3 en segundos (se levantó → se cayó) — el diseño debe poder mostrar esa transición con claridad, no solo estados aislados.

Cada alerta activa necesita un camino claro para "atender/reconocer", que la mueva de la vista activa a un historial.

## Pantallas y vistas requeridas

- **Dashboard principal** — la vista de pantalla compartida. Banda/zona de alertas activas siempre visible arriba, lista de pacientes monitoreados (con su estado de camilla: ocupada/vacía), historial de eventos ya atendidos.
- **Lista de pacientes** — nombre, habitación, estado actual (normal / fuera de cama / en alerta), pensada para escanear varias filas rápido.
- **Historial de alertas** — eventos pasados con timestamp, quién los atendió y cuánto tardó — útil también como métrica para el pitch del hackathon ("tiempo promedio de respuesta").
- **Vista de detalle de un evento** (opcional si el tiempo alcanza) — al hacer clic en una alerta activa: paciente, habitación, tipo de evento, hora exacta, botón de atender.

No se requiere login/autenticación para el MVP del hackathon — el foco es la claridad de la alerta, no el control de acceso.

## Dirección visual y restricciones

- **Tono:** clínico y calmado por defecto, inequívocamente urgente cuando hay una caída — sin depender solo del color rojo (agregar forma, borde, movimiento sutil, tamaño) para que sea accesible también para daltonismo.
- **Evitar:** el kit genérico de tarjetas SaaS (bordes redondeados idénticos, misma sombra gris en todo), fondo crema/paleta cálida tipo "IA genérica", etiquetas en mayúsculas tipo eyebrow, iconografía decorativa sin función.
- **Priorizar:** legibilidad a distancia (tipografía grande y clara para nombres/habitaciones), jerarquía visual fuerte entre "activo" e "historial", contraste alto en el estado de emergencia.
- Un prototipo ya existente (código T3) usa una paleta clínica con acento teal para calma y rojo para alerta — el diseño puede tomar esto como punto de partida o proponer una dirección propia si tiene una idea mejor.

## Roadmap futuro

Hoy el sensor de ocupación de camilla es un simple botón (ocupado/vacío, binario). El plan a futuro es reemplazarlo por **sensores de peso o presión (FSR / celdas de carga)**, que miden algo continuo en vez de un estado binario.

Esto no cambia el diseño de hoy, pero conviene dejarle espacio: en el futuro el estado de "ocupado/vacío" podría convertirse en una lectura de peso, o en indicadores más finos (ej. "movimiento inquieto en la cama", tendencias de peso en el tiempo). El diseño de la fila de "estado de camilla" en la lista de pacientes debería poder extenderse a mostrar un valor numérico o una mini-gráfica más adelante, sin rediseñar toda la pantalla.

## Entregables esperados del diseño

1. Sistema de color y tipografía para los 3 niveles de severidad (normal / salida de cama / caída).
2. Layout del dashboard principal (pantalla compartida) con la banda de alertas activas, lista de pacientes e historial.
3. Estado de una fila de paciente en sus 3 variantes (normal, fuera de cama, en alerta).
4. Vista del historial de alertas atendidas.
5. (Si hay tiempo) Vista de detalle de un evento individual.
