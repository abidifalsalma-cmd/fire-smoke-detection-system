import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";

import {
  addUser,
  getUsers,
  updateUser,
} from "../services/api";
import "./Utilisateurs.css";


const INITIAL_FORM = {
  full_name: "",
  email: "",
  password: "",
  role: "operator",
};


function Utilisateurs() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getUsers();
      setUsers(data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail
        || "Impossible de récupérer les utilisateurs."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const updateForm = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (
      !form.full_name.trim()
      || !form.email.trim()
      || !form.password
    ) {
      setError("Tous les champs sont obligatoires.");
      return;
    }

    if (form.password.length < 8) {
      setError(
        "Le mot de passe doit contenir au moins 8 caractères."
      );
      return;
    }

    setSaving(true);

    try {
      const createdUser = await addUser({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      setUsers((currentUsers) => [
        createdUser,
        ...currentUsers,
      ]);

      setForm(INITIAL_FORM);
      setMessage("Le nouvel utilisateur a été créé.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail
        || "La création du compte a échoué."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (user) => {
    setError("");
    setMessage("");

    try {
      const updatedUser = await updateUser(
        user.id,
        {
          is_active: !user.is_active,
        }
      );

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === updatedUser.id
            ? updatedUser
            : currentUser
        )
      );

      setMessage(
        updatedUser.is_active
          ? "Le compte a été activé."
          : "Le compte a été désactivé."
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail
        || "La modification du compte a échoué."
      );
    }
  };

  const activeUsers = users.filter(
    (user) => user.is_active
  ).length;

  const administrators = users.filter(
    (user) =>
      user.role === "administrator"
      && user.is_active
  ).length;

  return (
    <main className="users-page">
      <header className="users-page__header">
        <div>
          <p className="users-page__eyebrow">
            CONTRÔLE DES ACCÈS
          </p>

          <h1>Gestion des utilisateurs</h1>

          <p>
            Créez les comptes du personnel et contrôlez leur accès
            au centre de supervision.
          </p>
        </div>

        <button
          disabled={loading}
          onClick={loadUsers}
          type="button"
        >
          <RefreshCw
            className={loading ? "is-spinning" : ""}
            size={18}
          />
          Actualiser
        </button>
      </header>

      <section className="users-summary">
        <article>
          <span className="users-summary__icon users-summary__icon--blue">
            <Users size={22} />
          </span>

          <div>
            <span>Comptes enregistrés</span>
            <strong>{users.length}</strong>
          </div>
        </article>

        <article>
          <span className="users-summary__icon users-summary__icon--green">
            <UserCheck size={22} />
          </span>

          <div>
            <span>Comptes actifs</span>
            <strong>{activeUsers}</strong>
          </div>
        </article>

        <article>
          <span className="users-summary__icon users-summary__icon--red">
            <ShieldCheck size={22} />
          </span>

          <div>
            <span>Administrateurs actifs</span>
            <strong>{administrators}</strong>
          </div>
        </article>
      </section>

      {error && (
        <p className="users-message users-message--error">
          {error}
        </p>
      )}

      {message && (
        <p className="users-message users-message--success">
          {message}
        </p>
      )}

      <section className="users-grid">
        <article className="users-card">
          <header className="users-card__header">
            <span>
              <UserPlus size={21} />
            </span>

            <div>
              <h2>Ajouter un utilisateur</h2>
              <p>Créez un accès sécurisé pour un membre du personnel</p>
            </div>
          </header>

          <form
            autoComplete="off"
            className="users-form"
            onSubmit={handleSubmit}
          >
            <label>
              <span>Nom complet</span>
              <input
                autoComplete="off"
                disabled={saving}
                onChange={(event) =>
                  updateForm(
                    "full_name",
                    event.target.value
                  )
                }
                placeholder="Nom et prénom"
                type="text"
                value={form.full_name}
              />
            </label>

            <label>
              <span>Adresse email</span>
              <input
                autoComplete="off"
                disabled={saving}
                onChange={(event) =>
                  updateForm(
                    "email",
                    event.target.value
                  )
                }
                placeholder="utilisateur@menaraprefa.ma"
                type="email"
                value={form.email}
              />
            </label>

            <label>
              <span>Mot de passe initial</span>
              <input
                autoComplete="new-password"
                disabled={saving}
                onChange={(event) =>
                  updateForm(
                    "password",
                    event.target.value
                  )
                }
                placeholder="Au moins 8 caractères"
                type="password"
                value={form.password}
              />
            </label>

            <label>
              <span>Rôle</span>
              <select
                disabled={saving}
                onChange={(event) =>
                  updateForm(
                    "role",
                    event.target.value
                  )
                }
                value={form.role}
              >
                <option value="operator">
                  Opérateur
                </option>

                <option value="administrator">
                  Administrateur
                </option>
              </select>
            </label>

            <button
              disabled={saving}
              type="submit"
            >
              <UserPlus size={18} />

              {saving
                ? "Création..."
                : "Créer le compte"}
            </button>
          </form>
        </article>

        <article className="users-card">
          <header className="users-card__header">
            <span>
              <Users size={21} />
            </span>

            <div>
              <h2>Comptes du personnel</h2>
              <p>Utilisateurs autorisés à accéder à l’application</p>
            </div>
          </header>

          <div className="users-list">
            {loading ? (
              <p className="users-list__empty">
                Chargement des utilisateurs...
              </p>
            ) : users.length === 0 ? (
              <p className="users-list__empty">
                Aucun utilisateur enregistré.
              </p>
            ) : (
              users.map((user) => (
                <div
                  className="users-list__item"
                  key={user.id}
                >
                  <span className="users-list__avatar">
                    {user.full_name
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </span>

                  <div className="users-list__identity">
                    <strong>{user.full_name}</strong>
                    <span>{user.email}</span>
                  </div>

                  <span
                    className={
                      user.role === "administrator"
                        ? "users-list__role users-list__role--admin"
                        : "users-list__role"
                    }
                  >
                    {user.role === "administrator"
                      ? "Administrateur"
                      : "Opérateur"}
                  </span>

                  <span
                    className={
                      user.is_active
                        ? "users-list__status users-list__status--active"
                        : "users-list__status"
                    }
                  >
                    {user.is_active ? "Actif" : "Désactivé"}
                  </span>

                  <button
                    className={
                      user.is_active
                        ? "users-list__action users-list__action--disable"
                        : "users-list__action users-list__action--enable"
                    }
                    onClick={() =>
                      handleStatusChange(user)
                    }
                    type="button"
                  >
                    {user.is_active ? (
                      <UserX size={17} />
                    ) : (
                      <UserCheck size={17} />
                    )}

                    {user.is_active
                      ? "Désactiver"
                      : "Activer"}
                  </button>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}


export default Utilisateurs;