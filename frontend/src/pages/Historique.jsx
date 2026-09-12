import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Download,
  Eye,
  FileImage,
  Film,
  Flame,
  History as HistoryIcon,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";

import "./Historique.css";

const BACKEND_URL = "http://127.0.0.1:8001";
const INCIDENTS_API_URL = `${BACKEND_URL}/api/incidents`;
const CAMERAS_API_URL = `${BACKEND_URL}/api/cameras`;

function formatDate(value) {
  if (!value) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getIncidentTitle(incident) {
  if (incident.detected_fire && incident.detected_smoke) {
    return "Feu et fumée détectés";
  }

  if (incident.detected_fire) return "Feu détecté";
  if (incident.detected_smoke) return "Fumée détectée";
  return "Événement de sécurité";
}

function getSeverityLabel(severity) {
  return {
    critical: "Critique",
    high: "Élevée",
    medium: "Moyenne",
    low: "Faible",
  }[severity] || "Non classée";
}

function getStatusLabel(status) {
  return {
    active: "Actif",
    in_progress: "Pris en charge",
    resolved: "Résolu",
  }[status] || status;
}

function getSourceLabel(sourceType) {
  if (sourceType === "camera") return "Caméra automatique";
  if (sourceType === "video") return "Vidéo importée";
  return "Image importée";
}

function getSourceIcon(sourceType) {
  if (sourceType === "camera") return Camera;
  if (sourceType === "video") return Film;
  return FileImage;
}

function Historique() {
  const [incidents, setIncidents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [cameraId, setCameraId] = useState("all");
  const [status, setStatus] = useState("all");
  const [incidentType, setIncidentType] = useState("all");
  const [sourceType, setSourceType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIncident, setSelectedIncident] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [incidentsResponse, camerasResponse] = await Promise.all([
        fetch(`${INCIDENTS_API_URL}?limit=500`),
        fetch(CAMERAS_API_URL),
      ]);

      if (!incidentsResponse.ok) {
        throw new Error("Impossible de récupérer l’historique des incidents.");
      }

      const incidentsData = await incidentsResponse.json();
      const camerasData = camerasResponse.ok
        ? await camerasResponse.json()
        : [];

      setIncidents(incidentsData);
      setCameras(camerasData);
    } catch (requestError) {
      setError(
        requestError.message ||
          "Une erreur est survenue pendant le chargement."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredIncidents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return incidents.filter((incident) => {
      const camera = cameras.find(
        (item) => item.id === incident.camera_id
      );

      const searchableContent = [
        incident.id,
        incident.location,
        incident.original_filename,
        camera?.name,
        camera?.code,
        getIncidentTitle(incident),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const createdDate = new Date(incident.created_at);
      const matchesSearch =
        !normalizedSearch || searchableContent.includes(normalizedSearch);
      const matchesCamera =
        cameraId === "all" || String(incident.camera_id) === cameraId;
      const matchesStatus = status === "all" || incident.status === status;
      const matchesSource =
        sourceType === "all" ||
        (sourceType === "camera" && incident.source_type === "camera") ||
        (sourceType === "manual" && incident.source_type !== "camera");
      const matchesType =
        incidentType === "all" ||
        (incidentType === "fire" && incident.detected_fire) ||
        (incidentType === "smoke" && incident.detected_smoke);
      const matchesStartDate =
        !startDate || createdDate >= new Date(`${startDate}T00:00:00`);
      const matchesEndDate =
        !endDate || createdDate <= new Date(`${endDate}T23:59:59`);

      return (
        matchesSearch &&
        matchesCamera &&
        matchesStatus &&
        matchesSource &&
        matchesType &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [
    cameraId,
    cameras,
    endDate,
    incidentType,
    incidents,
    search,
    sourceType,
    startDate,
    status,
  ]);

  const resetFilters = () => {
    setSearch("");
    setCameraId("all");
    setStatus("all");
    setIncidentType("all");
    setSourceType("all");
    setStartDate("");
    setEndDate("");
  };

  const exportCsv = () => {
    const headers = [
      "ID",
      "Date",
      "Zone",
      "Source",
      "Feu",
      "Fumée",
      "Confiance",
      "Sévérité",
      "Statut",
    ];

    const rows = filteredIncidents.map((incident) => [
      incident.id,
      formatDate(incident.created_at),
      incident.location,
      getSourceLabel(incident.source_type),
      incident.fire_count,
      incident.smoke_count,
      `${(incident.maximum_confidence * 100).toFixed(1)} %`,
      getSeverityLabel(incident.severity),
      getStatusLabel(incident.status),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(";")
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historique-incidents-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resolvedCount = incidents.filter(
    (incident) => incident.status === "resolved"
  ).length;
  const criticalCount = incidents.filter(
    (incident) => incident.severity === "critical"
  ).length;

  return (
    <div className="history-page">
      <header className="history-page__header">
        <div>
          <p className="history-page__eyebrow">ANALYSE ET TRAÇABILITÉ</p>
          <h1>Historique des incidents</h1>
          <p>
            Consultez la chronologie complète des détections et des
            interventions réalisées sur le site Menara Prefa.
          </p>
        </div>

        <div className="history-page__actions">
          <button type="button" onClick={loadData} disabled={loading}>
            <RefreshCw
              size={17}
              className={loading ? "is-spinning" : ""}
            />
            Actualiser
          </button>
          <button
            type="button"
            className="history-page__export"
            onClick={exportCsv}
            disabled={!filteredIncidents.length}
          >
            <Download size={17} />
            Exporter CSV
          </button>
        </div>
      </header>

      <section className="history-kpis">
        <article>
          <span className="history-kpis__icon history-kpis__icon--blue">
            <HistoryIcon size={21} />
          </span>
          <div><span>Incidents enregistrés</span><strong>{incidents.length}</strong></div>
        </article>
        <article>
          <span className="history-kpis__icon history-kpis__icon--red">
            <CircleAlert size={21} />
          </span>
          <div><span>Incidents critiques</span><strong>{criticalCount}</strong></div>
        </article>
        <article>
          <span className="history-kpis__icon history-kpis__icon--green">
            <CheckCircle2 size={21} />
          </span>
          <div><span>Incidents résolus</span><strong>{resolvedCount}</strong></div>
        </article>
        <article>
          <span className="history-kpis__icon history-kpis__icon--violet">
            <ShieldCheck size={21} />
          </span>
          <div>
            <span>Taux de résolution</span>
            <strong>
              {incidents.length
                ? `${Math.round((resolvedCount / incidents.length) * 100)} %`
                : "0 %"}
            </strong>
          </div>
        </article>
      </section>

      <section className="history-filters">
        <div className="history-filters__title">
          <span><SlidersHorizontal size={19} /></span>
          <div><strong>Recherche avancée</strong><small>Affinez la chronologie affichée</small></div>
        </div>

        <label className="history-search">
          <Search size={17} />
          <input
            type="search"
            placeholder="Rechercher un incident, une zone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <select value={cameraId} onChange={(event) => setCameraId(event.target.value)}>
          <option value="all">Toutes les caméras</option>
          {cameras.map((camera) => (
            <option key={camera.id} value={camera.id}>{camera.name}</option>
          ))}
        </select>

        <select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
          <option value="all">Toutes les sources</option>
          <option value="camera">Caméras automatiques</option>
          <option value="manual">Surveillance manuelle</option>
        </select>

        <select value={incidentType} onChange={(event) => setIncidentType(event.target.value)}>
          <option value="all">Feu et fumée</option>
          <option value="fire">Détections de feu</option>
          <option value="smoke">Détections de fumée</option>
        </select>

        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="in_progress">Pris en charge</option>
          <option value="resolved">Résolus</option>
        </select>

        <label className="history-date">
          <CalendarDays size={16} />
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label className="history-date">
          <CalendarDays size={16} />
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>

        <button type="button" className="history-filters__reset" onClick={resetFilters}>
          <X size={16} /> Réinitialiser
        </button>
      </section>

      <section className="history-list">
        <header>
          <div>
            <h2>Journal des événements</h2>
            <p>{filteredIncidents.length} incident(s) correspondant aux filtres</p>
          </div>
        </header>

        {error && <div className="history-state history-state--error"><AlertTriangle size={20} />{error}</div>}

        {loading ? (
          <div className="history-state"><LoaderCircle className="is-spinning" size={24} />Chargement de l’historique...</div>
        ) : filteredIncidents.length === 0 ? (
          <div className="history-empty">
            <ShieldCheck size={30} />
            <strong>Aucun incident trouvé</strong>
            <span>Modifiez les filtres pour afficher d’autres résultats.</span>
          </div>
        ) : (
          <div className="history-table">
            <div className="history-table__head">
              <span>Incident</span><span>Origine</span><span>Date</span><span>Détection</span><span>Confiance</span><span>Statut</span><span />
            </div>

            {filteredIncidents.map((incident) => {
              const SourceIcon = getSourceIcon(incident.source_type);

              return (
                <button
                  type="button"
                  className="history-table__row"
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                >
                  <span className="history-table__incident">
                    <i className={`history-table__incident-icon history-table__incident-icon--${incident.severity}`}>
                      <Flame size={18} />
                    </i>
                    <span><strong>{getIncidentTitle(incident)}</strong><small>Incident #{incident.id} · {incident.location}</small></span>
                  </span>
                  <span className="history-table__source"><SourceIcon size={16} />{getSourceLabel(incident.source_type)}</span>
                  <span>{formatDate(incident.created_at)}</span>
                  <span>{incident.fire_count} feu · {incident.smoke_count} fumée</span>
                  <span><strong>{(incident.maximum_confidence * 100).toFixed(1)} %</strong></span>
                  <span className={`history-badge history-badge--${incident.status}`}>{getStatusLabel(incident.status)}</span>
                  <ChevronRight size={18} />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedIncident && (
        <div className="history-modal" role="presentation" onMouseDown={() => setSelectedIncident(null)}>
          <article role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><span>INCIDENT #{selectedIncident.id}</span><h2>{getIncidentTitle(selectedIncident)}</h2></div>
              <button type="button" aria-label="Fermer" onClick={() => setSelectedIncident(null)}><X size={20} /></button>
            </header>

            {selectedIncident.media_url && (
              <div className="history-modal__media">
                {selectedIncident.source_type === "image" ? (
                  <img src={`${BACKEND_URL}${selectedIncident.media_url}`} alt="Média associé à l’incident" />
                ) : (
                  <video src={`${BACKEND_URL}${selectedIncident.media_url}`} controls />
                )}
              </div>
            )}

            <div className="history-modal__grid">
              <div><span>Zone surveillée</span><strong>{selectedIncident.location}</strong></div>
              <div><span>Origine</span><strong>{getSourceLabel(selectedIncident.source_type)}</strong></div>
              <div><span>Sévérité</span><strong>{getSeverityLabel(selectedIncident.severity)}</strong></div>
              <div><span>Statut</span><strong>{getStatusLabel(selectedIncident.status)}</strong></div>
              <div><span>Détections feu</span><strong>{selectedIncident.fire_count}</strong></div>
              <div><span>Détections fumée</span><strong>{selectedIncident.smoke_count}</strong></div>
              <div><span>Confiance maximale</span><strong>{(selectedIncident.maximum_confidence * 100).toFixed(1)} %</strong></div>
              <div><span>Date de détection</span><strong>{formatDate(selectedIncident.created_at)}</strong></div>
              <div><span>Date de résolution</span><strong>{formatDate(selectedIncident.resolved_at)}</strong></div>
              <div><span>Fichier source</span><strong>{selectedIncident.original_filename}</strong></div>
            </div>

            <footer>
              <button type="button" onClick={() => setSelectedIncident(null)}>Fermer</button>
              {selectedIncident.media_url && (
                <a href={`${BACKEND_URL}${selectedIncident.media_url}`} target="_blank" rel="noreferrer"><Eye size={17} />Consulter le média</a>
              )}
            </footer>
          </article>
        </div>
      )}
    </div>
  );
}

export default Historique;