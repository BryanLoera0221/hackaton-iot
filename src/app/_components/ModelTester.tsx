"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ImageUp, LoaderCircle } from "lucide-react";

const STROKE = 1.5;

/** Pausa entre cuadros enviados al modelo (cada inferencia consume créditos de Roboflow). */
const FRAME_INTERVAL_MS = 1000;
/** Ancho al que se reduce cada cuadro antes de enviarlo. */
const FRAME_WIDTH = 640;

/** Una detección del modelo; x/y son el centro de la caja, en píxeles de la imagen. */
type Prediction = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  detection_id?: string;
};

type InferenceResult = {
  image: { width: number; height: number };
  predictions: Prediction[];
  time?: number;
};

type Source = "camara" | "imagen";

/**
 * El modelo fall-c3gmv/1 devuelve clases numéricas. En Roboflow tiene tres
 * clases (fall, sit, walk); probando fotos, 1 sale con personas de pie
 * (walk) y 2 con personas sentadas (sit), así que 0 es fall.
 */
const CLASS_LABELS: Record<string, string> = {
  "0": "Caída",
  "1": "De pie",
  "2": "Sentado",
};
const FALL_CLASSES = new Set(["0"]);

function labelOf(name: string) {
  return CLASS_LABELS[name] ?? name;
}

/** Si la clase cuenta como caída (el resto se pinta como neutro). */
function isFallClass(name: string) {
  return FALL_CLASSES.has(name) || /fall|ca[ií]d/i.test(name);
}

async function infer(image: Blob): Promise<InferenceResult> {
  const body = new FormData();
  body.append("image", image);
  const res = await fetch("/api/vision/fall", { method: "POST", body });
  const json = (await res.json()) as InferenceResult & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `error ${res.status}`);
  return json;
}

/** Cajas de detección en porcentajes, para que escalen con la imagen o el video. */
function Boxes({ result }: { result: InferenceResult }) {
  const { width: W, height: H } = result.image;
  return (
    <>
      {result.predictions.map((p, i) => (
        <div
          key={p.detection_id ?? i}
          className={`fg-mt-box ${isFallClass(p.class) ? "fg-mt-box-fall" : ""}`}
          style={{
            left: `${((p.x - p.width / 2) / W) * 100}%`,
            top: `${((p.y - p.height / 2) / H) * 100}%`,
            width: `${(p.width / W) * 100}%`,
            height: `${(p.height / H) * 100}%`,
          }}
        >
          <span className="fg-mt-box-label">
            {labelOf(p.class)} · {Math.round(p.confidence * 100)} %
          </span>
        </div>
      ))}
    </>
  );
}

/**
 * Prueba del modelo de Roboflow vía /api/vision/fall, con la cámara del
 * equipo o con una imagen subida. Es independiente del flujo de alertas.
 */
