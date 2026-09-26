/*
  FallGuard — detección de caída con MPU6050 + Arduino Mega
  ----------------------------------------------------------
  Lee el MPU6050 directo por I2C (registros crudos, sin librería externa que
  instalar — en un hackathon no siempre hay tiempo/internet para eso).

  Algoritmo (3 fases, sin machine learning):
    1) FREE-FALL   -> la magnitud de aceleración cae cerca de 0g (el cuerpo
                       "flota" un instante al caer).
    2) IMPACTO     -> justo después, la magnitud se dispara muy por encima
                       de 1g (el golpe contra el piso).
    3) CONFIRMACIÓN -> tras el impacto, el paciente se queda relativamente
                       quieto (no fue solo agacharse rápido o tropezar y
                       seguir caminando).

  Si las 3 fases ocurren en la ventana de tiempo esperada -> caída confirmada:
  se manda "FALL,<PATIENT_ID>\n" por Serial (lo lee gateway/serial-gateway.ts)
  y se dispara el buzzer/LED local como respaldo si la red/USB fallara.

  Conexiones MPU6050 -> Arduino Mega:
    VCC -> 5V (o 3.3V según tu módulo)
    GND -> GND
    SCL -> pin 21 (SCL en el Mega)
    SDA -> pin 20 (SDA en el Mega)
*/

#include <Wire.h>

// ---- Configuración por paciente/dispositivo ----
const char *PATIENT_ID = "101"; // cambia esto por cada Arduino/paciente

// ---- Pines ----
const int BUZZER_PIN = 8;
const int LED_PIN = 13;

// ---- Registros del MPU6050 ----
const uint8_t MPU_ADDR = 0x68;
const uint8_t REG_PWR_MGMT_1 = 0x6B;
const uint8_t REG_ACCEL_XOUT_H = 0x3B;

// ---- Umbrales (ajusta según pruebas reales) ----
const float FREEFALL_G = 0.4;   // por debajo de esto = posible caída libre
const float IMPACT_G = 2.2;     // por encima de esto = impacto
const float STILL_G_LOW = 0.85; // rango "quieto" tras el impacto
const float STILL_G_HIGH = 1.15;

const unsigned long FALL_WINDOW_MS = 1000;   // tiempo máx. entre free-fall e impacto
const unsigned long CONFIRM_WINDOW_MS = 1500; // tiempo observando quietud post-impacto
const unsigned long ALARM_DURATION_MS = 5000;

enum State { IDLE, FALLING, CONFIRMING };
State state = IDLE;
unsigned long stateEnteredAt = 0;

void mpuWrite(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}

// Devuelve la magnitud del vector de aceleración en g's.
float readAccelMagnitudeG() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_ACCEL_XOUT_H);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, (uint8_t)6);

  int16_t rawX = (Wire.read() << 8) | Wire.read();
  int16_t rawY = (Wire.read() << 8) | Wire.read();
  int16_t rawZ = (Wire.read() << 8) | Wire.read();

  // Sensibilidad por defecto (rango ±2g): 16384 LSB/g
  float ax = rawX / 16384.0;
  float ay = rawY / 16384.0;
  float az = rawZ / 16384.0;

  return sqrt(ax * ax + ay * ay + az * az);
}

void triggerLocalAlarm() {
  unsigned long start = millis();
  while (millis() - start < ALARM_DURATION_MS) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 2000);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    noTone(BUZZER_PIN);
    delay(200);
  }
}

void reportFallConfirmed() {
  Serial.print("FALL,");
  Serial.println(PATIENT_ID);
  triggerLocalAlarm(); // respaldo local si el gateway/red falla
}

void setup() {
  Serial.begin(9600);
  Wire.begin();
  mpuWrite(REG_PWR_MGMT_1, 0); // despierta el MPU6050 (sale de modo sleep)

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  Serial.println("FallGuard listo. Monitoreando...");
}

void loop() {
  float g = readAccelMagnitudeG();
  unsigned long now = millis();

  switch (state) {
    case IDLE:
      if (g < FREEFALL_G) {
        state = FALLING;
        stateEnteredAt = now;
      }
      break;

    case FALLING:
      if (now - stateEnteredAt > FALL_WINDOW_MS) {
        state = IDLE; // se acabó la ventana, no hubo impacto -> falso positivo
      } else if (g > IMPACT_G) {
        state = CONFIRMING;
        stateEnteredAt = now;
      }
      break;

    case CONFIRMING:
      if (now - stateEnteredAt > CONFIRM_WINDOW_MS) {
        // el paciente se quedó relativamente quieto tras el impacto -> caída real
        reportFallConfirmed();
        state = IDLE;
      } else if (g < STILL_G_LOW || g > STILL_G_HIGH) {
        // se sigue moviendo con fuerza -> probablemente no fue una caída
        // (se tropezó y siguió caminando, por ejemplo)
        state = IDLE;
      }
      break;
  }

  delay(20); // ~50 muestras/seg, suficiente para este patrón
}
