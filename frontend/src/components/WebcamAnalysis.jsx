import {
  AlertTriangle,
  BellRing,
  Camera,
  CloudFog,
  Flame,
  LoaderCircle,
  Play,
  Radio,
  ShieldCheck,
  Square,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  analyzeWebcamFrame,
  resetWebcamSession,
} from "../services/api";

import "./WebcamAnalysis.css";


const ALARM_SOUND_URL = "/sound/urgent-alarm.wav";


function getAlarmSettings() {
  try {
    const settings = JSON.parse(
      localStorage.getItem("menara-fire-settings")
    );

    const enabled =
      settings?.sirenEnabled
      ?? settings?.alarmEnabled
      ?? settings?.alarm
      ?? true;

    const rawVolume = Number(
      settings?.alarmVolume
      ?? settings?.sirenVolume
      ?? settings?.volume
      ?? 80
    );

    return {
      enabled,
      volume: Math.min(1, Math.max(0, rawVolume / 100)),
    };
  } catch {
    return {
      enabled: true,
      volume: 0.8,
    };
  }
}


function createSessionId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `webcam-${Date.now()}`;
}


function WebcamAnalysis({
  backendOnline,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const alarmRef = useRef(null);
  const alarmPlayedRef = useRef(false);

  const sessionIdRef = useRef(
    createSessionId()
  );

  const [isActive, setIsActive] =
    useState(false);

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  const [alarmActive, setAlarmActive] =
    useState(false);


  function prepareAlarm() {
    if (!alarmRef.current) {
      alarmRef.current = new Audio(
        ALARM_SOUND_URL
      );

      alarmRef.current.preload = "auto";
      alarmRef.current.onended = () => {
        setAlarmActive(false);
      };
    }

    alarmRef.current.load();
  }


  function stopAlarm() {
    if (alarmRef.current) {
      alarmRef.current.pause();
      alarmRef.current.currentTime = 0;
    }

    setAlarmActive(false);
  }


  async function playIncidentAlarm() {
    const alarmSettings = getAlarmSettings();

    if (
      !alarmSettings.enabled
      || alarmPlayedRef.current
    ) {
      return;
    }

    prepareAlarm();

    alarmPlayedRef.current = true;
    alarmRef.current.volume = alarmSettings.volume;

    try {
      await alarmRef.current.play();
      setAlarmActive(true);
    } catch {
      alarmPlayedRef.current = false;
      setError(
        "Incident détecté, mais le navigateur a bloqué la sirène."
      );
    }
  }


  function clearAnalysisTimer() {
    if (timerRef.current) {
      window.clearTimeout(
        timerRef.current
      );

      timerRef.current = null;
    }
  }


  async function stopWebcam() {
    clearAnalysisTimer();
    stopAlarm();
    alarmPlayedRef.current = false;

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
    setIsAnalyzing(false);

    try {
      await resetWebcamSession(
        sessionIdRef.current
      );
    } catch {
      // L’arrêt local reste possible
      // même si le backend est indisponible.
    }

    sessionIdRef.current =
      createSessionId();
  }


  async function captureAndAnalyze() {
    if (
      !streamRef.current
      || !videoRef.current
      || !canvasRef.current
    ) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      video.videoWidth === 0
      || video.videoHeight === 0
    ) {
      timerRef.current = window.setTimeout(
        captureAndAnalyze,
        500
      );

      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext(
      "2d"
    );

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const frameBlob = await new Promise(
      (resolve) => {
        canvas.toBlob(
          resolve,
          "image/jpeg",
          0.82
        );
      }
    );

    if (!frameBlob) {
      setError(
        "Impossible de capturer la frame webcam."
      );

      return;
    }

    setIsAnalyzing(true);

    try {
      const detectionResult =
        await analyzeWebcamFrame(
          sessionIdRef.current,
          frameBlob
        );

      setResult(detectionResult);
      setError("");

      if (detectionResult.new_incident) {
        await playIncidentAlarm();
      }

      if (!detectionResult.has_incident) {
        alarmPlayedRef.current = false;
      }
    } catch (requestError) {
      const message =
        requestError.response?.data?.detail
        || "Impossible d’analyser la webcam.";

      setError(message);
    } finally {
      setIsAnalyzing(false);
    }

    if (streamRef.current) {
      timerRef.current = window.setTimeout(
        captureAndAnalyze,
        700
      );
    }
  }


  async function startWebcam() {
    if (
      !backendOnline
      || isActive
    ) {
      return;
    }

    setError("");
    setResult(null);
    setAlarmActive(false);
    alarmPlayedRef.current = false;
    prepareAlarm();

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
            facingMode: "environment",
          },
          audio: false,
        });

      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error(
          "Élément vidéo indisponible."
        );
      }

      videoRef.current.srcObject = stream;

      await videoRef.current.play();

      setIsActive(true);

      captureAndAnalyze();
    } catch (cameraError) {
      setError(
        cameraError.name === "NotAllowedError"
          ? "L’accès à la webcam a été refusé."
          : "Impossible d’ouvrir la webcam."
      );

      await stopWebcam();
    }
  }


  useEffect(() => {
    return () => {
      clearAnalysisTimer();
      stopAlarm();

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }

      resetWebcamSession(
        sessionIdRef.current
      ).catch(() => {});
    };
  }, []);


  return (
    <section className="webcam-analysis">
      <header className="webcam-analysis__header">
        <div>
          <span className="webcam-analysis__eyebrow">
            <Radio size={15} />
            SURVEILLANCE TEMPS RÉEL
          </span>

          <h2>Webcam en direct</h2>

          <p>
            Analyse continue avec confirmation
            temporelle du feu et de la fumée.
          </p>
        </div>

        <span
          className={
            isActive
              ? "webcam-analysis__live webcam-analysis__live--active"
              : "webcam-analysis__live"
          }
        >
          <i />
          {isActive
            ? "EN DIRECT"
            : "ARRÊTÉE"}
        </span>
      </header>

      {error && (
        <div className="webcam-analysis__error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {(result?.new_incident || alarmActive) && (
        <div className="webcam-analysis__incident-banner">
          <span>
            <BellRing size={22} />
          </span>

          <div>
            <strong>Nouvel incident confirmé</strong>
            <small>
              Une détection persistante de feu ou de fumée vient
              d’être signalée par le système.
            </small>
          </div>

          {alarmActive && (
            <button onClick={stopAlarm} type="button">
              Arrêter la sirène
            </button>
          )}
        </div>
      )}

      <div className="webcam-analysis__grid">
        <article className="webcam-analysis__panel">
          <header className="webcam-analysis__panel-header">
            <div>
              <span className="webcam-analysis__panel-icon">
                <Camera size={19} />
              </span>

              <div>
                <h3>Flux de la caméra</h3>
                <p>Source vidéo locale sécurisée</p>
              </div>
            </div>

            <span className="webcam-analysis__connection">
              <i />
              {isActive ? "Connectée" : "Déconnectée"}
            </span>
          </header>

          <div className="webcam-analysis__video">
            <video
              autoPlay
              muted
              playsInline
              ref={videoRef}
            />

            {isActive && (
              <div className="webcam-analysis__video-overlay">
                <span>
                  <i /> DIRECT
                </span>

                <small>Caméra locale · 1280 × 720</small>
              </div>
            )}

            {!isActive && (
              <div className="webcam-analysis__placeholder">
                <Camera size={38} />
                <strong>Webcam inactive</strong>
                <span>
                  Démarrez la caméra pour afficher
                  le flux en direct.
                </span>
              </div>
            )}
          </div>

          <button
            className={
              isActive
                ? "webcam-analysis__button webcam-analysis__button--stop"
                : "webcam-analysis__button"
            }
            disabled={
              !backendOnline
            }
            onClick={
              isActive
                ? stopWebcam
                : startWebcam
            }
            type="button"
          >
            {isActive ? (
              <>
                <Square size={18} />
                Arrêter la surveillance
              </>
            ) : (
              <>
                <Play
                  fill="currentColor"
                  size={18}
                />
                Démarrer la surveillance
              </>
            )}
          </button>
        </article>

        <article className="webcam-analysis__panel">
          <div className="webcam-analysis__result-header">
            <div className="webcam-analysis__result-title">
              <span className="webcam-analysis__panel-icon webcam-analysis__panel-icon--ai">
                <ShieldCheck size={19} />
              </span>

              <div>
                <h3>Analyse IA en direct</h3>
                <p>Confirmation temporelle multi-frames</p>
              </div>
            </div>

            {isAnalyzing && (
              <LoaderCircle
                className="surveillance__spinner"
                size={20}
              />
            )}
          </div>

          <div
            className={
              result?.has_incident
                ? "webcam-analysis__state webcam-analysis__state--danger"
                : "webcam-analysis__state webcam-analysis__state--safe"
            }
          >
            {result?.has_incident ? (
              <AlertTriangle size={30} />
            ) : (
              <ShieldCheck size={30} />
            )}

            <div>
              <strong>
                {result?.state === "FIRE" && "FEU CONFIRMÉ"}
                {result?.state === "SMOKE" && "FUMÉE CONFIRMÉE"}
                {result?.state === "NORMAL" && "ZONE NORMALE"}
                {!result?.state && "EN ATTENTE"}
              </strong>

              <span>
                {result?.has_incident
                  ? "Incident confirmé par le modèle"
                  : "Aucun incident confirmé"}
              </span>
            </div>
          </div>

          {result?.annotated_frame ? (
            <div className="webcam-analysis__annotated">
              <img
                alt="Frame webcam annotée"
                src={result.annotated_frame}
              />
            </div>
          ) : (
            <div className="webcam-analysis__empty">
              <Camera size={31} />
              <span>
                Le résultat annoté apparaîtra ici.
              </span>
            </div>
          )}

          <div className="webcam-analysis__metrics">
            <div>
              <Flame size={19} />
              <span>
                <small>Feu</small>
                <strong>
                  {(
                    (result?.fire_confidence || 0)
                    * 100
                  ).toFixed(1)}
                  {" %"}
                </strong>
              </span>
            </div>

            <div>
              <CloudFog size={19} />
              <span>
                <small>Fumée</small>
                <strong>
                  {(
                    (result?.smoke_confidence || 0)
                    * 100
                  ).toFixed(1)}
                  {" %"}
                </strong>
              </span>
            </div>

            <div>
              <ShieldCheck size={19} />
              <span>
                <small>Frames analysées</small>
                <strong>
                  {result?.analyzed_frames || 0}
                </strong>
              </span>
            </div>
          </div>

          <div className="webcam-analysis__footer-status">
            <span>
              <i className={backendOnline ? "is-online" : ""} />
              Backend {backendOnline ? "opérationnel" : "indisponible"}
            </span>

            <span>
              Modèle YOLO · Feu et fumée
            </span>
          </div>
        </article>
      </div>

      <canvas
        hidden
        ref={canvasRef}
      />
    </section>
  );
}


export default WebcamAnalysis;