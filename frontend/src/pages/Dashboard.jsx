import {
  ArrowRight,
  BellRing,
  Camera,
  CheckCircle2,
  Cpu,
  History,
  Play,
  ScanLine,
  ShieldCheck,
  UploadCloud,
  Video,
} from "lucide-react";
import { Link } from "react-router-dom";

import dashboardHero from "../assets/dashboard-hero.jpg";
import "./Dashboard.css";

const workflowSteps = [
  {
    number: "01",
    icon: UploadCloud,
    title: "Importer",
    description:
      "Ajoutez une image ou une vidéo provenant du site industriel.",
  },
  {
    number: "02",
    icon: ScanLine,
    title: "Analyser",
    description:
      "Le modèle YOLO recherche automatiquement le feu et la fumée.",
  },
  {
    number: "03",
    icon: BellRing,
    title: "Alerter",
    description:
      "Chaque incident détecté déclenche une alerte et reste traçable.",
  },
];

const capabilities = [
  {
    icon: Camera,
    title: "Caméras industrielles",
    description: "Supervision centralisée des zones sensibles.",
  },
  {
    icon: Cpu,
    title: "Intelligence artificielle",
    description: "Détection automatique avec le modèle YOLO.",
  },
  {
    icon: History,
    title: "Traçabilité complète",
    description: "Historique détaillé de toutes les détections.",
  },
];

function Dashboard() {
  return (
    <main className="home-page">
      <section className="home-hero">
        <img
          alt="Chantier industriel supervisé par Menara Prefa"
          className="home-hero__background"
          src={dashboardHero}
        />

        <div className="home-hero__overlay" />

        <div className="home-hero__content">
          <div className="home-hero__copy">
            <span className="home-hero__eyebrow">
              <ShieldCheck size={16} />
              MENARA FIRE SAFETY
            </span>

            <h1>
              La sécurité incendie,
              <span> renforcée par l’intelligence artificielle.</span>
            </h1>

            <p>
              Une plateforme intelligente pour détecter rapidement
              le feu et la fumée à partir des caméras, images et
              vidéos du site Menara Prefa.
            </p>

            <div className="home-hero__actions">
              <Link
                className="home-button home-button--primary"
                to="/surveillance"
              >
                <Play size={18} fill="currentColor" />
                Lancer une analyse
              </Link>

              <Link
                className="home-button home-button--secondary"
                to="/cameras"
              >
                <Camera size={18} />
                Voir les caméras
              </Link>
            </div>

            <div className="home-hero__assurance">
              <span>
                <CheckCircle2 size={15} /> Détection feu et fumée
              </span>
              <span>
                <CheckCircle2 size={15} /> Alertes centralisées
              </span>
            </div>
          </div>

          <aside className="home-demo-card">
            <header>
              <span className="home-demo-card__icon">
                <Video size={21} />
              </span>

              <div>
                <strong>Démonstration rapide</strong>
                <small>Analyse intelligente en trois étapes</small>
              </div>

              <span className="home-demo-card__status">
                <i /> Opérationnel
              </span>
            </header>

            <div className="home-demo-card__visual">
              <img alt="Aperçu de l’analyse" src={dashboardHero} />
              <span className="home-demo-card__scan" />

              <span className="home-demo-card__analysis">
                <ScanLine size={15} /> Analyse IA active
              </span>

              <span className="home-demo-card__frame">
                <b>Zone surveillée</b>
              </span>
            </div>

            <div className="home-demo-card__footer">
              <span>
                <i className="home-dot home-dot--green" />
                Flux reçu
              </span>
              <ArrowRight size={15} />
              <span>
                <i className="home-dot home-dot--blue" />
                Analyse YOLO
              </span>
              <ArrowRight size={15} />
              <span>
                <i className="home-dot home-dot--red" />
                Alerte
              </span>
            </div>
          </aside>
        </div>
      </section>

      <section className="home-workflow">
        <header className="home-section-header">
          <div>
            <span>FONCTIONNEMENT</span>
            <h2>De l’image à l’alerte en quelques instants</h2>
          </div>

          <p>
            Un parcours simple pour tester le système et consulter
            rapidement le résultat de l’analyse.
          </p>
        </header>

        <div className="home-workflow__grid">
          {workflowSteps.map((step) => {
            const Icon = step.icon;

            return (
              <article className="home-step" key={step.number}>
                <span className="home-step__number">
                  {step.number}
                </span>
                <span className="home-step__icon">
                  <Icon size={23} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="home-capabilities">
        <div className="home-capabilities__intro">
          <span>UNE PLATEFORME CENTRALISÉE</span>
          <h2>Conçue pour la supervision industrielle</h2>
          <p>
            Menara Fire Safety rassemble la surveillance, la
            détection et le suivi des incidents dans une seule
            interface professionnelle.
          </p>

          <Link to="/surveillance">
            Essayer l’analyse
            <ArrowRight size={17} />
          </Link>
        </div>

        <div className="home-capabilities__list">
          {capabilities.map((capability) => {
            const Icon = capability.icon;

            return (
              <article key={capability.title}>
                <span>
                  <Icon size={20} />
                </span>
                <div>
                  <strong>{capability.title}</strong>
                  <p>{capability.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default Dashboard;