import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  CloudFog,
  Flame,
  Moon,
  Sun,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import "./Topbar.css";

const SETTINGS_KEY = "menara-fire-settings";
const INCIDENTS_API_URL =
  "http://127.0.0.1:8001/api/incidents";

function getAppliedTheme() {
  return (
    document.documentElement.getAttribute("data-theme") ||
    "light"
  );
}

function Topbar() {
  const navigate = useNavigate();
  const [activeTheme, setActiveTheme] = useState(
    getAppliedTheme
  );
  const [notificationsOpen, setNotificationsOpen] =
    useState(false);
  const [activeIncidents, setActiveIncidents] = useState([]);
  const [notificationsLoading, setNotificationsLoading] =
    useState(true);

  const currentDate = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setActiveTheme(getAppliedTheme());
    });

    observer.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
      attributes: true,
    });

    return () => observer.disconnect();
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch(
        `${INCIDENTS_API_URL}?limit=20`
      );

      if (!response.ok) {
        throw new Error("Chargement impossible");
      }

      const incidents = await response.json();

      setActiveIncidents(
        incidents.filter(
          (incident) => incident.status !== "resolved"
        )
      );
    } catch {
      setActiveIncidents([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const intervalId = window.setInterval(
      loadNotifications,
      30000
    );

    return () => window.clearInterval(intervalId);
  }, [loadNotifications]);

  function toggleTheme() {
    const nextTheme =
      activeTheme === "dark" ? "light" : "dark";

    let storedSettings = {};

    try {
      storedSettings = JSON.parse(
        localStorage.getItem(SETTINGS_KEY) || "{}"
      );
    } catch {
      storedSettings = {};
    }

    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        ...storedSettings,
        theme: nextTheme,
      })
    );

    document.documentElement.setAttribute(
      "data-theme",
      nextTheme
    );

    setActiveTheme(nextTheme);
  }

  return (
    <header className="topbar">
      <div className="topbar__context">
        <span>Menara Prefa</span>
        <strong>Centre de supervision incendie</strong>
      </div>

      <div className="topbar__actions">
        <div className="topbar__date">
          <CalendarDays size={17} />
          <span>{currentDate}</span>
        </div>

        <button
          aria-label={
            activeTheme === "dark"
              ? "Activer le mode clair"
              : "Activer le mode sombre"
          }
          className="topbar__notification topbar__theme"
          onClick={toggleTheme}
          title={
            activeTheme === "dark"
              ? "Mode clair"
              : "Mode sombre"
          }
          type="button"
        >
          {activeTheme === "dark" ? (
            <Sun size={19} />
          ) : (
            <Moon size={19} />
          )}
        </button>

        <div className="topbar__notification-wrapper">
          <button
            aria-expanded={notificationsOpen}
            aria-label="Afficher les notifications"
            className="topbar__notification"
            onClick={() => {
              setNotificationsOpen((isOpen) => !isOpen);
              loadNotifications();
            }}
            type="button"
          >
            <Bell size={19} />

            {activeIncidents.length > 0 && (
              <span className="topbar__notification-dot" />
            )}
          </button>

          {notificationsOpen && (
            <section className="topbar__notifications-panel">
              <header>
                <div>
                  <strong>Notifications</strong>
                  <span>
                    {activeIncidents.length} incident(s) actif(s)
                  </span>
                </div>

                {activeIncidents.length > 0 && (
                  <b>{activeIncidents.length}</b>
                )}
              </header>

              <div className="topbar__notifications-list">
                {notificationsLoading ? (
                  <p>Chargement des notifications...</p>
                ) : activeIncidents.length === 0 ? (
                  <p>Aucune alerte active actuellement.</p>
                ) : (
                  activeIncidents.slice(0, 4).map((incident) => {
                    const hasFire = incident.detected_fire;

                    return (
                      <article key={incident.id}>
                        <span
                          className={
                            hasFire
                              ? "topbar__notification-icon topbar__notification-icon--fire"
                              : "topbar__notification-icon topbar__notification-icon--smoke"
                          }
                        >
                          {hasFire ? (
                            <Flame size={17} />
                          ) : (
                            <CloudFog size={17} />
                          )}
                        </span>

                        <div>
                          <strong>
                            {hasFire
                              ? incident.detected_smoke
                                ? "Feu et fumée détectés"
                                : "Feu détecté"
                              : "Fumée détectée"}
                          </strong>
                          <span>
                            {incident.location || "Menara Prefa"}
                          </span>
                          <small>
                            {new Intl.DateTimeFormat("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(incident.created_at))}
                          </small>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              <button
                onClick={() => {
                  setNotificationsOpen(false);
                  navigate("/alertes");
                }}
                type="button"
              >
                Voir toutes les alertes
              </button>
            </section>
          )}
        </div>

        <button className="topbar__site" type="button">
          <span className="topbar__site-indicator" />

          <span>
            <small>Site actif</small>
            <strong>Menara Prefa</strong>
          </span>

          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
}

export default Topbar;