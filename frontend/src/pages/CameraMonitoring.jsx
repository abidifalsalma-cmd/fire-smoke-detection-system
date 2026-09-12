import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Activity,
  BellRing,
  Camera,
  Clock3,
  Expand,
  Eye,
  LoaderCircle,
  MapPin,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Server,
  ShieldCheck,
  Video,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from "lucide-react";

import "./CameraMonitoring.css";
import "./CameraManagement.css";

const API_URL = "http://127.0.0.1:8001";
const CAMERAS_API_URL = `${API_URL}/api/cameras`;

const EMPTY_CAMERA_FORM = {
  code: "",
  name: "",
  location: "",
  status: "online",
  stream_type: "simulation",
  video_url: "",
  is_enabled: true,
};


function formatCurrentDate(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}


function formatCurrentTime(date) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}


function CameraMonitoring() {
  const [cameras, setCameras] = useState([]);
  const [disabledCameras, setDisabledCameras] =
    useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [managementMessage, setManagementMessage] =
    useState("");
  const [cameraFormOpen, setCameraFormOpen] =
    useState(false);
  const [disabledCamerasOpen, setDisabledCamerasOpen] =
    useState(false);
  const [savingCamera, setSavingCamera] =
    useState(false);
  const [updatingCameraId, setUpdatingCameraId] =
    useState(null);
  const [cameraForm, setCameraForm] = useState(
    EMPTY_CAMERA_FORM
  );

  const [currentDate, setCurrentDate] = useState(
    new Date()
  );

  const [
    supervisionEnabled,
    setSupervisionEnabled,
  ] = useState(false);

  const [selectedCamera, setSelectedCamera] =
    useState(null);

  const [incidentCameraId, setIncidentCameraId] =
    useState(null);

  const [incidentResult, setIncidentResult] =
    useState(null);

  const [alarmMuted, setAlarmMuted] =
    useState(false);
    const [
  incidentAcknowledged,
  setIncidentAcknowledged,
] = useState(false);

const [
  acknowledgingIncident,
  setAcknowledgingIncident,
] = useState(false);

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [analyzingCameraId, setAnalyzingCameraId] =
    useState(null);

  const [analysisResults, setAnalysisResults] =
    useState({});

  
  const alarmAudioRef = useRef(null);


  const loadCameras = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${CAMERAS_API_URL}?include_disabled=true`
      );

      if (!response.ok) {
        throw new Error(
          "Impossible de récupérer les caméras."
        );
      }

      const data = await response.json();

      setCameras(
        data.filter((camera) => camera.is_enabled)
      );
      setDisabledCameras(
        data.filter((camera) => !camera.is_enabled)
      );
    } catch (requestError) {
      setError(
        requestError.message ||
          "Une erreur est survenue pendant le chargement."
      );
    } finally {
      setLoading(false);
    }
  }, []);


  const updateCameraForm = (field, value) => {
    setCameraForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };


  const closeCameraForm = () => {
    if (savingCamera) {
      return;
    }

    setCameraFormOpen(false);
    setCameraForm(EMPTY_CAMERA_FORM);
  };


  const createNewCamera = async (event) => {
    event.preventDefault();
    setSavingCamera(true);
    setError("");
    setManagementMessage("");

    try {
      const response = await fetch(
        CAMERAS_API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...cameraForm,
            code: cameraForm.code.trim(),
            name: cameraForm.name.trim(),
            location: cameraForm.location.trim(),
            video_url:
              cameraForm.video_url.trim() || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail ||
            "Impossible d’ajouter la caméra."
        );
      }

      setManagementMessage(
        `La caméra ${result.name} a été ajoutée.`
      );
      setCameraFormOpen(false);
      setCameraForm(EMPTY_CAMERA_FORM);
      // Une vérification auprès du backend garantit que la grille et
      // les compteurs ne contiennent que les caméras encore actives.
      await loadCameras();
    } catch (requestError) {
      setError(
        requestError.message ||
          "Erreur pendant l’ajout de la caméra."
      );
    } finally {
      setSavingCamera(false);
    }
  };


  const toggleCameraAvailability = async (
    event,
    cameraItem
  ) => {
    event.stopPropagation();
    setUpdatingCameraId(cameraItem.id);
    setError("");
    setManagementMessage("");

    try {
      const response = await fetch(
        `${CAMERAS_API_URL}/${cameraItem.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_enabled: !cameraItem.is_enabled,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail ||
            "Impossible de modifier la caméra."
        );
      }

      // Retrait immédiat de la carte sans attendre le rechargement.
      // La caméra reste conservée en base pour préserver son historique.
      if (!result.is_enabled) {
        setCameras((currentCameras) =>
          currentCameras.filter(
            (camera) => camera.id !== cameraItem.id
          )
        );

        setDisabledCameras((currentCameras) => [
          ...currentCameras.filter(
            (camera) => camera.id !== result.id
          ),
          result,
        ]);

        setAnalysisResults((currentResults) => {
          const nextResults = { ...currentResults };
          delete nextResults[cameraItem.id];
          return nextResults;
        });

        if (selectedCamera?.id === cameraItem.id) {
          setSelectedCamera(null);
        }

        if (incidentCameraId === cameraItem.id) {
          stopAlarm();
          setIncidentCameraId(null);
          setIncidentResult(null);
          setIncidentAcknowledged(false);
        }
      } else {
        setDisabledCameras((currentCameras) =>
          currentCameras.filter(
            (camera) => camera.id !== cameraItem.id
          )
        );
      }

      setManagementMessage(
        result.is_enabled
          ? `${result.name} a été activée.`
          : `${result.name} a été désactivée.`
      );
      await loadCameras();
    } catch (requestError) {
      setError(
        requestError.message ||
          "Erreur pendant la modification."
      );
    } finally {
      setUpdatingCameraId(null);
    }
  };


  const prepareAudio = async () => {
  if (!alarmAudioRef.current) {
    const audio = new Audio(
      "/sound/urgent-alarm.wav"
    );

    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 1;

    alarmAudioRef.current = audio;
  }

  const audio = alarmAudioRef.current;

  try {
    audio.muted = true;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
  } catch (audioError) {
    console.error(
      "Impossible de préparer l’alarme :",
      audioError
    );
  }
};


