import { useState, useEffect } from "react";
import { api } from "../api.js";

function Card({ title, children, error }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-3">{title}</h3>
      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        children
      )}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-400">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-red-400">Failed to load dashboard: {error}</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">
        {data.instanceName}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {data.nomad && (
          <Card
            title="Nomad"
            error={data.nomad.error}
          >
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Running Jobs" value={data.nomad.runningJobs} />
              <Stat label="Total Jobs" value={data.nomad.totalJobs} />
              <Stat
                label="Nodes"
                value={data.nomad.nodeCount}
                sub={`${data.nomad.healthyNodes} healthy`}
              />
              <Stat label="Failed" value={data.nomad.failedJobs} />
            </div>
          </Card>
        )}

        {data.proxmox && (
          <Card
            title="Proxmox"
            error={data.proxmox.error}
          >
            <Stat label="Nodes" value={data.proxmox.nodeCount} />
            <div className="mt-2 space-y-1">
              {data.proxmox.nodes?.map((n) => (
                <div key={n.name} className="flex items-center gap-2 text-sm">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      n.status === "online" ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-gray-300">{n.name}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {data.traefik && (
          <Card
            title="Traefik"
            error={data.traefik.error}
          >
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Routes" value={data.traefik.routerCount} />
              <Stat label="Services" value={data.traefik.serviceCount} />
            </div>
          </Card>
        )}

        {data.integrations?.length === 0 && (
          <Card title="No Integrations">
            <p className="text-gray-500 text-sm">
              Go to Settings to configure your integrations.
            </p>
          </Card>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Recent Activity
        </h3>
        {data.activity?.length > 0 ? (
          <div className="space-y-2">
            {data.activity.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 text-sm py-1"
              >
                <span className="text-gray-600 text-xs whitespace-nowrap">
                  {new Date(item.created_at + "Z").toLocaleString()}
                </span>
                <span className="text-gray-500 bg-gray-800 px-2 py-0.5 rounded text-xs">
                  {item.type}
                </span>
                <span className="text-gray-300">{item.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-sm">No activity yet.</p>
        )}
      </div>
    </div>
  );
}
