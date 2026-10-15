# Component Map — Protoactiv

**Repo:** `hackaton-iot` · **Course:** Desarrollo Web Integral · Unit 3 · Software Component Integration

Protoactiv is a hospital fall-alert system: an MPU6050 + Arduino Mega worn/placed at the patient's bed detects falls and bed exits, and a nurse-facing web dashboard raises the alert in real time.

## 1. User stories

1. **As a nurse on shift**, I want an immediate on-screen alert with the patient's name and room when a fall is detected, so I can get there before the injury gets worse.
2. **As a head nurse**, I want to see which beds are occupied and the history of fall events per patient, so I can assign closer supervision to high-risk patients.

## 2. Stack (the five LabBook boxes)

```
┌──────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐   ┌─────────────────┐
│   DESIGN     │──▶│        FRONTEND          │◀─▶│         BACKEND          │◀─▶│    DATABASE     │
│ Figma        │   │ Next.js (React) + TS     │   │ tRPC API routes (Next.js)│   │ Prisma ORM      │
│ wireframes,  │   │ Tailwind CSS             │   │ + ★ Sensor Event         │   │ PostgreSQL      │
│ Tailwind     │   │ Nurse dashboard, alerts, │   │   microservice           │   │ patients, beds, │
│ tokens       │   │ bed-occupancy view       │   │   (Evidence 3)           │   │ fall_events     │
└──────────────┘   └──────────────────────────┘   └────────────▲─────────────┘   └─────────────────┘
                                                               │ HTTP/serial
                                                  ┌────────────┴─────────────┐
                                                  │ HARDWARE: Arduino Mega + │
                                                  │ MPU6050 + bed buttons    │
                                                  └──────────────────────────┘
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ REPOSITORY: GitHub `hackaton-iot` — /app (T3 web), /firmware (Arduino), /docs                │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3. Module fed by our own microservice (Evidence 3)

★ **Alerts & Bed Occupancy module.** A small **Sensor Event microservice** receives readings from the Arduino (fall flag from MPU6050 acceleration/gyro thresholds, occupancy from the bed buttons), validates them, stores a `fall_event` / occupancy change through Prisma, and pushes it to the nurse dashboard. The dashboard's live alert panel and bed map consume only this service.

## 4. Third-party web service

**Twilio (SMS / WhatsApp API)** — sends the fall alert to the on-call nurse's phone as a backup channel. Why: a nurse away from the station still gets notified, and Twilio handles delivery and retries so we don't build a messaging gateway ourselves.

## 5. Risks and mitigations

| Component | Risk | Strategy to avoid it |
|---|---|---|
| Design | Alert UI is hard to read under pressure (small text, poor contrast) | High-contrast alert states, large type, sound + color; quick usability test with 2–3 people |
| Frontend | Dashboard misses an alert if the tab is idle or connection drops | Real-time subscription with reconnect + polling fallback; unacknowledged alerts persist until a nurse confirms |
| Backend / microservice | False positives from the MPU6050 (patient sits down fast) flood nurses | Tune thresholds with recorded test data; require impact + post-impact stillness window before firing |
| Database | Lost or duplicated fall events | Transactions for writes, idempotency key per sensor event, Prisma migrations versioned in the repo |
| Repository | Merge conflicts / broken `main` with several people pushing firmware + web code | Feature branches + PRs, at least one review, separate `/firmware` and `/app` folders |