const stopAlarm = () => {
  const audio = alarmAudioRef.current;

  if (!audio) {
    return;
  }

  audio.pause();
  audio.currentTime = 0;
};


const startAlarm = async () => {
  const audio = alarmAudioRef.current;

  if (!audio) {
    return;
  }

  audio.pause();
  audio.currentTime = 0;
  audio.muted = false;
  audio.volume = 1;

  try {
    await audio.play();
  } catch (audioError) {
    console.error(
      "Impossible de démarrer l’alarme :",
      audioError
    );
  }
};
  const analyzeCameras = async () => {
    const availableCameras = cameras.filter(
      (cameraItem) =>
        cameraItem.status === "online" &&
        cameraItem.is_enabled &&
        cameraItem.video_url
    );

    if (!availableCameras.length) {
      setError(
        "Aucune caméra disponible pour l’analyse."
      );

      setSupervisionEnabled(false);
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setIncidentCameraId(null);
    setIncidentResult(null);
    setAnalysisResults({});
    setAlarmMuted(false);
    setIncidentAcknowledged(false);
    stopAlarm();

    try {
      for (const cameraItem of availableCameras) {
        setAnalyzingCameraId(cameraItem.id);

        try {
          const response = await fetch(
            `${CAMERAS_API_URL}/${cameraItem.id}/analyze`,
            {
              method: "POST",
              headers: {
                Accept: "application/json",
              },
            }
          );

          const result = await response.json();

          if (!response.ok) {
            throw new Error(
              result.detail ||
                `Échec de l’analyse de ${cameraItem.name}.`
            );
          }

          setAnalysisResults(
            (currentResults) => ({
              ...currentResults,
              [cameraItem.id]: result,
            })
          );

          if (result.has_incident) {
            setIncidentCameraId(
              cameraItem.id
            );

            setIncidentResult(result);
            startAlarm();
          }
        } catch (analysisError) {
          setAnalysisResults(
            (currentResults) => ({
              ...currentResults,
              [cameraItem.id]: {
                status: "error",
                message:
                  analysisError.message,
              },
            })
          );
        }
      }
    } finally {
      setAnalyzingCameraId(null);
      setIsAnalyzing(false);
    }
  };


  const toggleSupervision = async () => {
    if (supervisionEnabled) {
      setSupervisionEnabled(false);
      setIsAnalyzing(false);
      setAnalyzingCameraId(null);
      stopAlarm();
      return;
    }

    await prepareAudio();
    setSupervisionEnabled(true);
    await analyzeCameras();
  };


 const acknowledgeAlarm = async () => {
  if (
    !incidentResult?.incident_id ||
    acknowledgingIncident
  ) {
    return;
  }

  setAcknowledgingIncident(true);
  setError("");

  try {
    const response = await fetch(
      `${API_URL}/api/incidents/${incidentResult.incident_id}/acknowledge`,
      {
        method: "PATCH",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.detail ||
          "Impossible de prendre en charge l’incident."
      );
    }

    stopAlarm();
    setAlarmMuted(true);
    setIncidentAcknowledged(true);

    setIncidentResult(
      (currentResult) => ({
        ...currentResult,
        incident_status: result.status,
      })
    );
  } catch (requestError) {
    setError(
      requestError.message ||
        "Erreur pendant la prise en charge."
    );
  } finally {
    setAcknowledgingIncident(false);
  }
};


  useEffect(() => {
    loadCameras();
  }, [loadCameras]);


  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);


  useEffect(() => {
    const closeWithEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedCamera(null);
        setCameraFormOpen(false);
        setDisabledCamerasOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      closeWithEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        closeWithEscape
      );
    };
  }, []);


  useEffect(() => {
  return () => {
    stopAlarm();
  };
}, []);


  useEffect(() => {
    const incidentId = incidentResult?.incident_id;

    if (!incidentId) {
      return undefined;
    }

    const synchronizeIncidentStatus = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/incidents/${incidentId}`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          return;
        }

        const incident = await response.json();

        if (incident.status === "in_progress") {
          stopAlarm();
          setAlarmMuted(true);
          setIncidentAcknowledged(true);
        }

        if (incident.status === "resolved") {
          stopAlarm();
          setAlarmMuted(true);
          setIncidentAcknowledged(false);
          setIncidentCameraId(null);
          setIncidentResult(null);
        }
      } catch (requestError) {
        console.error(
          "Impossible de synchroniser l’incident :",
          requestError
        );
      }
    };

    synchronizeIncidentStatus();

    const synchronizationTimer = window.setInterval(
      synchronizeIncidentStatus,
      3000
    );

    return () => {
      window.clearInterval(synchronizationTimer);
    };
  }, [incidentResult?.incident_id]);

  const onlineCount = useMemo(
    () =>
      cameras.filter(
        (cameraItem) =>
          cameraItem.status === "online" &&
          cameraItem.is_enabled
      ).length,
    [cameras]
  );


  const incidentCount = incidentCameraId
    ? 1
    : 0;


  const getOriginalVideoUrl = (
    cameraItem
  ) => {
    if (!cameraItem.video_url) {
      return "";
    }

    return `${API_URL}${cameraItem.video_url}`;
  };


  const getDisplayedVideoUrl = (
    cameraItem
  ) => {
    const result =
      analysisResults[cameraItem.id];

    if (
      result?.status === "success" &&
      result.video_url
    ) {
      return `${API_URL}${result.video_url}`;
    }

    return getOriginalVideoUrl(cameraItem);
  };


  const openFullscreen = async (
    event,
    cameraItem
  ) => {
    event.stopPropagation();

    const card = event.currentTarget.closest(
      ".monitor-camera-card"
    );

    if (card?.requestFullscreen) {
      try {
        await card.requestFullscreen();
      } catch {
        setSelectedCamera(cameraItem);
      }
    } else {
      setSelectedCamera(cameraItem);
    }
  };


  const getCameraState = (
    cameraItem
  ) => {
    if (!cameraItem.is_enabled) {
      return {
        label: "Désactivée",
        className: "offline",
      };
    }

    if (
      analyzingCameraId === cameraItem.id
    ) {
      return {
        label: "Analyse en cours",
        className: "analyzing",
      };
    }

    if (
      incidentCameraId === cameraItem.id
    ) {
      return {
        label: "Incident détecté",
        className: "incident",
      };
    }

    if (
      cameraItem.status === "online" &&
      cameraItem.is_enabled
    ) {
      return {
        label: "En ligne",
        className: "online",
      };
    }

    return {
      label: "Hors ligne",
      className: "offline",
    };
  };


  return (
    <div className="camera-monitoring">
      <header className="camera-monitoring__header">
        <div>
          <p className="camera-monitoring__eyebrow">
            SUPERVISION VIDÉO INTELLIGENTE
          </p>

          <h1>Caméras de surveillance</h1>

          <p className="camera-monitoring__description">
            Surveillance continue des zones sensibles de Menara
            Prefa avec analyse automatique par intelligence
            artificielle.
          </p>
        </div>

        <div className="camera-monitoring__header-actions">
          <button
            className="camera-monitoring__disabled"
            type="button"
            onClick={() => {
              setError("");
              setManagementMessage("");
              setDisabledCamerasOpen(true);
            }}
            disabled={isAnalyzing}
          >
            <PowerOff size={18} />
            Désactivées ({disabledCameras.length})
          </button>

          <button
            className="camera-monitoring__add"
            type="button"
            onClick={() => {
              setError("");
              setManagementMessage("");
              setCameraFormOpen(true);
            }}
            disabled={isAnalyzing}
          >
            <Plus size={18} />
            Ajouter une caméra
          </button>

          <button
            className="camera-monitoring__refresh"
            type="button"
            onClick={loadCameras}
            disabled={loading || isAnalyzing}
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "is-spinning"
                  : ""
              }
            />
            Actualiser
          </button>

          <button
            className={`camera-monitoring__supervision ${
              supervisionEnabled
                ? "is-enabled"
                : ""
            }`}
            type="button"
            onClick={toggleSupervision}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <LoaderCircle
                size={18}
                className="is-spinning"
              />
            ) : (
              <Power size={18} />
            )}

            {isAnalyzing
              ? "Analyse des caméras..."
              : supervisionEnabled
                ? "Arrêter la supervision"
                : "Activer la supervision IA"}
          </button>
        </div>
      </header>


      <section className="camera-monitoring__overview">
        <article className="monitor-overview-card">
          <span className="monitor-overview-card__icon monitor-overview-card__icon--blue">
            <Camera size={21} />
          </span>

          <div>
            <span>Caméras configurées</span>
            <strong>{cameras.length}</strong>
            <small>Zones industrielles surveillées</small>
          </div>
        </article>

        <article className="monitor-overview-card">
          <span className="monitor-overview-card__icon monitor-overview-card__icon--green">
            <Wifi size={21} />
          </span>

          <div>
            <span>Caméras en ligne</span>
            <strong>
              {onlineCount}/{cameras.length || 0}
            </strong>
            <small>Connexion opérationnelle</small>
          </div>
        </article>

        <article className="monitor-overview-card">
          <span className="monitor-overview-card__icon monitor-overview-card__icon--red">
            <BellRing size={21} />
          </span>

          <div>
            <span>Incidents actifs</span>
            <strong>{incidentCount}</strong>
            <small>
              {incidentCount
                ? "Intervention nécessaire"
                : "Aucune alerte en cours"}
            </small>
          </div>
        </article>

        <article className="monitor-overview-card">
          <span className="monitor-overview-card__icon monitor-overview-card__icon--purple">
            <Activity size={21} />
          </span>

          <div>
            <span>Analyse intelligente</span>

            <strong className="monitor-overview-card__text-value">
              {isAnalyzing
                ? "Analyse..."
                : supervisionEnabled
                  ? "Active"
                  : "Arrêtée"}
            </strong>

            <small>Modèle YOLO feu et fumée</small>
          </div>
        </article>
      </section>


      <section className="camera-monitoring__toolbar">
        <div className="camera-monitoring__system-status">
          <span className="camera-monitoring__system-icon">
            <ShieldCheck size={20} />
          </span>

          <div>
            <strong>
              Centre de supervision opérationnel
            </strong>

            <span>
              {isAnalyzing
                ? "Analyse intelligente des flux en cours"
                : "Flux connectés au backend IA"}
            </span>
          </div>
        </div>

        <div className="camera-monitoring__clock">
          <Clock3 size={17} />

          <div>
            <strong>
              {formatCurrentTime(currentDate)}
            </strong>

            <span>
              {formatCurrentDate(currentDate)}
            </span>
          </div>
        </div>
      </section>


      {error && (
        <div className="camera-monitoring__error">
          <Server size={19} />
          {error}
        </div>
      )}

      {managementMessage && (
        <div className="camera-monitoring__success">
          <ShieldCheck size={19} />
          {managementMessage}
        </div>
      )}


      {loading ? (
        <div className="camera-monitoring__loading">
          <LoaderCircle
            size={34}
            className="is-spinning"
          />

          <strong>
            Connexion aux caméras...
          </strong>

          <span>
            Initialisation des flux de surveillance
          </span>
        </div>
      ) : (
        <section className="camera-monitoring__grid">
          {cameras.map((cameraItem) => {
            const cameraState =
              getCameraState(cameraItem);

            const videoUrl =
              getDisplayedVideoUrl(cameraItem);

            const result =
              analysisResults[cameraItem.id];

            return (
              <article
                className={`monitor-camera-card monitor-camera-card--${cameraState.className}`}
                key={cameraItem.id}
                onClick={() =>
                  setSelectedCamera(cameraItem)
                }
              >
                <div className="monitor-camera-card__video">
                  {videoUrl ? (
                    <video
                      key={videoUrl}
                      src={videoUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <div className="monitor-camera-card__unavailable">
                      <Video size={38} />
                      <strong>
                        Flux indisponible
                      </strong>
                    </div>
                  )}

                  <div className="monitor-camera-card__video-overlay" />

                  <div className="monitor-camera-card__topbar">
                    <span className="monitor-camera-card__live">
                      <i />
                      EN DIRECT
                    </span>

                    <span
                      className={`monitor-camera-card__state monitor-camera-card__state--${cameraState.className}`}
                    >
                      {cameraState.label}
                    </span>
                  </div>

                  <div className="monitor-camera-card__timestamp">
                    <Clock3 size={13} />
                    {formatCurrentTime(currentDate)}
                  </div>

                  <button
                    className="monitor-camera-card__expand"
                    type="button"
                    title="Afficher en plein écran"
                    onClick={(event) =>
                      openFullscreen(
                        event,
                        cameraItem
                      )
                    }
                  >
                    <Expand size={17} />
                  </button>

                  {analyzingCameraId ===
                    cameraItem.id && (
                    <div className="monitor-camera-card__incident">
                      <LoaderCircle
                        size={25}
                        className="is-spinning"
                      />

                      <div>
                        <strong>
                          Analyse IA en cours
                        </strong>

                        <span>
                          Recherche de feu et de fumée
                        </span>
                      </div>
                    </div>
                  )}

                  {cameraState.className ===
                    "incident" && (
                    <div className="monitor-camera-card__incident">
                      <BellRing size={25} />

                      <div>
                        <strong>
                          Incident détecté
                        </strong>

                        <span>
                          Feu ou fumée confirmé par YOLO
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="monitor-camera-card__content">
                  <div className="monitor-camera-card__identity">
                    <span className="monitor-camera-card__camera-icon">
                      <Camera size={18} />
                    </span>

                    <div>
                      <h2>{cameraItem.name}</h2>
                      <span>{cameraItem.code}</span>
                    </div>
                  </div>

                  <div className="monitor-camera-card__location">
                    <MapPin size={15} />
                    {cameraItem.location}
                  </div>

                  <div className="monitor-camera-card__footer">
                    <span>
                      <Activity size={14} />

                      {result?.has_incident
                        ? `Incident confirmé · ${Math.round(
                            result.maximum_confidence *
                              100
                          )} %`
                        : result?.status === "success"
                          ? "Analyse terminée · Zone normale"
                          : supervisionEnabled
                            ? "Analyse IA active"
                            : "Analyse IA inactive"}
                    </span>

                    <button
                      className="monitor-camera-card__toggle"
                      type="button"
                      disabled={
                        updatingCameraId === cameraItem.id ||
                        isAnalyzing
                      }
                      onClick={(event) =>
                        toggleCameraAvailability(
                          event,
                          cameraItem
                        )
                      }
                    >
                      {updatingCameraId === cameraItem.id ? (
                        <LoaderCircle
                          size={15}
                          className="is-spinning"
                        />
                      ) : cameraItem.is_enabled ? (
                        <PowerOff size={15} />
                      ) : (
                        <Power size={15} />
                      )}

                      {cameraItem.is_enabled
                        ? "Désactiver"
                        : "Activer"}
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedCamera(
                          cameraItem
                        );
                      }}
                    >
                      <Eye size={15} />
                      Consulter
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}


      {disabledCamerasOpen && (
        <div
          className="camera-management-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setDisabledCamerasOpen(false)}
        >
          <section
            className="camera-management-modal__content"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="camera-management-modal__header">
              <div>
                <span>GESTION DES SOURCES VIDÉO</span>
                <h2>Caméras désactivées</h2>
                <p>
                  Réactivez une caméra pour la remettre dans la
                  surveillance.
                </p>
              </div>

              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setDisabledCamerasOpen(false)}
              >
                <X size={21} />
              </button>
            </header>

            <div className="disabled-camera-list">
              {disabledCameras.length === 0 ? (
                <div className="disabled-camera-list__empty">
                  <ShieldCheck size={28} />
                  <strong>Aucune caméra désactivée</strong>
                  <span>
                    Toutes les caméras disponibles sont visibles.
                  </span>
                </div>
              ) : (
                disabledCameras.map((cameraItem) => (
                  <article
                    className="disabled-camera-item"
                    key={cameraItem.id}
                  >
                    <span className="disabled-camera-item__icon">
                      <Camera size={19} />
                    </span>

                    <div className="disabled-camera-item__content">
                      <strong>{cameraItem.name}</strong>
                      <span>
                        {cameraItem.code} · {cameraItem.location}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={
                        updatingCameraId === cameraItem.id
                      }
                      onClick={(event) =>
                        toggleCameraAvailability(
                          event,
                          cameraItem
                        )
                      }
                    >
                      {updatingCameraId === cameraItem.id ? (
                        <LoaderCircle
                          size={16}
                          className="is-spinning"
                        />
                      ) : (
                        <Power size={16} />
                      )}
                      Réactiver
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}


      {cameraFormOpen && (
        <div
          className="camera-management-modal"
          role="dialog"
          aria-modal="true"
          onClick={closeCameraForm}
        >
          <form
            className="camera-management-modal__content"
            onClick={(event) => event.stopPropagation()}
            onSubmit={createNewCamera}
          >
            <header className="camera-management-modal__header">
              <div>
                <span>NOUVELLE SOURCE VIDÉO</span>
                <h2>Ajouter une caméra</h2>
                <p>
                  Configurez une nouvelle zone de surveillance.
                </p>
              </div>

              <button
                type="button"
                aria-label="Fermer"
                onClick={closeCameraForm}
                disabled={savingCamera}
              >
                <X size={21} />
              </button>
            </header>

            <div className="camera-management-modal__grid">
              <label>
                <span>Code de la caméra</span>
                <input
                  required
                  minLength={2}
                  maxLength={50}
                  placeholder="CAM-PRD-06"
                  value={cameraForm.code}
                  onChange={(event) =>
                    updateCameraForm(
                      "code",
                      event.target.value
                    )
                  }
                />
              </label>

              <label>
                <span>État initial</span>
                <select
                  value={cameraForm.status}
                  onChange={(event) =>
                    updateCameraForm(
                      "status",
                      event.target.value
                    )
                  }
                >
                  <option value="online">En ligne</option>
                  <option value="offline">Hors ligne</option>
                </select>
              </label>

              <label className="camera-management-modal__wide">
                <span>Nom de la caméra</span>
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="Caméra Zone Production"
                  value={cameraForm.name}
                  onChange={(event) =>
                    updateCameraForm(
                      "name",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="camera-management-modal__wide">
                <span>Zone surveillée</span>
                <input
                  required
                  minLength={2}
                  maxLength={160}
                  placeholder="Atelier principal"
                  value={cameraForm.location}
                  onChange={(event) =>
                    updateCameraForm(
                      "location",
                      event.target.value
                    )
                  }
                />
              </label>

              <label className="camera-management-modal__wide">
                <span>URL du flux ou de la vidéo (facultatif)</span>
                <input
                  placeholder="/media/cameras/camera_production.mp4"
                  value={cameraForm.video_url}
                  onChange={(event) =>
                    updateCameraForm(
                      "video_url",
                      event.target.value
                    )
                  }
                />
                <small>
                  Sans URL, la caméra sera enregistrée avec un flux indisponible.
                </small>
              </label>
            </div>

            <footer className="camera-management-modal__actions">
              <button
                className="camera-management-modal__cancel"
                type="button"
                onClick={closeCameraForm}
                disabled={savingCamera}
              >
                Annuler
              </button>

              <button
                className="camera-management-modal__save"
                type="submit"
                disabled={savingCamera}
              >
                {savingCamera ? (
                  <LoaderCircle
                    size={17}
                    className="is-spinning"
                  />
                ) : (
                  <Plus size={17} />
                )}

                {savingCamera
                  ? "Enregistrement..."
                  : "Ajouter la caméra"}
              </button>
            </footer>
          </form>
        </div>
      )}


      {selectedCamera && (
        <div
          className="camera-modal"
          role="dialog"
          aria-modal="true"
          onClick={() =>
            setSelectedCamera(null)
          }
        >
          <article
            className="camera-modal__content"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <header className="camera-modal__header">
              <div>
                <span className="camera-modal__live">
                  <i />
                  CAMÉRA EN DIRECT
                </span>

                <h2>
                  {selectedCamera.name}
                </h2>

                <p>
                  {selectedCamera.code} ·{" "}
                  {selectedCamera.location}
                </p>
              </div>

              <button
                type="button"
                aria-label="Fermer"
                onClick={() =>
                  setSelectedCamera(null)
                }
              >
                <X size={21} />
              </button>
            </header>

            <div className="camera-modal__video">
              <video
                key={getDisplayedVideoUrl(
                  selectedCamera
                )}
                src={getDisplayedVideoUrl(
                  selectedCamera
                )}
                autoPlay
                muted
                loop
                playsInline
                controls
              />

              <span>
                <Clock3 size={14} />
                {formatCurrentTime(currentDate)}
              </span>
            </div>

            <footer className="camera-modal__footer">
              <div>
                <Wifi size={17} />

                <span>
                  <strong>
                    {selectedCamera.status ===
                    "online"
                      ? "Connexion stable"
                      : "Caméra hors ligne"}
                  </strong>

                  Flux vidéo de surveillance
                </span>
              </div>

              <div>
                <Activity size={17} />

                <span>
                  <strong>
                    {incidentCameraId ===
                    selectedCamera.id
                      ? "Incident confirmé"
                      : supervisionEnabled
                        ? "Analyse IA active"
                        : "Analyse IA arrêtée"}
                  </strong>

                  Détection feu et fumée
                </span>
              </div>
            </footer>
          </article>
        </div>
      )}


      {incidentCameraId && !incidentAcknowledged && (
        <aside className="camera-alarm">
          <span className="camera-alarm__icon">
            <BellRing size={24} />
          </span>

          <div>
            <strong>
              Alerte incendie critique
            </strong>

            <span>
              {incidentResult?.camera_name} —{" "}
              {incidentResult?.camera_location}
            </span>
          </div>

          <button
  type="button"
  onClick={acknowledgeAlarm}
  disabled={
    acknowledgingIncident ||
    incidentAcknowledged
  }
>
  {acknowledgingIncident ? (
    <>
      <LoaderCircle
        size={16}
        className="is-spinning"
      />
      Traitement...
    </>
  ) : incidentAcknowledged ? (
    <>
      <ShieldCheck size={16} />
      Pris en charge
    </>
  ) : (
    <>
      <ShieldCheck size={16} />
      Prendre en charge
    </>
  )}
</button>
        </aside>
      )}
    </div>
  );
}


export default CameraMonitoring;