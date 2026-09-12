import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  CloudFog,
  Flame,
  Image as ImageIcon,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  Server,
  Upload,
  Video,
  X,
} from "lucide-react";

import VideoAnalysis from "../components/VideoAnalysis";
import WebcamAnalysis from "../components/WebcamAnalysis";

import {
  checkBackendHealth,
  detectImage,
} from "../services/api";

import "./Surveillance.css";


const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];


function Surveillance() {
  const inputRef = useRef(null);

  const [analysisMode, setAnalysisMode] = useState("image");

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [backendStatus, setBackendStatus] = useState("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    async function verifyBackend() {
      try {
        await checkBackendHealth();
        setBackendStatus("online");
      } catch {
        setBackendStatus("offline");
      }
    }

    verifyBackend();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function validateAndSelectFile(file) {
    setError("");
    setResult(null);

    if (!file) {
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(
        "Format non accepté. Utilisez une image JPG, PNG ou WEBP.",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "L’image dépasse la taille maximale autorisée de 10 Mo.",
      );
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleFileChange(event) {
    validateAndSelectFile(event.target.files?.[0]);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);

    validateAndSelectFile(
      event.dataTransfer.files?.[0],
    );
  }

  function clearSelection() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl("");
    setResult(null);
    setError("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleAnalysis() {
    if (!selectedFile || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const detectionResult = await detectImage(
        selectedFile,
      );

      setResult(detectionResult);
      setBackendStatus("online");
    } catch (requestError) {
      setBackendStatus("offline");

      const message =
        requestError.response?.data?.detail ||
        "Impossible de communiquer avec le backend.";

      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const highestConfidence = result?.detections?.length
    ? Math.max(
        ...result.detections.map(
          (detection) => detection.confidence,
        ),
      )
    : 0;

  return (
    <div className="surveillance">
      <header className="surveillance__header">
        <div>
          <p className="surveillance__eyebrow">
            ANALYSE INTELLIGENTE
          </p>

          <h1>Surveillance</h1>

          <p>
            Analysez des images et des vidéos pour détecter
            automatiquement le feu et la fumée.
          </p>
        </div>

        <div
          className={
            `surveillance__backend ` +
            `surveillance__backend--${backendStatus}`
          }
        >
          <Server size={17} />

          <span>
            <small>Backend IA</small>

            <strong>
              {backendStatus === "online" && "Opérationnel"}
              {backendStatus === "offline" && "Hors ligne"}
              {backendStatus === "checking" && "Vérification..."}
            </strong>
          </span>

          <i />
        </div>
      </header>

      <div className="surveillance__mode-selector">
        <button
          className={
            analysisMode === "image"
              ? "surveillance__mode surveillance__mode--active"
              : "surveillance__mode"
          }
          onClick={() => setAnalysisMode("image")}
          type="button"
        >
          <span>
            <ImageIcon size={19} />
          </span>

          <div>
            <strong>Analyse d’image</strong>
            <small>JPG, PNG ou WEBP</small>
          </div>
        </button>

        <button
          className={
            analysisMode === "video"
              ? "surveillance__mode surveillance__mode--active"
              : "surveillance__mode"
          }
          onClick={() => setAnalysisMode("video")}
          type="button"
        >
          <span>
            <Video size={19} />
          </span>

          <div>
            <strong>Analyse vidéo</strong>
            <small>MP4, AVI, MOV ou WEBM</small>
          </div>
        </button>

        <button
          className={
            analysisMode === "webcam"
              ? "surveillance__mode surveillance__mode--active"
              : "surveillance__mode"
          }
          onClick={() => setAnalysisMode("webcam")}
          type="button"
        >
          <span>
            <Camera size={19} />
          </span>

          <div>
            <strong>Webcam en direct</strong>
            <small>Analyse en temps réel</small>
          </div>
        </button>
      </div>

      {analysisMode === "video" ? (
        <VideoAnalysis
          backendOnline={backendStatus === "online"}
        />
      ) : analysisMode === "webcam" ? (
        <WebcamAnalysis
          backendOnline={backendStatus === "online"}
        />
      ) : (
        <>
          <section className="surveillance__steps">
            <div className="surveillance__step surveillance__step--active">
              <span>1</span>

              <div>
                <strong>Importer</strong>
                <small>Sélectionner une image</small>
              </div>
            </div>

            <div className="surveillance__step-line" />

            <div
              className={
                selectedFile
                  ? "surveillance__step surveillance__step--active"
                  : "surveillance__step"
              }
            >
              <span>2</span>

              <div>
                <strong>Analyser</strong>
                <small>Exécuter le modèle YOLO</small>
              </div>
            </div>

            <div className="surveillance__step-line" />

            <div
              className={
                result
                  ? "surveillance__step surveillance__step--active"
                  : "surveillance__step"
              }
            >
              <span>3</span>

              <div>
                <strong>Vérifier</strong>
                <small>Consulter le résultat</small>
              </div>
            </div>
          </section>

          {error && (
            <div className="surveillance__error">
              <AlertTriangle size={19} />
              <span>{error}</span>

              <button
                aria-label="Fermer le message"
                onClick={() => setError("")}
                type="button"
              >
                <X size={17} />
              </button>
            </div>
          )}

          <section className="surveillance__workspace">
            <article className="surveillance-card">
              <header className="surveillance-card__header">
                <div>
                  <h2>Image à analyser</h2>
                  <p>
                    JPG, PNG ou WEBP — maximum 10 Mo
                  </p>
                </div>

                {selectedFile && (
                  <button
                    className="surveillance__clear-button"
                    onClick={clearSelection}
                    type="button"
                  >
                    <RefreshCw size={15} />
                    Réinitialiser
                  </button>
                )}
              </header>

              {!selectedFile ? (
                <button
                  className={
                    isDragging
                      ? "surveillance__dropzone surveillance__dropzone--dragging"
                      : "surveillance__dropzone"
                  }
                  onClick={() =>
                    inputRef.current?.click()
                  }
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDrop={handleDrop}
                  type="button"
                >
                  <span className="surveillance__upload-icon">
                    <Upload size={26} />
                  </span>

                  <strong>
                    Déposez une image dans cette zone
                  </strong>

                  <span>
                    ou cliquez pour sélectionner un fichier
                  </span>

                  <small>
                    JPG, PNG, WEBP · 10 Mo maximum
                  </small>
                </button>
              ) : (
                <div className="surveillance__preview">
                  <img
                    alt="Image sélectionnée"
                    src={previewUrl}
                  />

                  <div className="surveillance__file-info">
                    <span>
                      <ImageIcon size={17} />
                    </span>

                    <div>
                      <strong>{selectedFile.name}</strong>

                      <small>
                        {(
                          selectedFile.size
                          / 1024
                          / 1024
                        ).toFixed(2)}
                        {" Mo"}
                      </small>
                    </div>

                    <CheckCircle2 size={18} />
                  </div>
                </div>
              )}

              <input
                accept=".jpg,.jpeg,.png,.webp"
                hidden
                onChange={handleFileChange}
                ref={inputRef}
                type="file"
              />

              <button
                className="surveillance__analyze-button"
                disabled={
                  !selectedFile ||
                  isAnalyzing ||
                  backendStatus !== "online"
                }
                onClick={handleAnalysis}
                type="button"
              >
                {isAnalyzing ? (
                  <>
                    <LoaderCircle
                      className="surveillance__spinner"
                      size={18}
                    />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <ScanLine size={18} />
                    Lancer la détection
                  </>
                )}
              </button>
            </article>

            <article className="surveillance-card">
              <header className="surveillance-card__header">
                <div>
                  <h2>Résultat de l’analyse</h2>
                  <p>
                    Visualisation des détections du modèle
                  </p>
                </div>

                {result && (
                  <span
                    className={
                      result.has_incident
                        ? "surveillance__result-status surveillance__result-status--danger"
                        : "surveillance__result-status surveillance__result-status--safe"
                    }
                  >
                    {result.has_incident
                      ? "Incident détecté"
                      : "Aucun incident"}
                  </span>
                )}
              </header>

              {!result && !isAnalyzing && (
                <div className="surveillance__empty-result">
                  <span>
                    <ScanLine size={31} />
                  </span>

                  <strong>
                    En attente d’une analyse
                  </strong>

                  <p>
                    Le résultat annoté apparaîtra ici
                    après l’exécution du modèle.
                  </p>
                </div>
              )}

              {isAnalyzing && (
                <div className="surveillance__loading-result">
                  <LoaderCircle
                    className="surveillance__spinner"
                    size={34}
                  />

                  <strong>Analyse de l’image</strong>

                  <p>
                    Le modèle recherche les zones
                    de feu et de fumée.
                  </p>
                </div>
              )}

              {result && (
                <div className="surveillance__result">
                  <div className="surveillance__result-image">
                    <img
                      alt="Résultat annoté par YOLO"
                      src={result.annotated_image}
                    />

                    <span>Image analysée par YOLO</span>
                  </div>

                  <div className="surveillance__result-metrics">
                    <div>
                      <span className="surveillance__metric-icon surveillance__metric-icon--red">
                        <Flame size={18} />
                      </span>

                      <span>
                        <small>Feu</small>
                        <strong>{result.fire_count}</strong>
                      </span>
                    </div>

                    <div>
                      <span className="surveillance__metric-icon surveillance__metric-icon--orange">
                        <CloudFog size={18} />
                      </span>

                      <span>
                        <small>Fumée</small>
                        <strong>{result.smoke_count}</strong>
                      </span>
                    </div>

                    <div>
                      <span className="surveillance__metric-icon surveillance__metric-icon--blue">
                        <ScanLine size={18} />
                      </span>

                      <span>
                        <small>Total</small>
                        <strong>
                          {result.total_detections}
                        </strong>
                      </span>
                    </div>

                    <div>
                      <span className="surveillance__metric-icon surveillance__metric-icon--green">
                        <CheckCircle2 size={18} />
                      </span>

                      <span>
                        <small>Confiance max.</small>

                        <strong>
                          {(highestConfidence * 100).toFixed(1)}
                          {" %"}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </article>
          </section>

          {result?.detections?.length > 0 && (
            <section className="surveillance-card surveillance__details">
              <header className="surveillance-card__header">
                <div>
                  <h2>Détails des détections</h2>
                  <p>
                    Classes et niveaux de confiance
                  </p>
                </div>
              </header>

              <div className="surveillance__detection-table">
                <div className="surveillance__detection-head">
                  <span>Numéro</span>
                  <span>Classe</span>
                  <span>Confiance</span>
                  <span>Coordonnées</span>
                </div>

                {result.detections.map(
                  (detection, index) => (
                    <div
                      className="surveillance__detection-row"
                      key={
                        `${detection.class_name}-${index}`
                      }
                    >
                      <span>#{index + 1}</span>

                      <span
                        className={
                          detection.class_name === "fire"
                            ? "surveillance__class surveillance__class--fire"
                            : "surveillance__class surveillance__class--smoke"
                        }
                      >
                        {detection.class_name === "fire"
                          ? "Feu"
                          : "Fumée"}
                      </span>

                      <strong>
                        {(
                          detection.confidence * 100
                        ).toFixed(1)}
                        {" %"}
                      </strong>

                      <span>
                        x1: {detection.bbox.x1} ·
                        {" "}y1: {detection.bbox.y1} ·
                        {" "}x2: {detection.bbox.x2} ·
                        {" "}y2: {detection.bbox.y2}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default Surveillance;