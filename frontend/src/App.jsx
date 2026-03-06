import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Server,
  Monitor,
  Globe,
  Network,
  Settings,
  Compass,
} from "lucide-react";
import { api } from "./api.js";
import SetupWizard from "./pages/SetupWizard.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NomadPage from "./pages/NomadPage.jsx";
import ProxmoxPage from "./pages/ProxmoxPage.jsx";
import CloudflarePage from "./pages/CloudflarePage.jsx";
import TraefikPage from "./pages/TraefikPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/nomad", label: "Nomad", icon: Server },
  { to: "/proxmox", label: "Proxmox", icon: Monitor },
  { to: "/cloudflare", label: "Cloudflare", icon: Globe },
  { to: "/traefik", label: "Traefik", icon: Network },
];

function Sidebar({ instanceName }) {
  return (
    <aside className="w-[220px] bg-surface-0 border-r border-white/[0.06] flex flex-col min-h-screen shrink-0">
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <Compass className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-none">
              {instanceName || "Infra Pilot"}
            </h1>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Infrastructure Portal
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 mb-2">
        <p className="section-title px-2 mb-2">Navigation</p>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? "bg-accent/15 text-accent-hover"
                  : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-4 h-4 ${
                    isActive ? "text-accent" : "text-gray-600"
                  }`}
                />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-3 mt-auto">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
              isActive
                ? "bg-accent/15 text-accent-hover"
                : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Settings
                className={`w-4 h-4 ${
                  isActive ? "text-accent" : "text-gray-600"
                }`}
              />
              Settings
            </>
          )}
        </NavLink>
      </div>
    </aside>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-0">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <Compass className="w-5 h-5 text-accent animate-pulse-slow" />
        </div>
        <p className="text-sm text-gray-500">Loading Infra Pilot...</p>
      </div>
    </div>
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

  if (loading) return <LoadingScreen />;

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
      <div className="flex min-h-screen bg-surface-0">
        <Sidebar instanceName={instanceName} />
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-6xl animate-fade-in">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/nomad" element={<NomadPage />} />
              <Route path="/proxmox" element={<ProxmoxPage />} />
              <Route path="/cloudflare" element={<CloudflarePage />} />
              <Route path="/traefik" element={<TraefikPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}