export function ModelTester() {
  const [source, setSource] = useState<Source>("camara");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streaming, setStreaming] = useState(false);

  // Liberar la URL del objeto cuando cambia la imagen o se desmonta.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
    setLoading(false);
  };

  // Apagar la cámara al salir de la pestaña.
  useEffect(() => stopCamera, []);

  const startCamera = async () => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "permiso de cámara denegado"
          : "no se encontró una cámara disponible",
      );
    }
  };

  // Bucle de inferencia: un cuadro a la vez, sin solapar solicitudes.
  useEffect(() => {
    if (!streaming) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const canvas = document.createElement("canvas");

    const tick = async () => {
      const video = videoRef.current;
      if (cancelled || !video || video.videoWidth === 0) {
        timer = setTimeout(() => void tick(), FRAME_INTERVAL_MS);
        return;
      }

      const scale = Math.min(1, FRAME_WIDTH / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

      const frame = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.8));

      if (frame && !cancelled) {
        setLoading(true);
        try {
          const json = await infer(frame);
          if (!cancelled) {
            setResult(json);
            setError(null);
          }
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : "error desconocido");
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      if (!cancelled) timer = setTimeout(() => void tick(), FRAME_INTERVAL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [streaming]);

  const switchSource = (next: Source) => {
    if (next === source) return;
    stopCamera();
    setResult(null);
    setError(null);
    setSource(next);
  };

  const analyzeFile = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      setResult(await infer(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const predictions = result?.predictions ?? [];
  const falls = predictions.filter((p) => isFallClass(p.class));

  return (
    <div className="fg-mt">
      <div className="fg-mt-frame">
        {source === "camara" ? (
          <div className="fg-mt-imgwrap" style={{ display: streaming ? undefined : "none" }}>
            <video ref={videoRef} className="fg-mt-img" muted playsInline />
            {result && <Boxes result={result} />}
            <span className="fg-cam-tag fg-cam-tag-rec">
              <span className="fg-cam-rec-dot" aria-hidden /> EN VIVO
            </span>
          </div>
        ) : preview ? (
          <div className="fg-mt-imgwrap">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen local subida por el usuario */}
            <img src={preview} alt="Imagen analizada" className="fg-mt-img" />
            {result && <Boxes result={result} />}
          </div>
        ) : null}

        {source === "camara" && !streaming && (
          <span className="fg-cam-offline">
            <CameraOff size={32} strokeWidth={STROKE} aria-hidden />
            Cámara apagada
          </span>
        )}
        {source === "imagen" && !preview && (
          <span className="fg-cam-offline">
            <ImageUp size={32} strokeWidth={STROKE} aria-hidden />
            Sube una imagen para analizarla
          </span>
        )}
      </div>

      <div className="fg-spec fg-mt-side">
        <div className="fg-mt-tabs" role="tablist" aria-label="Fuente">
          {(
            [
              ["camara", "Cámara"],
              ["imagen", "Imagen"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={source === value}
              className={`fg-mt-tab ${source === value ? "fg-mt-tab-active" : ""}`}
              onClick={() => switchSource(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {source === "camara" ? (
          <button
            type="button"
            className="fg-btn-ack fg-mt-upload"
            onClick={() => (streaming ? stopCamera() : void startCamera())}
          >
            {streaming ? (
              <CameraOff size={20} strokeWidth={STROKE} aria-hidden />
            ) : (
              <Camera size={20} strokeWidth={STROKE} aria-hidden />
            )}
            {streaming ? "Detener cámara" : "Encender cámara"}
          </button>
        ) : (
          <label className="fg-btn-ack fg-mt-upload">
            <ImageUp size={20} strokeWidth={STROKE} aria-hidden />
            Elegir imagen
            <input
              type="file"
              accept="image/*"
              hidden
              disabled={loading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void analyzeFile(file);
                e.target.value = "";
              }}
            />
          </label>
        )}

        {loading && (
          <p className="fg-mt-status">
            <LoaderCircle size={18} strokeWidth={STROKE} className="fg-mt-spin" aria-hidden />
            Analizando…
          </p>
        )}

        {error && <p className="fg-mt-status fg-mt-error">No se pudo analizar: {error}</p>}

        {result && (
          <>
            <p className={`fg-mt-verdict ${falls.length ? "fg-mt-verdict-fall" : ""}`}>
              {falls.length ? "Caída detectada" : "Sin caídas detectadas"}
            </p>
            <div className="fg-spec-row">
              <span className="fg-spec-key">Detecciones</span>
              <span>{predictions.length}</span>
            </div>
            {typeof result.time === "number" && (
              <div className="fg-spec-row">
                <span className="fg-spec-key">Inferencia</span>
                <span>{Math.round(result.time * 1000)} ms</span>
              </div>
            )}
            {predictions.map((p, i) => (
              <div key={p.detection_id ?? i} className="fg-cam-det">
                <span className="fg-cam-det-time">#{i + 1}</span>
                <span>{labelOf(p.class)}</span>
                <span className="fg-cam-det-conf">{Math.round(p.confidence * 100)} %</span>
              </div>
            ))}
          </>
        )}

        <p className="fg-section-sub" style={{ fontSize: 14, marginTop: 12 }}>
          Modelo <code>fall-c3gmv/1</code> en Roboflow. Con la cámara se envía un cuadro por
          segundo al servidor y de ahí a la API; no se guarda nada.
        </p>
      </div>
    </div>
  );
}
