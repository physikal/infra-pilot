import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";
import { api } from "./api.js";
import SetupWizard from "./pages/SetupWizard.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NomadPage from "./pages/NomadPage.jsx";
import ProxmoxPage from "./pages/ProxmoxPage.jsx";
import CloudflarePage from "./pages/CloudflarePage.jsx";
import TraefikPage from "./pages/TraefikPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard" },
  { to: "/nomad", label: "Nomad" },
  { to: "/proxmox", label: "Proxmox" },
  { to: "/cloudflare", label: "Cloudflare" },
  { to: "/traefik", label: "Traefik" },
  { to: "/settings", label: "Settings" },
];

function Sidebar({ instanceName }) {
  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen shrink-0">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white truncate">
          {instanceName || "Infra Pilot"}
        </h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `block px-3 py-2 rounded text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default function App() {
  const [setupComplete, setSetupComplete] = useState(null);
  const [instanceName, setInstanceName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getSetupStatus()
      .then((data) => {
        setSetupComplete(data.setupComplete);
        setInstanceName(data.instanceName || "");
      })
      .catch(() => setSetupComplete(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!setupComplete) {
    return (
      <SetupWizard
        onComplete={(name) => {
          setInstanceName(name);
          setSetupComplete(true);
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar instanceName={instanceName} />
        <main className="flex-1 p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/nomad" element={<NomadPage />} />
            <Route path="/proxmox" element={<ProxmoxPage />} />
            <Route path="/cloudflare" element={<CloudflarePage />} />
            <Route path="/traefik" element={<TraefikPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
