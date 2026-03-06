import { useState, useEffect } from "react";
import {
  Network,
  Router,
  Box,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { api } from "../api.js";

function EnabledBadge({ status }) {
  return status === "enabled" ? (
    <span className="badge-success">enabled</span>
  ) : (
    <span className="badge-neutral">{status}</span>
  );
}

function RouterCard({ router }) {
  return (
    <div className="card-hover p-4">
      <div className="flex items-center gap-3">
        <Router className="w-4 h-4 text-gray-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-white font-medium text-sm">
            {router.name}
          </span>
          <span className="text-gray-600 text-xs ml-2">
            {router.provider}
          </span>
        </div>
        <EnabledBadge status={router.status} />
      </div>
      {router.rule && (
        <div className="mt-2.5 ml-7 text-xs text-gray-400 font-mono bg-surface-2 rounded-lg px-3 py-2">
          {router.rule}
        </div>
      )}
      {router.service && (
        <div className="mt-1.5 ml-7 text-xs text-gray-600 flex items-center gap-1.5">
          <ExternalLink className="w-3 h-3" />
          {router.service}
        </div>
      )}
    </div>
  );
}

function ServiceCard({ service }) {
  return (
    <div className="card-hover p-4">
      <div className="flex items-center gap-3">
        <Box className="w-4 h-4 text-gray-600 shrink-0" />
        <span className="text-white font-medium text-sm">
          {service.name}
        </span>
        <span className="text-gray-600 text-xs">{service.provider}</span>
        <span className="text-gray-600 text-xs">{service.type}</span>
        <EnabledBadge status={service.status} />
      </div>
      {service.loadBalancer?.servers && (
        <div className="mt-2.5 ml-7 space-y-1">
          {service.loadBalancer.servers.map((srv, i) => (
            <div
              key={i}
              className="text-xs text-gray-500 font-mono bg-surface-2 rounded-lg px-3 py-1.5"
            >
              {srv.url}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TraefikPage() {
  const [routers, setRouters] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("routers");

  useEffect(() => {
    Promise.all([api.getTraefikRouters(), api.getTraefikServices()])
      .then(([r, s]) => {
        setRouters(r);
        setServices(s);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="card p-6 border-red-500/20">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Network className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="page-title">Traefik</h2>
          <p className="text-sm text-gray-500">
            Routers and services
          </p>
        </div>
      </div>

      <div className="flex gap-6 mb-6 border-b border-white/[0.06]">
        <button
          onClick={() => setTab("routers")}
          className={
            tab === "routers" ? "tab-btn-active" : "tab-btn-inactive"
          }
        >
          Routers ({routers.length})
        </button>
        <button
          onClick={() => setTab("services")}
          className={
            tab === "services" ? "tab-btn-active" : "tab-btn-inactive"
          }
        >
          Services ({services.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : tab === "routers" ? (
        <div className="space-y-2">
          {routers.length === 0 && (
            <div className="card p-8 text-center">
              <Router className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No routers found.
              </p>
            </div>
          )}
          {routers.map((r) => (
            <RouterCard key={r.name} router={r} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {services.length === 0 && (
            <div className="card p-8 text-center">
              <Box className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                No services found.
              </p>
            </div>
          )}
          {services.map((s) => (
            <ServiceCard key={s.name} service={s} />
          ))}
        </div>
      )}
    </div>
  );
}
