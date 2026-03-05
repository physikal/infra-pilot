import { useState, useEffect } from "react";
import { api } from "../api.js";

function StatusBadge({ status }) {
  const colors = {
    running: "bg-green-900/50 text-green-300 border-green-700",
    dead: "bg-red-900/50 text-red-300 border-red-700",
    pending: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  };
  const cls = colors[status] || "bg-gray-800 text-gray-400 border-gray-700";
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${cls}`}>
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Deploy Job</h3>
        <textarea
          value={hcl}
          onChange={(e) => setHcl(e.target.value)}
          placeholder="Paste your HCL job specification here..."
          className="w-full h-64 bg-gray-800 border border-gray-700 rounded p-3 text-white
                     font-mono text-sm focus:outline-none focus:border-blue-500 resize-none"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleDeploy}
            disabled={!hcl.trim() || deploying}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
                       disabled:opacity-40 disabled:cursor-not-allowed"
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

  if (loading) return <div className="text-gray-500 text-sm p-2">Loading...</div>;
  if (allocs.length === 0) return <div className="text-gray-600 text-sm p-2">No allocations</div>;

  return (
    <div className="mt-2 space-y-1">
      {allocs.map((a) => (
        <div key={a.ID} className="flex items-center gap-3 text-xs bg-gray-800/50 rounded px-3 py-2">
          <span className="text-gray-500 font-mono">{a.ID.slice(0, 8)}</span>
          <StatusBadge status={a.ClientStatus} />
          <span className="text-gray-400">{a.TaskGroup}</span>
          <span className="text-gray-600 ml-auto">{a.NodeName}</span>
        </div>
      ))}
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
      <div className="bg-red-900/30 border border-red-800 rounded p-4 text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Nomad</h2>
        <button
          onClick={() => setShowDeploy(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Deploy Job
        </button>
      </div>

      <div className="flex gap-4 mb-4 border-b border-gray-800">
        <button
          onClick={() => setTab("jobs")}
          className={`pb-2 text-sm ${
            tab === "jobs"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Jobs ({jobs.length})
        </button>
        <button
          onClick={() => setTab("nodes")}
          className={`pb-2 text-sm ${
            tab === "nodes"
              ? "text-white border-b-2 border-blue-500"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Nodes ({nodes.length})
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : tab === "jobs" ? (
        <div className="space-y-2">
          {jobs.length === 0 && (
            <p className="text-gray-600">No jobs found.</p>
          )}
          {jobs.map((job) => (
            <div key={job.ID} className="bg-gray-900 border border-gray-800 rounded-lg">
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() =>
                    setExpandedJob(expandedJob === job.ID ? null : job.ID)
                  }
                  className="text-gray-500 hover:text-white"
                >
                  {expandedJob === job.ID ? "\u25BC" : "\u25B6"}
                </button>
                <div className="flex-1">
                  <span className="text-white font-medium">{job.Name}</span>
                  <span className="text-gray-600 text-xs ml-2">{job.Type}</span>
                </div>
                <StatusBadge status={job.Status} />
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleAction(job.ID, "restart")}
                    className="text-xs px-2 py-1 text-gray-400 hover:text-white
                               bg-gray-800 rounded hover:bg-gray-700"
                  >
                    Restart
                  </button>
                  <button
                    onClick={() => handleAction(job.ID, "stop")}
                    className="text-xs px-2 py-1 text-gray-400 hover:text-red-400
                               bg-gray-800 rounded hover:bg-gray-700"
                  >
                    Stop
                  </button>
                </div>
              </div>
              {expandedJob === job.ID && <AllocationsView jobId={job.ID} />}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {nodes.map((node) => (
            <div
              key={node.ID}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center gap-4"
            >
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  node.Status === "ready" ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <div className="flex-1">
                <span className="text-white">{node.Name}</span>
                <span className="text-gray-600 text-xs ml-2">
                  {node.Datacenter}
                </span>
              </div>
              <span className="text-gray-500 text-sm">{node.Status}</span>
              <span className="text-gray-600 text-xs">
                {node.Drivers ? Object.keys(node.Drivers).join(", ") : ""}
              </span>
            </div>
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
