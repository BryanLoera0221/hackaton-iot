# Protoactiv

**Real-time fall alerts for hospital patients.** A sensor at the bed notices when a patient falls or gets up, and the nurses' dashboard shows the alert within seconds, telling them who it is and which room to go to.

🏆 **1st place, hackathon**

---

## The problem

Falls are among the most common adverse events in hospitals. One nurse may be watching many rooms, and a patient who gets up alone at 3 a.m. can lie on the floor for a long time before anyone finds them. Protoactiv shortens that gap.

## How it works

```
 Patient bed                         Server                          Nurse station
┌─────────────────────┐   events   ┌───────────────────────┐   live   ┌──────────────────────┐
│ Arduino Mega        │──────────▶ │ Sensor event service  │────────▶ │ Next.js dashboard    │
│ + MPU6050 (falls)   │            │ (tRPC API)            │          │ alerts · bed map ·   │
│ + bed buttons       │            │        │              │          │ fall history         │
│   (occupancy)       │            │        ▼              │          └──────────────────────┘
└─────────────────────┘            │ Prisma → Database     │
                                   └───────────────────────┘
```

1. The **MPU6050** (an accelerometer combined with a gyroscope) streams motion data to the **Arduino Mega**.
2. The firmware looks for the signature of a fall: a sharp impact followed by a stretch with no movement.
3. **Bed buttons** report whether the patient is in bed. Weight or pressure sensors will replace them later.
4. The Arduino sends each event to the **backend**, which validates it and stores it with **Prisma**.
5. The **nurse dashboard** shows a high-visibility alert, and it stays on screen until a nurse acknowledges it.

## Features

- 🚨 Live fall alerts with patient name, bed, and room
- 🛏️ Bed-occupancy map so staff can see at a glance who's in bed and who isn't
- 📋 Fall history for each patient, to spot the high-risk ones
- ✅ Alert acknowledgment, so the team can see who responded

## Tech stack

| Layer | Tech |
|---|---|
| Hardware | Arduino Mega, MPU6050, push buttons |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | tRPC (T3 stack) |
| Database | Prisma ORM |
| Repo | GitHub |

## Project structure

```
hackaton-iot/
├── app/          # T3 web app (Next.js + tRPC + Prisma)
├── firmware/     # Arduino sketch for the MPU6050 + bed sensors
└── docs/         # Component map and project docs
```

## Getting started

### Web app

```bash
cd app
npm install
cp .env.example .env        # set DATABASE_URL
npx prisma db push          # create the schema
npm run dev                 # http://localhost:3000
```

### Firmware

1. Open `firmware/` in the Arduino IDE.
2. Install the MPU6050 library (Library Manager, search for "MPU6050").
3. Select **Arduino Mega 2560** and the correct port, then upload.
4. Wire the MPU6050 as follows: `VCC → 5V`, `GND → GND`, `SDA → 20`, `SCL → 21`.

## Roadmap

- [ ] Replace the bed buttons with weight/pressure sensors
- [ ] SMS/WhatsApp backup alerts to the on-call nurse
- [ ] Wireless sensor nodes (ESP32), so there's no cable to the bed
- [ ] Tune fall thresholds against real recorded data to cut false positives

## Team

- **Bryan Loera**
- **Samuel Moo Limón**

---

*Built at a hackathon by students at UTCH.*