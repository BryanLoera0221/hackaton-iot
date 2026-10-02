"use client";

/**
 * Sirena de emergencia sintetizada con Web Audio API (sin archivo de audio
 * que mantener). Un solo `AudioContext` compartido para toda la sesión.
 */
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/**
 * Los navegadores bloquean el audio hasta el primer gesto del usuario
 * (click/tecla) en la página. Se llama una vez al montar el dashboard.
 */
export function unlockAlarmAudio() {
  const audioCtx = getContext();
  if (audioCtx?.state === "suspended") void audioCtx.resume();
}

/** Beep de emergencia (dos tonos alternados) para una caída confirmada. */
export function playFallAlarm() {
  const audioCtx = getContext();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") void audioCtx.resume();

  const now = audioCtx.currentTime;
  const pulseDur = 0.18;
  const gap = 0.02;
  const freqs = [940, 700, 940, 700, 940, 700];

  freqs.forEach((freq, i) => {
    const t0 = now + i * (pulseDur + gap);
    const t1 = t0 + pulseDur;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.25, t0 + 0.015);
    gain.gain.setValueAtTime(0.25, t1 - 0.015);
    gain.gain.linearRampToValueAtTime(0, t1);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t1);
  });
}
