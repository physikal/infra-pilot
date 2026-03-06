import { useState, useEffect } from "react";
import {
  Server,
  Monitor,
  Network,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { api } from "../api.js";

function StatCard({ icon: Icon, label, value, sub, color = "accent" }) {
  const colorMap = {
    accent: "from-accent/20 to-accent/5 text-accent",
    emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-400",
    amber: "from-amber-500/20 to-amber-500/5 text-amber-400",
    red: "from-red-500/20 to-red-500/5 text-red-400",
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colorMap[color]} flex items-center justify-center`}
        >
          <Icon className="w-4 h-4" />
        </div>
        {sub && (
          <span className="text-xs text-gray-500">{sub}</span>
        )}
      </div>
      <div className="text-2xl font-bold text-white tracking-tight">
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function IntegrationCard({ title, icon: Icon, error, children }) {
  if (error) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-red-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <span className="badge-danger ml-auto">Error</span>
        </div>
        <p className="text-sm text-red-400/80">{error}</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-accent" />
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function NodeStatus({ name, status }) {
  const online = status === "online" || status === "ready";
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      {online ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-red-400" />
      )}
      <span className="text-sm text-gray-300">{name}</span>
      <span
        className={`text-xs ml-auto ${
          online ? "text-emerald-400/60" : "text-red-400/60"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

function ActivityItem({ item }) {
  const typeColors = {
    nomad: "text-indigo-400 bg-indigo-400/10",
    proxmox: "text-cyan-400 bg-cyan-400/10",
    cloudflare: "text-orange-400 bg-orange-400/10",
    traefik: "text-teal-400 bg-teal-400/10",
  };
  const cls =
    typeColors[item.type] || "text-gray-400 bg-white/[0.06]";

  return (
    <div className="flex items-center gap-3 py-2.5 group">
      <Activity className="w-3.5 h-3.5 text-gray-600 shrink-0" />
      <span className="text-[11px] text-gray-600 font-mono whitespace-nowrap">
        {new Date(item.created_at + "Z").toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>
        {item.type}
      </span>
      <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors truncate">
        {item.message}
      </span>
    </div>
  );
}

function SkeletonDashboard() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton h-8 w-48 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4">
            <div className="skeleton w-9 h-9 rounded-lg mb-3" />
            <div className="skeleton h-7 w-16 mb-1" />
            <div className="skeleton h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="card p-5">
        <div className="skeleton h-4 w-32 mb-4" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-8 w-full mb-2 last:mb-0" />
        ))}
      </div>
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

  if (loading) return <SkeletonDashboard />;

  if (error) {
    return (
      <div className="card p-6 border-red-500/20">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-400">
              Failed to load dashboard
            </p>
            <p className="text-xs text-red-400/60 mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="page-title">{data.instanceName}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Infrastructure overview
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {data.nomad && !data.nomad.error && (
          <>
            <StatCard
              icon={Server}
              label="Running Jobs"
              value={data.nomad.runningJobs}
              sub={`of ${data.nomad.totalJobs}`}
              color="emerald"
            />
            <StatCard
              icon={ArrowUpRight}
              label="Nomad Nodes"
              value={data.nomad.nodeCount}
              sub={`${data.nomad.healthyNodes} healthy`}
              color="accent"
            />
          </>
        )}
        {data.proxmox && !data.proxmox.error && (
          <StatCard
            icon={Monitor}
            label="Proxmox Nodes"
            value={data.proxmox.nodeCount}
            color="accent"
          />
        )}
        {data.traefik && !data.traefik.error && (
          <StatCard
            icon={Network}
            label="Traefik Routes"
            value={data.traefik.routerCount}
            sub={`${data.traefik.serviceCount} services`}
            color="accent"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {data.nomad && (
          <IntegrationCard
            title="Nomad"
            icon={Server}
            error={data.nomad.error}
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-2 rounded-lg px-3 py-2.5 text-center">
                <div className="text-lg font-bold text-white">
                  {data.nomad.runningJobs}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Running
                </div>
              </div>
              <div className="bg-surface-2 rounded-lg px-3 py-2.5 text-center">
                <div className="text-lg font-bold text-white">
                  {data.nomad.totalJobs}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Total
                </div>
              </div>
              <div className="bg-surface-2 rounded-lg px-3 py-2.5 text-center">
                <div className="text-lg font-bold text-red-400">
                  {data.nomad.failedJobs}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Failed
                </div>
              </div>
            </div>
          </IntegrationCard>
        )}

        {data.proxmox && (
          <IntegrationCard
            title="Proxmox"
            icon={Monitor}
            error={data.proxmox.error}
          >
            <div className="divide-y divide-white/[0.04]">
              {data.proxmox.nodes?.map((n) => (
                <NodeStatus
                  key={n.name}
                  name={n.name}
                  status={n.status}
                />
              ))}
            </div>
          </IntegrationCard>
        )}
      </div>

      {data.integrations?.length === 0 && (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
            <Server className="w-6 h-6 text-gray-600" />
          </div>
          <p className="text-gray-400 text-sm font-medium">
            No integrations configured
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Go to Settings to connect your infrastructure.
          </p>
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-white">
            Recent Activity
          </h3>
        </div>
        {data.activity?.length > 0 ? (
          <div className="divide-y divide-white/[0.04]">
            {data.activity.map((item) => (
              <ActivityItem key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-gray-600 text-sm py-4 text-center">
            No activity recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}
