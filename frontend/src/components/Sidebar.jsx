import {
  BellRing,
  Camera,
  Cctv,
  ChartNoAxesCombined,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import menaraPrefaLogo from "../assets/menara-prefa-logo.png";
import "./Sidebar.css";

const navigation = [
  {
    section: "SUPERVISION",
    items: [
      {
        label: "Accueil",
        path: "/",
        icon: LayoutDashboard,
      },
      {
        label: "Caméras",
        path: "/cameras",
        icon: Cctv,
      },
      {
        label: "Surveillance",
        path: "/surveillance",
        icon: Camera,
      },
      {
        label: "Alertes",
        path: "/alertes",
        icon: BellRing,
      },
    ],
  },
  {
    section: "ANALYSE",
    items: [
      {
        label: "Historique",
        path: "/historique",
        icon: History,
      },
      {
        label: "Statistiques",
        path: "/statistiques",
        icon: ChartNoAxesCombined,
      },
    ],
  },
  {
    section: "SYSTÈME",
    items: [
      {
        label: "Paramètres",
        path: "/parametres",
        icon: Settings,
      },
      {
  label: "Utilisateurs",
  path: "/utilisateurs",
  icon: Users,
  administratorOnly: true,
},
    ],
  },
];

function getConnectedUser() {
  try {
    const session = JSON.parse(
      localStorage.getItem("menara-fire-session")
    );

    return session?.user || null;
  } catch {
    return null;
  }
}

function getInitials(fullName) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function Sidebar() {
  const navigate = useNavigate();
  const currentUser = getConnectedUser();

  const visibleNavigation = navigation.map((group) => ({
  ...group,
  items: group.items.filter(
    (item) =>
      !item.administratorOnly
      || currentUser?.role === "administrator"
  ),
}));

  const userName =
    currentUser?.full_name || "Utilisateur";

  const userRole =
    currentUser?.role === "administrator"
      ? "Administratrice"
      : currentUser?.role || "Utilisateur";

  const userInitials = getInitials(userName);

  const handleLogout = () => {
    localStorage.removeItem(
      "menara-fire-session"
    );

    navigate(
      "/connexion",
      { replace: true }
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-logo">
          <img
            alt="Menara Prefa"
            src={menaraPrefaLogo}
          />
        </div>
      </div>

      <div className="sidebar__status">
        <span className="sidebar__status-icon">
          <ShieldCheck size={18} />
        </span>

        <div>
          <strong>Système opérationnel</strong>
          <span>Protection active</span>
        </div>

        <span className="sidebar__status-dot" />
      </div>

      <nav className="sidebar__navigation">
        {visibleNavigation.map((group) => (
          <div
            className="sidebar__group"
            key={group.section}
          >
            <p className="sidebar__group-title">
              {group.section}
            </p>

            <div className="sidebar__links">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    className={({ isActive }) =>
                      `sidebar__link ${
                        isActive
                          ? "sidebar__link--active"
                          : ""
                      }`
                    }
                    end={item.path === "/"}
                    key={item.path}
                    to={item.path}
                  >
                    <Icon
                      size={19}
                      strokeWidth={1.9}
                    />

                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__profile">
          <div className="sidebar__avatar">
            {userInitials}
          </div>

          <div className="sidebar__profile-text">
            <strong>{userName}</strong>
            <span>{userRole}</span>
          </div>

          <button
            aria-label="Se déconnecter"
            className="sidebar__logout"
            onClick={handleLogout}
            title="Se déconnecter"
            type="button"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;