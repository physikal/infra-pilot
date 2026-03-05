import { useState, useEffect } from "react";
import { api } from "../api.js";

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
      <div className="bg-red-900/30 border border-red-800 rounded p-4 text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Traefik</h2>

      <div className="flex gap-4 mb-4 border-b border-gray-800">
        <button
          onClick={() => setTab("routers")}
          className={`pb-2 text-sm ${
            tab === "routers"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Routers ({routers.length})
        </button>
        <button
          onClick={() => setTab("services")}
          className={`pb-2 text-sm ${
            tab === "services"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Services ({services.length})
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : tab === "routers" ? (
        <div className="space-y-2">
          {routers.length === 0 && (
            <p className="text-gray-600">No routers found.</p>
          )}
          {routers.map((r) => (
            <div
              key={r.name}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <span className="text-white font-medium">{r.name}</span>
                  <span className="text-gray-600 text-xs ml-2">
                    {r.provider}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded border ${
                    r.status === "enabled"
                      ? "bg-green-900/50 text-green-300 border-green-700"
                      : "bg-gray-800 text-gray-400 border-gray-700"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              {r.rule && (
                <div className="mt-2 text-sm text-gray-400 font-mono bg-gray-800/50 rounded px-3 py-1.5">
                  {r.rule}
                </div>
              )}
              {r.service && (
                <div className="mt-1 text-xs text-gray-500">
                  Service: {r.service}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {services.length === 0 && (
            <p className="text-gray-600">No services found.</p>
          )}
          {services.map((s) => (
            <div
              key={s.name}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4"
            >
              <div className="flex items-center gap-4">
                <span className="text-white font-medium">{s.name}</span>
                <span className="text-gray-600 text-xs">{s.provider}</span>
                <span className="text-gray-600 text-xs">{s.type}</span>
                <span
                  className={`ml-auto text-xs px-2 py-0.5 rounded border ${
                    s.status === "enabled"
                      ? "bg-green-900/50 text-green-300 border-green-700"
                      : "bg-gray-800 text-gray-400 border-gray-700"
                  }`}
                >
                  {s.status}
                </span>
              </div>
              {s.loadBalancer?.servers && (
                <div className="mt-2 space-y-1">
                  {s.loadBalancer.servers.map((srv, i) => (
                    <div
                      key={i}
                      className="text-xs text-gray-500 font-mono bg-gray-800/50 rounded px-3 py-1"
                    >
                      {srv.url}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
