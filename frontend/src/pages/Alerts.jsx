import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  Check,
  CloudFog,
  Flame,
  LoaderCircle,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  XCircle,
} from "lucide-react";

import "./Alerts.css";

const BACKEND_URL = "http://127.0.0.1:8001";
const API_URL = `${BACKEND_URL}/api/incidents`;
const CAMERAS_API_URL = `${BACKEND_URL}/api/cameras`;

function formatDate(dateValue) {
  if (!dateValue) return "Date inconnue";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function getIncidentType(incident) {
  if (incident.detected_fire && incident.detected_smoke) {
    return "Feu et fumée";
  }

  if (incident.detected_fire) return "Feu";
  if (incident.detected_smoke) return "Fumée";

  return "Incident";
}

function getSeverityLabel(severity) {
  const labels = {
    critical: "Critique",
    high: "Élevée",
    medium: "Moyenne",
    low: "Faible",
  };

  return labels[severity] || severity;
}

function Alerts() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionState, setActionState] = useState({
    incidentId: null,
    action: "",
  });
  const [commentIncidentId, setCommentIncidentId] = useState(null);
  const [comment, setComment] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("active");
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const loadCameras = useCallback(async () => {
    try {
      const response = await fetch(CAMERAS_API_URL);

      if (!response.ok) {
        throw new Error("Impossible de récupérer les caméras.");
      }

      const data = await response.json();
      setCameras(data);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Une erreur est survenue pendant le chargement des caméras."
      );
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const searchParameters = new URLSearchParams({
        limit: "100",
      });

      if (
        sourceFilter !== "manual" &&
        selectedCameraId !== "all"
      ) {
        searchParameters.set("camera_id", selectedCameraId);
      }

      const response = await fetch(
        `${API_URL}?${searchParameters.toString()}`
      );

      if (!response.ok) {
        throw new Error("Impossible de récupérer les incidents.");
      }

      const data = await response.json();
      setIncidents(data);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Une erreur est survenue pendant le chargement."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedCameraId, sourceFilter]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  useEffect(() => {
    loadCameras();
  }, [loadCameras]);

  const updateIncident = async (
    incidentId,
    action,
    body,
  ) => {
    setActionState({ incidentId, action });
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/${incidentId}/${action}`,
        {
          method: "PATCH",
          headers: body
            ? { "Content-Type": "application/json" }
            : undefined,
          body: body ? JSON.stringify(body) : undefined,
        }
      );

      if (!response.ok) {
        const responseData = await response.json().catch(() => ({}));

        throw new Error(
          responseData.detail || "Impossible de mettre à jour cet incident."
        );
      }

      const updatedIncident = await response.json();

      setIncidents((currentIncidents) =>
        currentIncidents.map((incident) => {
          if (incident.id !== incidentId) {
            return incident;
          }

          return {
            ...incident,
            ...updatedIncident,
          };
        })
      );

      const successMessages = {
        confirm: "L’incident a été confirmé.",
        "false-alarm": "La détection a été classée comme fausse alerte.",
        comment: "Le commentaire a été enregistré.",
        resolve: "L’incident a été marqué comme résolu.",
      };

      setSuccess(successMessages[action]);

      if (action === "comment") {
        setComment("");
        setCommentIncidentId(null);
      }
    } catch (requestError) {
      setError(
        requestError.message ||
          "Une erreur est survenue pendant la mise à jour."
      );
    } finally {
      setActionState({ incidentId: null, action: "" });
    }
  };

  const submitComment = (incidentId) => {
    const normalizedComment = comment.trim();

    if (normalizedComment.length < 2) {
      setError("Le commentaire doit contenir au moins 2 caractères.");
      return;
    }

    updateIncident(
      incidentId,
      "comment",
      { comment: normalizedComment },
    );
  };

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSource =
      sourceFilter === "all" ||
      (sourceFilter === "cameras" &&
        incident.source_type === "camera") ||
      (sourceFilter === "manual" &&
        incident.source_type !== "camera");

    if (!matchesSource) return false;

    if (filter === "active") {
      return incident.status === "active";
    }

    if (filter === "in_progress") {
      return (
        incident.status === "in_progress" ||
        incident.status === "confirmed"
      );
    }

    if (filter === "resolved") {
      return (
        incident.status === "resolved" ||
        incident.status === "false_alarm"
      );
    }

    return true;
  });

  return (
    <div className="alerts-page">
      <header className="alerts-page__header">
        <div>
          <p className="alerts-page__eyebrow">
            CENTRE DE SUPERVISION
          </p>

          <h1>Gestion des alertes</h1>

          <p>
            Consultez, suivez et clôturez les incidents détectés
            automatiquement par le système.
          </p>
        </div>

        <button
          className="alerts-page__refresh"
          type="button"
          onClick={loadIncidents}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={loading ? "is-spinning" : ""}
          />
          Actualiser
        </button>
      </header>

      <section className="alerts-toolbar">
        <div className="alerts-toolbar__intro">
          <span className="alerts-toolbar__icon">
            <SlidersHorizontal size={20} />
          </span>

          <div>
            <strong>Filtres opérationnels</strong>
            <span>Choisissez l’origine et la zone à consulter</span>
          </div>
        </div>

        <div className="alerts-source-filter">
          <button
            type="button"
            className={sourceFilter === "all" ? "is-active" : ""}
            onClick={() => {
              setSourceFilter("all");
              setSelectedCameraId("all");
            }}
          >
            <ShieldCheck size={16} />
            Toutes les sources
          </button>

          <button
            type="button"
            className={sourceFilter === "cameras" ? "is-active" : ""}
            onClick={() => setSourceFilter("cameras")}
          >
            <Camera size={16} />
            Caméras automatiques
          </button>

          <button
            type="button"
            className={sourceFilter === "manual" ? "is-active" : ""}
            onClick={() => {
              setSourceFilter("manual");
              setSelectedCameraId("all");
            }}
          >
            <UploadCloud size={16} />
            Surveillance manuelle
          </button>
        </div>

        {sourceFilter !== "manual" && (
          <label className="alerts-camera-filter">
            <span>Zone surveillée</span>
            <select
              value={selectedCameraId}
              onChange={(event) =>
                setSelectedCameraId(event.target.value)
              }
            >
              <option value="all">Toutes les caméras</option>
              {cameras.map((cameraItem) => (
                <option key={cameraItem.id} value={cameraItem.id}>
                  {cameraItem.name} — {cameraItem.location}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      <section className="alerts-panel">
        <header className="alerts-panel__header">
          <div>
            <h2>Incidents enregistrés</h2>
            <p>{filteredIncidents.length} résultat(s) affiché(s)</p>
          </div>

          <div className="alerts-filters">
            <button
              type="button"
              className={filter === "active" ? "is-active" : ""}
              onClick={() => setFilter("active")}
            >
              Actifs
            </button>

            <button
              type="button"
              className={filter === "in_progress" ? "is-active" : ""}
              onClick={() => setFilter("in_progress")}
            >
              Pris en charge
            </button>

            <button
              type="button"
              className={filter === "resolved" ? "is-active" : ""}
              onClick={() => setFilter("resolved")}
            >
              Résolus
            </button>

            <button
              type="button"
              className={filter === "all" ? "is-active" : ""}
              onClick={() => setFilter("all")}
            >
              Tous
            </button>
          </div>
        </header>

        {error && (
          <div className="alerts-message alerts-message--error">
            <AlertTriangle size={19} />
            {error}
          </div>
        )}

        {success && (
          <div className="alerts-message alerts-message--success">
            <ShieldCheck size={19} />
            {success}
          </div>
        )}

        {loading ? (
          <div className="alerts-state">
            <LoaderCircle size={30} className="is-spinning" />
            <strong>Chargement des incidents...</strong>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="alerts-state">
            <ShieldCheck size={34} />
            <strong>Aucun incident dans cette catégorie</strong>
            <span>Le système ne signale actuellement aucune alerte.</span>
          </div>
        ) : (
          <div className="alerts-list">
            {filteredIncidents.map((incident) => {
              const isActive = incident.status === "active";
              const isResolved = incident.status === "resolved";
              const isInProgress = incident.status === "in_progress";
              const isConfirmed = incident.status === "confirmed";
              const isFalseAlarm = incident.status === "false_alarm";
              const isClosed = isResolved || isFalseAlarm;
              const isCurrentAction =
                actionState.incidentId === incident.id;

              return (
                <article
                  className={`incident-card ${
                    isClosed ? "incident-card--resolved" : ""
                  }`}
                  key={incident.id}
                >
                  <span
                    className={`incident-card__icon incident-card__icon--${incident.severity}`}
                  >
                    {incident.detected_fire ? (
                      <Flame size={22} />
                    ) : (
                      <CloudFog size={22} />
                    )}
                  </span>

                  <div className="incident-card__main">
                    <div className="incident-card__title">
                      <div>
                        <h3>{getIncidentType(incident)} détecté</h3>
                        <p>
                          Incident #{incident.id} · {incident.location}
                        </p>
                      </div>

                      <span
                        className={`incident-card__severity incident-card__severity--${incident.severity}`}
                      >
                        {getSeverityLabel(incident.severity)}
                      </span>
                    </div>

                    <div className="incident-card__details">
                      <span>
                        Source
                        <strong>
                          {incident.source_type === "camera"
                            ? "Caméra automatique"
                            : incident.source_type === "video"
                              ? "Vidéo importée"
                              : "Image importée"}
                        </strong>
                      </span>

                      <span>
                        Feu
                        <strong>{incident.fire_count}</strong>
                      </span>

                      <span>
                        Fumée
                        <strong>{incident.smoke_count}</strong>
                      </span>

                      <span>
                        Confiance maximale
                        <strong>
                          {(incident.maximum_confidence * 100).toFixed(1)} %
                        </strong>
                      </span>

                      <span>
                        Détection
                        <strong>{formatDate(incident.created_at)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="incident-card__actions">
                    <span
                      className={`incident-card__status incident-card__status--${incident.status}`}
                    >
                      {isResolved
                        ? "Résolu"
                        : isFalseAlarm
                          ? "Fausse alerte"
                          : isConfirmed
                            ? "Confirmé"
                        : isInProgress
                          ? "Pris en charge"
                          : "Actif"}
                    </span>

                    {!isClosed && (
                      <div className="incident-card__action-buttons">
                        {isActive && (
                          <button
                            className="incident-action incident-action--confirm"
                            type="button"
                            onClick={() =>
                              updateIncident(incident.id, "confirm")
                            }
                            disabled={isCurrentAction}
                          >
                            {isCurrentAction &&
                            actionState.action === "confirm" ? (
                              <LoaderCircle size={16} className="is-spinning" />
                            ) : (
                              <BadgeCheck size={16} />
                            )}
                            Confirmer
                          </button>
                        )}

                        {isActive && (
                          <button
                            className="incident-action incident-action--false"
                            type="button"
                            onClick={() =>
                              updateIncident(incident.id, "false-alarm")
                            }
                            disabled={isCurrentAction}
                          >
                            {isCurrentAction &&
                            actionState.action === "false-alarm" ? (
                              <LoaderCircle
                                size={16}
                                className="is-spinning"
                              />
                            ) : (
                              <XCircle size={16} />
                            )}
                            Fausse alerte
                          </button>
                        )}

                        <button
                          className="incident-action incident-action--comment"
                          type="button"
                          onClick={() => {
                            setError("");
                            setSuccess("");
                            setComment("");
                            setCommentIncidentId((currentId) =>
                              currentId === incident.id ? null : incident.id
                            );
                          }}
                          disabled={isCurrentAction}
                        >
                          <MessageSquare size={16} />
                          Commenter
                        </button>

                      <button
                        className="incident-action incident-action--resolve"
                        type="button"
                        onClick={() =>
                          updateIncident(incident.id, "resolve")
                        }
                        disabled={isCurrentAction}
                      >
                        {isCurrentAction &&
                        actionState.action === "resolve" ? (
                          <LoaderCircle
                            size={16}
                            className="is-spinning"
                          />
                        ) : (
                          <Check size={16} />
                        )}

                        Marquer comme résolu
                      </button>
                      </div>
                    )}
                  </div>

                  {commentIncidentId === incident.id && (
                    <div className="incident-card__comment-form">
                      <label htmlFor={`incident-comment-${incident.id}`}>
                        Commentaire de suivi
                      </label>

                      <div>
                        <textarea
                          id={`incident-comment-${incident.id}`}
                          maxLength={1000}
                          onChange={(event) => setComment(event.target.value)}
                          placeholder="Décrivez la vérification ou l’intervention réalisée…"
                          rows={3}
                          value={comment}
                        />

                        <button
                          type="button"
                          onClick={() => submitComment(incident.id)}
                          disabled={isCurrentAction || comment.trim().length < 2}
                        >
                          {isCurrentAction &&
                          actionState.action === "comment" ? (
                            <LoaderCircle size={16} className="is-spinning" />
                          ) : (
                            <Send size={16} />
                          )}
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  )}

                  {incident.notes && (
                    <div className="incident-card__notes">
                      <MessageSquare size={15} />
                      <p>{incident.notes}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default Alerts;
