import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

import "./AppLayout.css";


function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-workspace">
        <Topbar />

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;