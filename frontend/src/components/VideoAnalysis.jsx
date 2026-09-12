import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  CloudFog,
  Film,
  Flame,
  Gauge,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  Upload,
  Video,
  X,
} from "lucide-react";

import { detectVideo } from "../services/api";

import "./VideoAnalysis.css";


const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
];


function VideoAnalysis({ backendOnline }) {
  const inputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");

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
    setUploadProgress(0);

    if (!file) {
      return;
    }

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    const validExtension = [
      "mp4",
      "avi",
      "mov",
      "webm",
    ].includes(extension);

    if (
      !ALLOWED_VIDEO_TYPES.includes(file.type)
      && !validExtension
    ) {
      setError(
        "Format non accepté. Utilisez MP4, AVI, MOV ou WEBM.",
      );
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setError(
        "La vidéo dépasse la taille maximale autorisée de 100 Mo.",
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

  function resetVideo() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl("");
    setResult(null);
    setError("");
    setUploadProgress(0);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleVideoAnalysis() {
    if (!selectedFile || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setError("");
    setUploadProgress(0);

    try {
      const videoResult = await detectVideo(
        selectedFile,
        setUploadProgress,
      );

      setResult(videoResult);
    } catch (requestError) {
      const message =
        requestError.response?.data?.detail ||
        "Impossible d’analyser la vidéo.";

      setError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="video-analysis">
      {error && (
        <div className="video-analysis__error">
          <AlertTriangle size={18} />
          <span>{error}</span>

          <button
            aria-label="Fermer le message"
            onClick={() => setError("")}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="video-analysis__grid">
        <article className="surveillance-card">
          <header className="surveillance-card__header">
            <div>
              <h2>Vidéo à analyser</h2>
              <p>
                Formats MP4, AVI, MOV ou WEBM — maximum 100 Mo
              </p>
            </div>

            {selectedFile && (
              <button
                className="surveillance__clear-button"
                onClick={resetVideo}
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
                `video-analysis__dropzone ` +
                `${isDragging
                  ? "video-analysis__dropzone--dragging"
                  : ""}`
              }
              onClick={() => inputRef.current?.click()}
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
              <span className="video-analysis__upload-icon">
                <Upload size={27} />
              </span>

              <strong>
                Déposez une vidéo dans cette zone
              </strong>

              <span>
                ou cliquez pour sélectionner un fichier
              </span>

              <small>
                MP4, AVI, MOV, WEBM · 100 Mo maximum
              </small>
            </button>
          ) : (
            <div className="video-analysis__preview">
              <video
                controls
                key={previewUrl}
                preload="metadata"
                src={previewUrl}
              />

              <div className="video-analysis__file-info">
                <span>
                  <Video size={17} />
                </span>

                <div>
                  <strong>{selectedFile.name}</strong>

                  <small>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)}
                    {" Mo"}
                  </small>
                </div>

                <CheckCircle2 size={18} />
              </div>
            </div>
          )}

          <input
            accept=".mp4,.avi,.mov,.webm"
            hidden
            onChange={handleFileChange}
            ref={inputRef}
            type="file"
          />

          {isAnalyzing && (
            <div className="video-analysis__progress">
              <div>
                <span>
                  {uploadProgress < 100
                    ? "Envoi de la vidéo"
                    : "Analyse des frames avec YOLO"}
                </span>

                <strong>
                  {uploadProgress < 100
                    ? `${uploadProgress} %`
                    : "Traitement en cours"}
                </strong>
              </div>

              <div className="video-analysis__progress-track">
                <span
                  style={{
                    width: `${Math.max(
                      uploadProgress,
                      uploadProgress === 100 ? 100 : 0,
                    )}%`,
                  }}
                />
              </div>

              <small>
                Le traitement peut prendre plusieurs minutes
                sur le processeur.
              </small>
            </div>
          )}

          <button
            className="surveillance__analyze-button"
            disabled={
              !selectedFile ||
              isAnalyzing ||
              !backendOnline
            }
            onClick={handleVideoAnalysis}
            type="button"
          >
            {isAnalyzing ? (
              <>
                <LoaderCircle
                  className="surveillance__spinner"
                  size={18}
                />
                Analyse vidéo en cours...
              </>
            ) : (
              <>
                <ScanLine size={18} />
                Lancer l’analyse vidéo
              </>
            )}
          </button>
        </article>

        <article className="surveillance-card">
          <header className="surveillance-card__header">
            <div>
              <h2>Vidéo analysée</h2>
              <p>
                Résultat annoté et résumé de la détection
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
                  ? "Incident confirmé"
                  : "Aucun incident confirmé"}
              </span>
            )}
          </header>

          {!result && !isAnalyzing && (
            <div className="video-analysis__empty">
              <span>
                <Film size={32} />
              </span>

              <strong>
                En attente d’une analyse vidéo
              </strong>

              <p>
                La vidéo annotée apparaîtra ici après
                le traitement de toutes les frames.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="video-analysis__processing">
              <LoaderCircle
                className="surveillance__spinner"
                size={38}
              />

              <strong>
                Traitement de la vidéo
              </strong>

              <p>
                YOLO analyse chaque frame puis FFmpeg
                prépare la vidéo pour le navigateur.
              </p>
            </div>
          )}

          {result && (
            <div className="video-analysis__result">
              <div className="video-analysis__result-video">
                <video
                  controls
                  key={result.video_url}
                  preload="metadata"
                  src={result.video_url}
                />

                <span>
                  Vidéo annotée par YOLO
                </span>
              </div>

              <div className="video-analysis__metrics">
                <div>
                  <span className="video-analysis__metric video-analysis__metric--red">
                    <Flame size={18} />
                  </span>

                  <span>
                    <small>Frames feu</small>
                    <strong>{result.fire_frames}</strong>
                  </span>
                </div>

                <div>
                  <span className="video-analysis__metric video-analysis__metric--orange">
                    <CloudFog size={18} />
                  </span>

                  <span>
                    <small>Frames fumée</small>
                    <strong>{result.smoke_frames}</strong>
                  </span>
                </div>

                <div>
                  <span className="video-analysis__metric video-analysis__metric--blue">
                    <Film size={18} />
                  </span>

                  <span>
                    <small>Total frames</small>
                    <strong>{result.total_frames}</strong>
                  </span>
                </div>

                <div>
                  <span className="video-analysis__metric video-analysis__metric--green">
                    <Gauge size={18} />
                  </span>

                  <span>
                    <small>Confiance max.</small>
                    <strong>
                      {(result.maximum_confidence * 100).toFixed(1)}
                      {" %"}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="video-analysis__summary">
                <div>
                  <Clock3 size={16} />

                  <span>
                    <small>Durée</small>
                    <strong>
                      {result.duration_seconds} secondes
                    </strong>
                  </span>
                </div>

                <div>
                  <Film size={16} />

                  <span>
                    <small>Cadence</small>
                    <strong>{result.fps} FPS</strong>
                  </span>
                </div>

                <div>
                  <CheckCircle2 size={16} />

                  <span>
                    <small>Confirmation</small>
                    <strong>
                      {result.maximum_consecutive_frames}
                      {" frames consécutives"}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}

export default VideoAnalysis;