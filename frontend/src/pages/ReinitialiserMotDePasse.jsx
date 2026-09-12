import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import {
  Link,
  useSearchParams,
} from "react-router-dom";

import menaraPrefaLogo from "../assets/menara-prefa-logo.png";
import "./Connexion.css";


function ReinitialiserMotDePasse() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Le lien de réinitialisation est invalide.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Le mot de passe doit contenir au moins 8 caractères."
      );
      return;
    }

    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8001/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            new_password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "La modification a échoué."
        );
      }

      setMessage(data.message);
      setPassword("");
      setConfirmation("");
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
            Sécurisez de nouveau
            <strong> votre espace de supervision.</strong>
          </h1>

          <p>
            Choisissez un nouveau mot de passe sécurisé pour votre
            compte.
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
              <LockKeyhole size={23} />
            </span>

            <div>
              <h2>Nouveau mot de passe</h2>
              <p>Définissez vos nouveaux identifiants</p>
            </div>
          </header>

          {!message ? (
            <form onSubmit={handleSubmit}>
              <label className="login-field">
                <span>Nouveau mot de passe</span>

                <div className="login-field__control">
                  <LockKeyhole size={18} />

                  <input
                    autoComplete="new-password"
                    disabled={loading}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Au moins 8 caractères"
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />

                  <button
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    className="login-field__password-button"
                    disabled={loading}
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    type="button"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </label>

              <label className="login-field">
                <span>Confirmer le mot de passe</span>

                <div className="login-field__control">
                  <LockKeyhole size={18} />

                  <input
                    autoComplete="new-password"
                    disabled={loading}
                    onChange={(event) =>
                      setConfirmation(event.target.value)
                    }
                    placeholder="Répétez le mot de passe"
                    type={showPassword ? "text" : "password"}
                    value={confirmation}
                  />
                </div>
              </label>

              {error && (
                <p className="login-card__error" role="alert">
                  {error}
                </p>
              )}

              <button
                className="login-card__submit"
                disabled={loading}
                type="submit"
              >
                <CheckCircle2 size={18} />

                {loading
                  ? "Modification..."
                  : "Modifier le mot de passe"}
              </button>
            </form>
          ) : (
            <div className="login-card__success-panel">
              <CheckCircle2 size={25} />
              <p>{message}</p>

              <Link to="/connexion">
                Se connecter
              </Link>
            </div>
          )}

          {!message && (
            <div className="login-card__back">
              <Link to="/connexion">
                <ArrowLeft size={16} />
                Retour à la connexion
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}


export default ReinitialiserMotDePasse;