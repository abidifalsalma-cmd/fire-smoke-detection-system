import { useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import menaraPrefaLogo from "../assets/menara-prefa-logo.png";
import "./Connexion.css";

function Connexion() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError(
        "Veuillez renseigner votre email et votre mot de passe."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8001/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Connexion impossible."
        );
      }

      localStorage.setItem(
        "menara-fire-session",
        JSON.stringify({
          authenticated: true,
          accessToken: data.access_token,
          user: data.user,
        })
      );

      navigate("/", { replace: true });
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
            La supervision incendie
            <strong>
              {" "}
              intelligente et centralisée.
            </strong>
          </h1>

          <p>
            Surveillez les caméras, analysez les médias et gérez les
            alertes depuis un espace sécurisé.
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
              <h2>Connexion</h2>
              <p>
                Accédez au centre de supervision incendie
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

            <label className="login-field">
              <span>Mot de passe</span>

              <div className="login-field__control">
                <LockKeyhole size={18} />

                <input
                  autoComplete="current-password"
                  disabled={loading}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Saisissez votre mot de passe"
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

              <div className="login-card__forgot-password">
  <Link to="/mot-de-passe-oublie">
    Mot de passe oublié ?
  </Link>
</div>

            {error && (
              <p
                className="login-card__error"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              aria-busy={loading}
              className="login-card__submit"
              disabled={loading}
              type="submit"
            >
              <LogIn size={19} />

              {loading
                ? "Connexion en cours..."
                : "Se connecter"}
            </button>
          </form>

          <p className="login-card__security">
            <ShieldCheck size={15} />
            Accès réservé au personnel autorisé
          </p>
        </div>
      </section>
    </main>
  );
}

export default Connexion;