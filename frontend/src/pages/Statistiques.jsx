import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Camera,
  CheckCircle2,
  Clock3,
  Flame,
  RefreshCw,
  ShieldCheck,
  CloudFog,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import "./Statistiques.css";


const API_URL = "http://127.0.0.1:8001";
const COLORS = ["#dc2626", "#f59e0b", "#10b981", "#64748b"];


function formatDay(value) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
  }).format(value);
}


function Statistiques() {
  const [incidents, setIncidents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(30);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [incidentResponse, cameraResponse] = await Promise.all([
        fetch(`${API_URL}/api/incidents?limit=500`),
        fetch(`${API_URL}/api/cameras`),
      ]);

      if (!incidentResponse.ok || !cameraResponse.ok) {
        throw new Error("Le backend n’est pas disponible.");
      }

      const [incidentData, cameraData] = await Promise.all([
        incidentResponse.json(),
        cameraResponse.json(),
      ]);

      setIncidents(Array.isArray(incidentData) ? incidentData : []);
      setCameras(Array.isArray(cameraData) ? cameraData : []);
    } catch (requestError) {
      setError(requestError.message || "Impossible de charger les statistiques.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredIncidents = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - period + 1);
    start.setHours(0, 0, 0, 0);

    return incidents.filter((incident) => (
      new Date(incident.created_at) >= start
    ));
  }, [incidents, period]);

  const stats = useMemo(() => {
    const total = filteredIncidents.length;
    const active = filteredIncidents.filter(
      (incident) => incident.status !== "resolved",
    ).length;
    const resolved = filteredIncidents.filter(
      (incident) => incident.status === "resolved",
    ).length;
    const critical = filteredIncidents.filter(
      (incident) => incident.severity === "critical",
    ).length;
    const averageConfidence = total
      ? filteredIncidents.reduce(
          (sum, incident) => sum + Number(incident.maximum_confidence || 0),
          0,
        ) / total
      : 0;

    return {
      total,
      active,
      resolved,
      critical,
      resolutionRate: total ? Math.round((resolved / total) * 100) : 0,
      averageConfidence: Math.round(averageConfidence * 1000) / 10,
    };
  }, [filteredIncidents]);

  const timelineData = useMemo(() => {
    const days = [];
    const lookup = new Map();

    for (let index = period - 1; index >= 0; index -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - index);
      date.setHours(0, 0, 0, 0);

      const key = date.toISOString().slice(0, 10);
      const entry = {
        key,
        label: formatDay(date),
        feu: 0,
        fumee: 0,
      };

      days.push(entry);
      lookup.set(key, entry);
    }

    filteredIncidents.forEach((incident) => {
      const key = new Date(incident.created_at).toISOString().slice(0, 10);
      const entry = lookup.get(key);

      if (!entry) return;
      if (incident.detected_fire) entry.feu += 1;
      if (incident.detected_smoke) entry.fumee += 1;
    });

    return days;
  }, [filteredIncidents, period]);

  const typeData = useMemo(() => {
    const fireOnly = filteredIncidents.filter(
      (item) => item.detected_fire && !item.detected_CloudFog,
    ).length;
    const smokeOnly = filteredIncidents.filter(
      (item) => !item.detected_fire && item.detected_CloudFog,
    ).length;
    const mixed = filteredIncidents.filter(
      (item) => item.detected_fire && item.detected_CloudFog,
    ).length;

    return [
      { name: "Feu", value: fireOnly },
      { name: "Fumée", value: smokeOnly },
      { name: "Feu + fumée", value: mixed },
    ].filter((item) => item.value > 0);
  }, [filteredIncidents]);

  const zoneData = useMemo(() => {
    const counts = new Map();

    filteredIncidents.forEach((incident) => {
      const zone = incident.location || "Zone non définie";
      counts.set(zone, (counts.get(zone) || 0) + 1);
    });

    return [...counts.entries()]
      .map(([zone, incidentsCount]) => ({ zone, incidents: incidentsCount }))
      .sort((first, second) => second.incidents - first.incidents)
      .slice(0, 5);
  }, [filteredIncidents]);

  const severityData = useMemo(() => {
    const labels = {
      critical: "Critique",
      high: "Élevée",
      medium: "Moyenne",
      low: "Faible",
    };

    return ["critical", "high", "medium", "low"]
      .map((severity) => ({
        name: labels[severity],
        value: filteredIncidents.filter(
          (incident) => incident.severity === severity,
        ).length,
      }))
      .filter((item) => item.value > 0);
  }, [filteredIncidents]);

  const onlineCameras = cameras.filter(
    (cameraItem) => cameraItem.status === "online" && cameraItem.is_enabled,
  ).length;
  const riskZone = zoneData[0];

  return (
    <div className="statistics-page">
      <header className="statistics-hero">
        <div>
          <p className="statistics-eyebrow">ANALYSE DÉCISIONNELLE</p>
          <h1>Statistiques de sécurité</h1>
          <p>
            Analyse des tendances, des zones à risque et de la performance
            opérationnelle du dispositif Menara Fire Safety.
          </p>
        </div>

        <div className="statistics-actions">
          <label>
            <span>Période analysée</span>
            <select value={period} onChange={(event) => setPeriod(Number(event.target.value))}>
              <option value={7}>7 derniers jours</option>
              <option value={30}>30 derniers jours</option>
              <option value={90}>90 derniers jours</option>
            </select>
          </label>

          <button type="button" onClick={loadData} disabled={loading}>
            <RefreshCw size={18} className={loading ? "is-spinning" : ""} />
            Actualiser
          </button>
        </div>
      </header>

      {error && (
        <div className="statistics-error">
          <AlertTriangle size={19} />
          <span>{error}</span>
          <button type="button" onClick={loadData}>Réessayer</button>
        </div>
      )}

      <section className="statistics-kpis">
        <article className="statistics-kpi statistics-kpi--blue">
          <span className="statistics-kpi__icon"><Activity size={22} /></span>
          <div><span>Incidents enregistrés</span><strong>{stats.total}</strong><small>sur la période sélectionnée</small></div>
        </article>
        <article className="statistics-kpi statistics-kpi--red">
          <span className="statistics-kpi__icon"><AlertTriangle size={22} /></span>
          <div><span>Incidents critiques</span><strong>{stats.critical}</strong><small>{stats.active} incident(s) encore actif(s)</small></div>
        </article>
        <article className="statistics-kpi statistics-kpi--green">
          <span className="statistics-kpi__icon"><CheckCircle2 size={22} /></span>
          <div><span>Taux de résolution</span><strong>{stats.resolutionRate} %</strong><small>{stats.resolved} incident(s) clôturé(s)</small></div>
        </article>
        <article className="statistics-kpi statistics-kpi--purple">
          <span className="statistics-kpi__icon"><ShieldCheck size={22} /></span>
          <div><span>Confiance moyenne IA</span><strong>{stats.averageConfidence} %</strong><small>{onlineCameras}/{cameras.length || 0} caméra(s) en ligne</small></div>
        </article>
      </section>

      <section className="statistics-insight">
        <div className="statistics-insight__icon"><TrendingUp size={22} /></div>
        <div>
          <span>INDICATEUR DE VIGILANCE</span>
          <strong>
            {riskZone
              ? `${riskZone.zone} est la zone la plus exposée (${riskZone.incidents} incident${riskZone.incidents > 1 ? "s" : ""}).`
              : "Aucun incident enregistré pendant cette période."}
          </strong>
        </div>
        <div className={`statistics-risk ${stats.active ? "statistics-risk--alert" : ""}`}>
          <span>{stats.active ? "Vigilance requise" : "Situation maîtrisée"}</span>
          <small>{stats.active ? `${stats.active} alerte(s) à traiter` : "Aucune alerte active"}</small>
        </div>
      </section>

      <section className="statistics-grid statistics-grid--main">
        <article className="statistics-card statistics-card--wide">
          <header><div><h2>Évolution des détections</h2><p>Incidents feu et fumée par jour</p></div><BarChart3 size={20} /></header>
          <div className="statistics-chart statistics-chart--large">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="fireGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#dc2626" stopOpacity={0.28} /><stop offset="95%" stopColor="#dc2626" stopOpacity={0} /></linearGradient>
                  <linearGradient id="smokeGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.28} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e6ebf2" />
                <XAxis dataKey="label" tick={{ fill: "#8290a6", fontSize: 11 }} axisLine={false} tickLine={false} interval={period > 30 ? 9 : period > 7 ? 4 : 0} />
                <YAxis allowDecimals={false} tick={{ fill: "#8290a6", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 12px 30px rgba(15,23,42,.1)" }} />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="feu" name="Feu" stroke="#dc2626" strokeWidth={2.5} fill="url(#fireGradient)" />
                <Area type="monotone" dataKey="fumee" name="Fumée" stroke="#f59e0b" strokeWidth={2.5} fill="url(#smokeGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="statistics-card">
          <header><div><h2>Nature des incidents</h2><p>Répartition des détections</p></div><Flame size={20} /></header>
          <div className="statistics-chart statistics-chart--donut">
            {typeData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={94} paddingAngle={4}>
                    {typeData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="statistics-empty"><CloudFog size={30} /><span>Aucune détection</span></div>}
          </div>
        </article>
      </section>

      <section className="statistics-grid statistics-grid--secondary">
        <article className="statistics-card">
          <header><div><h2>Zones les plus exposées</h2><p>Classement par nombre d’incidents</p></div><Camera size={20} /></header>
          <div className="statistics-chart">
            {zoneData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zoneData} layout="vertical" margin={{ top: 5, right: 20, left: 15, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e6ebf2" />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="zone" width={145} tick={{ fill: "#536179", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} />
                  <Bar dataKey="incidents" name="Incidents" fill="#dc2626" radius={[0, 8, 8, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="statistics-empty"><Camera size={30} /><span>Aucune zone à risque</span></div>}
          </div>
        </article>

        <article className="statistics-card">
          <header><div><h2>Niveaux de criticité</h2><p>Priorisation des interventions</p></div><AlertTriangle size={20} /></header>
          <div className="statistics-severity-list">
            {severityData.length ? severityData.map((item, index) => (
              <div className="statistics-severity" key={item.name}>
                <span className="statistics-severity__dot" style={{ backgroundColor: COLORS[index] }} />
                <span>{item.name}</span>
                <div><i style={{ width: `${Math.max(8, (item.value / stats.total) * 100)}%`, backgroundColor: COLORS[index] }} /></div>
                <strong>{item.value}</strong>
              </div>
            )) : <div className="statistics-empty"><ShieldCheck size={30} /><span>Aucun niveau de risque</span></div>}
          </div>
        </article>

        <article className="statistics-card statistics-card--health">
          <header><div><h2>État opérationnel</h2><p>Synthèse du centre de supervision</p></div><Activity size={20} /></header>
          <div className="statistics-health-list">
            <div><span><Camera size={17} />Disponibilité caméras</span><strong>{cameras.length ? Math.round((onlineCameras / cameras.length) * 100) : 0} %</strong></div>
            <div><span><CheckCircle2 size={17} />Incidents clôturés</span><strong>{stats.resolved}</strong></div>
            <div><span><Clock3 size={17} />Incidents en attente</span><strong className={stats.active ? "is-alert" : ""}>{stats.active}</strong></div>
            <div><span><Flame size={17} />Détections critiques</span><strong className={stats.critical ? "is-alert" : ""}>{stats.critical}</strong></div>
          </div>
        </article>
      </section>
    </div>
  );
}

export default Statistiques;