import {
  useEffect,
  useState,
} from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import Alerts from "./pages/Alerts";
import CameraMonitoring from "./pages/CameraMonitoring";
import Connexion from "./pages/Connexion";
import Dashboard from "./pages/Dashboard";
import Historique from "./pages/Historique";
import MotDePasseOublie from "./pages/MotDePasseOublie";
import Parametres from "./pages/Parametres";
import ReinitialiserMotDePasse from "./pages/ReinitialiserMotDePasse";
import Statistiques from "./pages/Statistiques";
import Surveillance from "./pages/Surveillance";
import Utilisateurs from "./pages/Utilisateurs";

function getStoredSession() {
  try {
    return JSON.parse(
      localStorage.getItem("menara-fire-session")
    );
  } catch {
    return null;
  }
}

function hasStoredToken() {
  const session = getStoredSession();

  return Boolean(
    session?.authenticated &&
    session?.accessToken
  );
}

function AuthenticationLoading() {
  return (
    <main
      style={{
        display: "grid",
        minHeight: "100vh",
        placeItems: "center",
        background: "var(--color-background, #f4f7fb)",
        color: "var(--color-text, #0b1736)",
        fontFamily: "inherit",
      }}
    >
      <p>Vérification de la session...</p>
    </main>
  );
}

function ProtectedRoute() {
  const [authenticationStatus, setAuthenticationStatus] =
    useState("checking");

  useEffect(() => {
    const session = getStoredSession();
    const controller = new AbortController();

    async function verifySession() {
      if (!session?.accessToken) {
        localStorage.removeItem(
          "menara-fire-session"
        );
        setAuthenticationStatus("denied");
        return;
      }

      try {
        const response = await fetch(
          "http://127.0.0.1:8001/api/auth/me",
          {
            headers: {
              Authorization:
                `Bearer ${session.accessToken}`,
            },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Session invalide");
        }

        const user = await response.json();

        localStorage.setItem(
          "menara-fire-session",
          JSON.stringify({
            ...session,
            authenticated: true,
            user,
          })
        );

        setAuthenticationStatus("authorized");
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        localStorage.removeItem(
          "menara-fire-session"
        );
        setAuthenticationStatus("denied");
      }
    }

    verifySession();

    return () => {
      controller.abort();
    };
  }, []);

  if (authenticationStatus === "checking") {
    return <AuthenticationLoading />;
  }

  if (authenticationStatus === "denied") {
    return (
      <Navigate
        replace
        to="/connexion"
      />
    );
  }

  return <AppLayout />;
}

function LoginRoute() {
  return hasStoredToken() ? (
    <Navigate replace to="/" />
  ) : (
    <Connexion />
  );
}

function AdministratorRoute({ children }) {
  const session = getStoredSession();

  return session?.user?.role === "administrator" ? (
    children
  ) : (
    <Navigate replace to="/" />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/connexion"
          element={<LoginRoute />}
        />

        <Route
          path="/mot-de-passe-oublie"
          element={<MotDePasseOublie />}
        />

        <Route
          path="/reinitialiser-mot-de-passe"
          element={<ReinitialiserMotDePasse />}
        />

        <Route element={<ProtectedRoute />}>
          <Route
            index
            element={<Dashboard />}
          />

          <Route
            path="cameras"
            element={<CameraMonitoring />}
          />

          <Route
            path="surveillance"
            element={<Surveillance />}
          />

          <Route
            path="alertes"
            element={<Alerts />}
          />

          <Route
            path="historique"
            element={<Historique />}
          />

          <Route
            path="statistiques"
            element={<Statistiques />}
          />

          <Route
            path="parametres"
            element={<Parametres />}
          />

          <Route
            path="utilisateurs"
            element={
              <AdministratorRoute>
                <Utilisateurs />
              </AdministratorRoute>
            }
          />
        </Route>

        <Route
          path="*"
          element={
            <Navigate
              replace
              to={
                hasStoredToken()
                  ? "/"
                  : "/connexion"
              }
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
