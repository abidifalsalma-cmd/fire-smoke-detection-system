import { useEffect, useState } from "react";
import {
  BellRing,
  Camera,
  Check,
  Gauge,
  Monitor,
  Moon,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Video,
  Volume2,
} from "lucide-react";

import api from "../services/api";
import "./Parametres.css";

const DEFAULT_SETTINGS = {
  confidence: 25,
  imageSize: 640,
  videoStride: 3,
  alarmEnabled: true,
  alarmVolume: 100,
  alarmDuration: 30,
  automaticAnalysis: true,
  saveMedia: true,
  theme: "light",
};

function Parametres() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [camerasLoading, setCamerasLoading] = useState(true);
  const [camerasError, setCamerasError] = useState("");

  useEffect(() => {
    let componentIsActive = true;

    async function loadCameras() {
      setCamerasLoading(true);
      setCamerasError("");

      try {
        const response = await api.get(
          "/api/cameras?include_disabled=true"
        );

        if (componentIsActive) {
          setCameras(response.data);
        }
      } catch (error) {
        if (componentIsActive) {
          setCamerasError(
            error.response?.data?.detail
              || "Impossible de charger les caméras."
          );
        }
      } finally {
        if (componentIsActive) {
          setCamerasLoading(false);
        }
      }
    }

    loadCameras();

    return () => {
      componentIsActive = false;
    };
  }, []);

  const configuredCameras = cameras.length;

  const onlineCameras = cameras.filter(
    (camera) =>
      camera.is_enabled
      && camera.status === "online"
  ).length;

  const offlineCameras = cameras.filter(
    (camera) =>
      camera.is_enabled
      && camera.status !== "online"
  ).length;

  const disabledCameras = cameras.filter(
    (camera) => !camera.is_enabled
  ).length;

  useEffect(() => {
    const storedSettings = localStorage.getItem(
      "menara-fire-settings"
    );

    if (storedSettings) {
      try {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...JSON.parse(storedSettings),
        });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, []);

  useEffect(() => {
    const systemTheme = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    function applyTheme() {
      const activeTheme =
        settings.theme === "system"
          ? systemTheme.matches
            ? "dark"
            : "light"
          : settings.theme;

      document.documentElement.setAttribute(
        "data-theme",
        activeTheme
      );
    }

    applyTheme();

    if (settings.theme === "system") {
      systemTheme.addEventListener("change", applyTheme);
    }

    return () => {
      systemTheme.removeEventListener("change", applyTheme);
    };
  }, [settings.theme]);

  function updateSetting(name, value) {
    setSettings((currentSettings) => {
      const nextSettings = {
        ...currentSettings,
        [name]: value,
      };

      // Le thème doit être conservé immédiatement, même si
      // l'utilisateur change de page sans cliquer sur Enregistrer.
      if (name === "theme") {
        localStorage.setItem(
          "menara-fire-settings",
          JSON.stringify(nextSettings)
        );
      }

      return nextSettings;
    });

    setSaved(false);
  }

  function saveSettings() {
    localStorage.setItem(
      "menara-fire-settings",
      JSON.stringify(settings)
    );

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 2500);
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem("menara-fire-settings");
    setSaved(false);
  }

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <div>
          <p className="settings-page__eyebrow">
            CONFIGURATION DU SYSTÈME
          </p>

          <h1>Paramètres</h1>

          <p className="settings-page__description">
            Configurez la détection intelligente, le traitement
            vidéo et les alertes du centre de supervision.
          </p>
        </div>

        <div className="settings-page__actions">
          <button
            className="settings-page__reset"
            onClick={resetSettings}
            type="button"
          >
            <RefreshCw size={17} />
            Restaurer
          </button>

          <button
            className="settings-page__save"
            onClick={saveSettings}
            type="button"
          >
            {saved ? (
              <Check size={18} />
            ) : (
              <Save size={18} />
            )}

            {saved
              ? "Paramètres enregistrés"
              : "Enregistrer"}
          </button>
        </div>
      </header>

      <section className="settings-status">
        <span className="settings-status__icon">
          <ShieldCheck size={23} />
        </span>

        <div>
          <strong>Système correctement configuré</strong>
          <span>
            Les paramètres sont appliqués à la supervision
            Menara Fire Safety.
          </span>
        </div>

        <span className="settings-status__badge">
          Opérationnel
        </span>
      </section>

      <div className="settings-grid">
        <section className="settings-card">
          <header className="settings-card__header">
            <span className="settings-card__icon settings-card__icon--blue">
              <Settings2 size={21} />
            </span>

            <div>
              <h2>Modèle de détection</h2>
              <p>Configuration du modèle YOLO chargé</p>
            </div>
          </header>

          <div className="settings-model">
            <div>
              <span>Modèle actif</span>
              <strong>best.pt</strong>
            </div>

            <span className="settings-model__badge">
              Chargé
            </span>
          </div>

          <div className="settings-field">
            <div className="settings-field__heading">
              <div>
                <label htmlFor="confidence">
                  Seuil de confiance
                </label>

                <small>
                  Niveau minimal pour confirmer une détection
                </small>
              </div>

              <strong>{settings.confidence} %</strong>
            </div>

            <input
              id="confidence"
              max="90"
              min="10"
              onChange={(event) =>
                updateSetting(
                  "confidence",
                  Number(event.target.value)
                )
              }
              step="5"
              type="range"
              value={settings.confidence}
            />

            <div className="settings-scale">
              <span>Plus sensible</span>
              <span>Plus précis</span>
            </div>
          </div>

          <div className="settings-field">
            <label htmlFor="image-size">
              Résolution d’analyse
            </label>

            <select
              id="image-size"
              onChange={(event) =>
                updateSetting(
                  "imageSize",
                  Number(event.target.value)
                )
              }
              value={settings.imageSize}
            >
              <option value={416}>416 px — Rapide</option>
              <option value={640}>640 px — Recommandé</option>
              <option value={960}>960 px — Haute précision</option>
            </select>
          </div>

          <div className="settings-information">
            <Gauge size={18} />

            <div>
              <strong>Classes détectées</strong>
              <span>Feu et fumée</span>
            </div>

            <span>YOLO</span>
          </div>
        </section>

        <section className="settings-card">
          <header className="settings-card__header">
            <span className="settings-card__icon settings-card__icon--orange">
              <Video size={21} />
            </span>

            <div>
              <h2>Optimisation vidéo</h2>
              <p>Équilibre entre rapidité et précision</p>
            </div>
          </header>

          <div className="settings-field">
            <label htmlFor="video-stride">
              Fréquence d’analyse
            </label>

            <select
              id="video-stride"
              onChange={(event) =>
                updateSetting(
                  "videoStride",
                  Number(event.target.value)
                )
              }
              value={settings.videoStride}
            >
              <option value={1}>
                Toutes les images — Précision maximale
              </option>

              <option value={2}>
                Une image sur 2 — Équilibré
              </option>

              <option value={3}>
                Une image sur 3 — Recommandé
              </option>

              <option value={5}>
                Une image sur 5 — Traitement rapide
              </option>
            </select>
          </div>

          <div className="settings-toggle-row">
            <div>
              <strong>Analyse automatique</strong>
              <span>
                Analyser les flux des caméras configurées
              </span>
            </div>

            <label className="settings-switch">
              <input
                checked={settings.automaticAnalysis}
                onChange={(event) =>
                  updateSetting(
                    "automaticAnalysis",
                    event.target.checked
                  )
                }
                type="checkbox"
              />
              <span />
            </label>
          </div>

          <div className="settings-toggle-row">
            <div>
              <strong>Conserver les médias annotés</strong>
              <span>
                Enregistrer les preuves dans l’historique
              </span>
            </div>

            <label className="settings-switch">
              <input
                checked={settings.saveMedia}
                onChange={(event) =>
                  updateSetting(
                    "saveMedia",
                    event.target.checked
                  )
                }
                type="checkbox"
              />
              <span />
            </label>
          </div>

          <div className="settings-performance">
            <SlidersHorizontal size={19} />

            <div>
              <strong>Mode recommandé</strong>
              <span>
                640 px avec analyse d’une image sur 3
              </span>
            </div>
          </div>
        </section>

        <section className="settings-card">
          <header className="settings-card__header">
            <span className="settings-card__icon settings-card__icon--red">
              <BellRing size={21} />
            </span>

            <div>
              <h2>Alarme d’urgence</h2>
              <p>Signal sonore des incidents critiques</p>
            </div>
          </header>

          <div className="settings-toggle-row">
            <div>
              <strong>Sirène d’incendie</strong>
              <span>
                Déclenchement automatique en cas d’incident
              </span>
            </div>

            <label className="settings-switch">
              <input
                checked={settings.alarmEnabled}
                onChange={(event) =>
                  updateSetting(
                    "alarmEnabled",
                    event.target.checked
                  )
                }
                type="checkbox"
              />
              <span />
            </label>
          </div>

          <div
            className={
              settings.alarmEnabled
                ? "settings-alarm-options"
                : "settings-alarm-options settings-alarm-options--disabled"
            }
          >
            <div className="settings-field">
              <div className="settings-field__heading">
                <div>
                  <label htmlFor="alarm-volume">
                    Volume de la sirène
                  </label>
                  <small>Volume du poste de supervision</small>
                </div>

                <strong>{settings.alarmVolume} %</strong>
              </div>

              <input
                disabled={!settings.alarmEnabled}
                id="alarm-volume"
                max="100"
                min="10"
                onChange={(event) =>
                  updateSetting(
                    "alarmVolume",
                    Number(event.target.value)
                  )
                }
                step="10"
                type="range"
                value={settings.alarmVolume}
              />
            </div>

            <div className="settings-field">
              <label htmlFor="alarm-duration">
                Durée avant répétition
              </label>

              <select
                disabled={!settings.alarmEnabled}
                id="alarm-duration"
                onChange={(event) =>
                  updateSetting(
                    "alarmDuration",
                    Number(event.target.value)
                  )
                }
                value={settings.alarmDuration}
              >
                <option value={15}>15 secondes</option>
                <option value={30}>30 secondes</option>
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
              </select>
            </div>
          </div>

          <div className="settings-alarm-file">
            <Volume2 size={19} />

            <div>
              <strong>Fichier sonore actif</strong>
              <span>urgent-alarm.wav</span>
            </div>

            <span>Prêt</span>
          </div>
        </section>

        <section className="settings-card">
          <header className="settings-card__header">
            <span className="settings-card__icon settings-card__icon--green">
              <Camera size={21} />
            </span>

            <div>
              <h2>Infrastructure caméra</h2>
              <p>État du dispositif de surveillance</p>
            </div>
          </header>

          <div
            className="settings-camera-summary"
            style={{
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
            }}
          >
            <article>
              <span>Caméras configurées</span>
              <strong>
                {camerasLoading ? "—" : configuredCameras}
              </strong>
            </article>

            <article>
              <span>Caméras en ligne</span>
              <strong className="settings-value--success">
                {camerasLoading ? "—" : onlineCameras}
              </strong>
            </article>

            <article>
              <span>Hors ligne</span>
              <strong className="settings-value--danger">
                {camerasLoading ? "—" : offlineCameras}
              </strong>
            </article>

            <article>
              <span>Caméras désactivées</span>
              <strong className="settings-value--danger">
                {camerasLoading ? "—" : disabledCameras}
              </strong>
            </article>
          </div>

          <div className="settings-camera-list">
            {camerasLoading && (
              <div>
                <span className="settings-camera-dot settings-camera-dot--offline" />
                <span>Chargement des caméras...</span>
                <strong>Patientez</strong>
              </div>
            )}

            {!camerasLoading && camerasError && (
              <div>
                <span className="settings-camera-dot settings-camera-dot--offline" />
                <span>{camerasError}</span>
                <strong>Erreur</strong>
              </div>
            )}

            {!camerasLoading
              && !camerasError
              && cameras.map((camera) => {
                const isOnline =
                  camera.is_enabled
                  && camera.status === "online";

                const displayedStatus = !camera.is_enabled
                  ? "Désactivée"
                  : isOnline
                    ? "En ligne"
                    : "Hors ligne";

                return (
                  <div key={camera.id}>
                    <span
                      className={
                        isOnline
                          ? "settings-camera-dot settings-camera-dot--online"
                          : "settings-camera-dot settings-camera-dot--offline"
                      }
                    />

                    <span>{camera.name}</span>
                    <strong>{displayedStatus}</strong>
                  </div>
                );
              })}

            {!camerasLoading
              && !camerasError
              && cameras.length === 0
              && (
                <div>
                  <span className="settings-camera-dot settings-camera-dot--offline" />
                  <span>Aucune caméra configurée</span>
                  <strong>Vide</strong>
                </div>
              )}
          </div>
        </section>

        <section
          className="settings-card settings-card--appearance"
          style={{ order: -1 }}
        >
          <header className="settings-card__header">
            <span className="settings-card__icon settings-card__icon--purple">
              <Sun size={21} />
            </span>

            <div>
              <h2>Apparence de l’interface</h2>
              <p>
                Adaptez l’affichage au poste de supervision
              </p>
            </div>
          </header>

          <div
            aria-label="Thème de l’interface"
            className="settings-theme-selector"
            role="radiogroup"
          >
            <button
              aria-checked={settings.theme === "light"}
              className={
                settings.theme === "light"
                  ? "settings-theme-option settings-theme-option--active"
                  : "settings-theme-option"
              }
              onClick={() => updateSetting("theme", "light")}
              role="radio"
              type="button"
            >
              <span className="settings-theme-option__icon">
                <Sun size={22} />
              </span>

              <span>
                <strong>Mode clair</strong>
                <small>Affichage lumineux pour la journée</small>
              </span>

              {settings.theme === "light" && (
                <Check size={18} />
              )}
            </button>

            <button
              aria-checked={settings.theme === "dark"}
              className={
                settings.theme === "dark"
                  ? "settings-theme-option settings-theme-option--active"
                  : "settings-theme-option"
              }
              onClick={() => updateSetting("theme", "dark")}
              role="radio"
              type="button"
            >
              <span className="settings-theme-option__icon">
                <Moon size={22} />
              </span>

              <span>
                <strong>Mode sombre</strong>
                <small>Confort visuel en salle de contrôle</small>
              </span>

              {settings.theme === "dark" && (
                <Check size={18} />
              )}
            </button>

            <button
              aria-checked={settings.theme === "system"}
              className={
                settings.theme === "system"
                  ? "settings-theme-option settings-theme-option--active"
                  : "settings-theme-option"
              }
              onClick={() => updateSetting("theme", "system")}
              role="radio"
              type="button"
            >
              <span className="settings-theme-option__icon">
                <Monitor size={22} />
              </span>

              <span>
                <strong>Automatique</strong>
                <small>Suit le thème configuré dans Windows</small>
              </span>

              {settings.theme === "system" && (
                <Check size={18} />
              )}
            </button>
          </div>

          <div className="settings-appearance-information">
            <Monitor size={18} />

            <div>
              <strong>Application immédiate</strong>
              <span>
                Le changement est visible sans redémarrer
                l’application.
              </span>
            </div>
          </div>
        </section>
      </div>

      <p className="settings-page__note">
        Les réglages sont enregistrés localement pour cette version
        de démonstration. Leur connexion au backend sera réalisée
        dans l’étape suivante.
      </p>
    </div>
  );
}

export default Parametres;
