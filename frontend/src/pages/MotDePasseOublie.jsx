import { useState } from "react";
import {
  ArrowLeft,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

import menaraPrefaLogo from "../assets/menara-prefa-logo.png";
import "./Connexion.css";


function MotDePasseOublie() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8001/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "La demande a échoué."
        );
      }

      setMessage(data.message);
    } catch (requestError) {
      setError(
        requestError.message === "Failed to fetch"
          ? "Le serveur backend est inaccessible."
          : requestError.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-page__visual">
        <div className="login-page__visual-content">
          <span className="login-page__badge">
            <ShieldCheck size={17} />
            MENARA FIRE SAFETY
          </span>

          <h1>
            Retrouvez rapidement
            <strong> l’accès à votre espace sécurisé.</strong>
          </h1>

          <p>
            Un lien temporaire vous permettra de choisir un nouveau
            mot de passe.
          </p>
        </div>
      </section>

      <section className="login-page__form-section">
        <div className="login-card">
          <img
            alt="Menara Prefa"
            className="login-card__logo"
            src={menaraPrefaLogo}
          />

          <header className="login-card__header">
            <span className="login-card__icon">
              <Mail size={23} />
            </span>

            <div>
              <h2>Mot de passe oublié</h2>
              <p>
                Saisissez l’adresse associée à votre compte
              </p>
            </div>
          </header>

          <form onSubmit={handleSubmit}>
            <label className="login-field">
              <span>Adresse email</span>

              <div className="login-field__control">
                <Mail size={18} />

                <input
                  autoComplete="email"
                  disabled={loading}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="admin@menaraprefa.ma"
                  type="email"
                  value={email}
                />
              </div>
            </label>

            {error && (
              <p className="login-card__error" role="alert">
                {error}
              </p>
            )}

            {message && (
              <p className="login-card__success" role="status">
                {message}
              </p>
            )}

            <button
              className="login-card__submit"
              disabled={loading}
              type="submit"
            >
              <Send size={18} />

              {loading
                ? "Envoi en cours..."
                : "Envoyer le lien"}
            </button>
          </form>

          <div className="login-card__back">
            <Link to="/connexion">
              <ArrowLeft size={16} />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}


export default MotDePasseOublie;