import { useState, useEffect } from "react";
import {
  Server,
  Play,
  Square,
  RotateCw,
  ChevronDown,
  ChevronRight,
  Upload,
  HardDrive,
  X,
  AlertTriangle,
} from "lucide-react";
import { api } from "../api.js";

function StatusBadge({ status }) {
  const styles = {
    running: "badge-success",
    dead: "badge-danger",
    pending: "badge-warning",
    ready: "badge-success",
    initializing: "badge-warning",
    down: "badge-danger",
  };
  return (
    <span className={styles[status] || "badge-neutral"}>
      {status}
    </span>
  );
}

function DeployModal({ onClose, onDeploy }) {
  const [hcl, setHcl] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState("");

  async function handleDeploy() {
    if (!hcl.trim()) return;
    setDeploying(true);
    setError("");
    try {
      await onDeploy(hcl);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeploying(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="card w-full max-w-2xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Upload className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Deploy Job
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <textarea
          value={hcl}
          onChange={(e) => setHcl(e.target.value)}
          placeholder="Paste your HCL job specification here..."
          className="input-field h-64 font-mono resize-none"
          autoFocus
        />
        {error && (
          <div className="flex items-center gap-2 mt-3 text-sm text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleDeploy}
            disabled={!hcl.trim() || deploying}
            className="btn-primary"
          >
            {deploying ? "Deploying..." : "Deploy"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AllocationsView({ jobId }) {
  const [allocs, setAllocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getNomadAllocations(jobId)
      .then(setAllocs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) {
    return (
      <div className="px-4 pb-3 space-y-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="skeleton h-8 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (allocs.length === 0) {
    return (
      <div className="px-4 pb-3 text-sm text-gray-600">
        No allocations
      </div>
    );
  }

  return (
    <div className="px-4 pb-3 space-y-1.5">
      {allocs.map((a) => (
        <div
          key={a.ID}
          className="flex items-center gap-3 text-xs bg-surface-2 rounded-lg px-3 py-2"
        >
          <span className="text-gray-600 font-mono">
            {a.ID.slice(0, 8)}
          </span>
          <StatusBadge status={a.ClientStatus} />
          <span className="text-gray-400">{a.TaskGroup}</span>
          <span className="text-gray-600 ml-auto font-mono">
            {a.NodeName}
          </span>
        </div>
      ))}
    </div>
  );
}

function JobRow({ job, expanded, onToggle, onAction }) {
  return (
    <div className="card-hover">
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={onToggle}
          className="text-gray-600 hover:text-gray-300 transition-colors"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-white font-medium text-sm">
            {job.Name}
          </span>
          <span className="text-gray-600 text-xs ml-2">{job.Type}</span>
        </div>
        <StatusBadge status={job.Status} />
        <div className="flex gap-1.5 ml-3">
          <button
            onClick={() => onAction(job.ID, "restart")}
            className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
            title="Restart"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onAction(job.ID, "stop")}
            className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Stop"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {expanded && <AllocationsView jobId={job.ID} />}
    </div>
  );
}

function NodeRow({ node }) {
  return (
    <div className="card-hover p-4 flex items-center gap-4">
      <div
        className={`w-2 h-2 rounded-full ${
          node.Status === "ready"
            ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
            : "bg-red-400 shadow-sm shadow-red-400/50"
        }`}
      />
      <div className="flex-1 min-w-0">
        <span className="text-white text-sm font-medium">
          {node.Name}
        </span>
        <span className="text-gray-600 text-xs ml-2">
          {node.Datacenter}
        </span>
      </div>
      <StatusBadge status={node.Status} />
      <span className="text-gray-600 text-xs font-mono hidden sm:block">
        {node.Drivers ? Object.keys(node.Drivers).join(", ") : ""}
      </span>
    </div>
  );
}

export default function NomadPage() {
  const [jobs, setJobs] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeploy, setShowDeploy] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);
  const [tab, setTab] = useState("jobs");

  function loadData() {
    setLoading(true);
    Promise.all([api.getNomadJobs(), api.getNomadNodes()])
      .then(([j, n]) => {
        setJobs(j);
        setNodes(n);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAction(jobId, action) {
    try {
      if (action === "stop") await api.stopNomadJob(jobId);
      if (action === "restart") await api.restartNomadJob(jobId);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeploy(hcl) {
    await api.deployNomadJob(hcl);
    loadData();
  }

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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Server className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="page-title">Nomad</h2>
            <p className="text-sm text-gray-500">
              Manage jobs and nodes
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDeploy(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Deploy Job
        </button>
      </div>

      <div className="flex gap-6 mb-6 border-b border-white/[0.06]">
        <button
          onClick={() => setTab("jobs")}
          className={tab === "jobs" ? "tab-btn-active" : "tab-btn-inactive"}
        >
          Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setTab("nodes")}
          className={tab === "nodes" ? "tab-btn-active" : "tab-btn-inactive"}
        >
          Nodes ({nodes.length})
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : tab === "jobs" ? (
        <div className="space-y-2">
          {jobs.length === 0 && (
            <div className="card p-8 text-center">
              <Server className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No jobs found.</p>
            </div>
          )}
          {jobs.map((job) => (
            <JobRow
              key={job.ID}
              job={job}
              expanded={expandedJob === job.ID}
              onToggle={() =>
                setExpandedJob(expandedJob === job.ID ? null : job.ID)
              }
              onAction={handleAction}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {nodes.map((node) => (
            <NodeRow key={node.ID} node={node} />
          ))}
        </div>
      )}

      {showDeploy && (
        <DeployModal
          onClose={() => setShowDeploy(false)}
          onDeploy={handleDeploy}
        />
      )}
    </div>
  );
}
