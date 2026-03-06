import { useState, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import {
  Rocket,
  Search,
  X,
  Plus,
  Trash2,
  RotateCw,
  Square,
  Play,
  ExternalLink,
  ArrowLeft,
  AlertTriangle,
  Check,
  ChevronRight,
  Github,
  Container,
} from "lucide-react";
import { api } from "../api.js";

const QUICK_DEPLOY = [
  {
    name: "n8n",
    image: "n8nio/n8n",
    description: "Workflow automation",
    port: 5678,
  },
  {
    name: "Portainer",
    image: "portainer/portainer-ce",
    description: "Container management",
    port: 9000,
  },
  {
    name: "Uptime Kuma",
    image: "louislam/uptime-kuma",
    description: "Monitoring tool",
    port: 3001,
  },
  {
    name: "Gitea",
    image: "gitea/gitea",
    description: "Git hosting",
    port: 3000,
  },
];

function StatusBadge({ status }) {
  const styles = {
    running: "badge-success",
    stopped: "badge-danger",
    pending: "badge-warning",
    deploying: "badge-warning",
    failed: "badge-danger",
  };
  return (
    <span className={styles[status] || "badge-neutral"}>{status}</span>
  );
}

function StatusDot({ status }) {
  const colors = {
    running: "bg-emerald-400 shadow-sm shadow-emerald-400/50",
    stopped: "bg-red-400 shadow-sm shadow-red-400/50",
    pending: "bg-amber-400 shadow-sm shadow-amber-400/50",
    deploying: "bg-amber-400 shadow-sm shadow-amber-400/50 animate-pulse",
    failed: "bg-red-400 shadow-sm shadow-red-400/50",
  };
  return (
    <div
      className={`w-2 h-2 rounded-full ${colors[status] || "bg-gray-500"}`}
    />
  );
}

function DeployWizardModal({ onClose, onDeployed, prefill }) {
  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState(prefill ? "docker_hub" : "");
  const [image, setImage] = useState(prefill?.image || "");
  const [sourceMeta, setSourceMeta] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubStatus, setGithubStatus] = useState(null);

  const [appName, setAppName] = useState(prefill?.name || "");
  const [cpu, setCpu] = useState(200);
  const [memory, setMemory] = useState(256);
  const [port, setPort] = useState(prefill?.port || 80);
  const [envVars, setEnvVars] = useState([]);

  const [routing, setRouting] = useState("internal");
  const [subdomain, setSubdomain] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [zones, setZones] = useState([]);
  const [selectedZoneName, setSelectedZoneName] = useState("");

  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (prefill) {
      setStep(2);
      setSourceType("docker_hub");
    }
  }, [prefill]);

  const searchDockerHub = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await api.searchDockerHub(q);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchDockerHub(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchDockerHub]);

  function selectDockerImage(result) {
    const img = result.is_official
      ? result.repo_name
      : result.repo_name;
    setImage(img);
    setSourceType("docker_hub");
    setSourceMeta({ repo_name: result.repo_name, is_official: result.is_official });
    if (!appName) {
      setAppName(
        result.repo_name.includes("/")
          ? result.repo_name.split("/").pop()
          : result.repo_name
      );
    }
    setStep(2);
  }

  function selectGithubRepo(repo) {
    setSourceType("github");
    setSourceMeta({ full_name: repo.full_name, html_url: repo.html_url });
    if (!appName) setAppName(repo.name);
    setStep(2);
  }

  async function loadGithubRepos() {
    try {
      const status = await api.getGitHubStatus();
      setGithubStatus(status);
      if (status.connected) {
        const repos = await api.getGitHubRepos();
        setGithubRepos(repos);
      }
    } catch {
      setGithubStatus({ connected: false });
    }
  }

  async function loadZones() {
    try {
      const z = await api.getCloudflareZones();
      setZones(z);
    } catch {
      setZones([]);
    }
  }

  function addEnvVar() {
    setEnvVars([...envVars, { key: "", value: "" }]);
  }

  function updateEnvVar(index, field, value) {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  }

  function removeEnvVar(index) {
    setEnvVars(envVars.filter((_, i) => i !== index));
  }

  function buildDomain() {
    if (!subdomain || !selectedZoneName) return "";
    return `${subdomain}.${selectedZoneName}`;
  }

  async function handleDeploy() {
    setDeploying(true);
    setError("");
    try {
      const envObj = {};
      for (const { key, value } of envVars) {
        if (key.trim()) envObj[key.trim()] = value;
      }

      const domain = routing === "external" ? buildDomain() : null;

      await api.deployApp({
        name: appName,
        source_type: sourceType,
        image,
        source_meta: sourceMeta,
        cpu,
        memory,
        port: port || null,
        env_vars: envObj,
        routing,
        domain,
        zone_id: routing === "external" ? zoneId : null,
      });

      onDeployed();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeploying(false);
    }
  }

  function canProceed() {
    if (step === 1) return !!image && !!sourceType;
    if (step === 2) return !!appName.trim();
    if (step === 3) {
      if (routing === "external") return !!subdomain && !!zoneId;
      return true;
    }
    return true;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="card w-full max-w-2xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Rocket className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-white">Deploy App</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {["Source", "Configure", "Routing", "Review"].map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  step > i + 1
                    ? "bg-accent text-white"
                    : step === i + 1
                      ? "bg-accent/20 text-accent border border-accent/40"
                      : "bg-surface-2 text-gray-600"
                }`}
              >
                {step > i + 1 ? (
                  <Check className="w-3 h-3" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs ${
                  step === i + 1 ? "text-white" : "text-gray-600"
                }`}
              >
                {label}
              </span>
              {i < 3 && (
                <div className="flex-1 h-px bg-white/[0.06]" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Source */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSourceType("docker_hub")}
                className={`card-hover p-4 text-left ${
                  sourceType === "docker_hub"
                    ? "border-accent/40 bg-accent/5"
                    : ""
                }`}
              >
                <Container className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-sm font-medium text-white">Docker Hub</p>
                <p className="text-xs text-gray-500 mt-1">
                  Search public images
                </p>
              </button>
              <button
                onClick={() => {
                  setSourceType("github");
                  loadGithubRepos();
                }}
                className={`card-hover p-4 text-left ${
                  sourceType === "github"
                    ? "border-accent/40 bg-accent/5"
                    : ""
                }`}
              >
                <Github className="w-5 h-5 text-white mb-2" />
                <p className="text-sm font-medium text-white">GitHub</p>
                <p className="text-xs text-gray-500 mt-1">
                  From your repositories
                </p>
              </button>
            </div>

            {sourceType === "docker_hub" && (
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Docker Hub..."
                    className="input-field pl-9"
                    autoFocus
                  />
                </div>
                {searching && (
                  <p className="text-xs text-gray-500 mt-2">Searching...</p>
                )}
                <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto">
                  {searchResults.map((r) => (
                    <button
                      key={r.repo_name}
                      onClick={() => selectDockerImage(r)}
                      className="w-full text-left card-hover p-3 flex items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {r.repo_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {r.short_description}
                        </p>
                      </div>
                      {r.is_official && (
                        <span className="badge-success text-[10px]">
                          Official
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1.5">
                    Or enter image directly:
                  </p>
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => {
                      setImage(e.target.value);
                      setSourceType("docker_hub");
                    }}
                    placeholder="e.g. nginx:latest"
                    className="input-field"
                  />
                </div>
              </div>
            )}

            {sourceType === "github" && (
              <div>
                {githubStatus === null ? (
                  <p className="text-sm text-gray-500">
                    Loading GitHub status...
                  </p>
                ) : !githubStatus.connected ? (
                  <div className="card p-4 text-center">
                    <Github className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 mb-3">
                      Connect GitHub to deploy from your repos
                    </p>
                    <a
                      href="/settings?tab=github"
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <Github className="w-4 h-4" />
                      Connect GitHub
                    </a>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {githubRepos.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No repositories found
                      </p>
                    ) : (
                      githubRepos.map((repo) => (
                        <button
                          key={repo.id}
                          onClick={() => selectGithubRepo(repo)}
                          className="w-full text-left card-hover p-3 flex items-center gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">
                              {repo.full_name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {repo.description || "No description"}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                        </button>
                      ))
                    )}
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1.5">
                        Image reference (GHCR, Docker Hub, etc):
                      </p>
                      <input
                        type="text"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                        placeholder="e.g. ghcr.io/owner/repo:latest"
                        className="input-field"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Configure */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                App Name
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="my-app"
                className="input-field"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Image
              </label>
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">CPU (MHz)</label>
              <div className="flex gap-2">
                {[100, 200, 500, 1000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setCpu(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      cpu === v
                        ? "bg-accent/20 text-accent border border-accent/40"
                        : "bg-surface-2 text-gray-400 hover:text-white"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2">
                Memory (MB)
              </label>
              <div className="flex gap-2">
                {[128, 256, 512, 1024].map((v) => (
                  <button
                    key={v}
                    onClick={() => setMemory(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      memory === v
                        ? "bg-accent/20 text-accent border border-accent/40"
                        : "bg-surface-2 text-gray-400 hover:text-white"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Container Port
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10) || 0)}
                placeholder="80"
                className="input-field w-32"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-gray-400">
                  Environment Variables
                </label>
                <button
                  onClick={addEnvVar}
                  className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              {envVars.length === 0 && (
                <p className="text-xs text-gray-600">
                  No environment variables configured
                </p>
              )}
              <div className="space-y-2">
                {envVars.map((env, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={env.key}
                      onChange={(e) => updateEnvVar(i, "key", e.target.value)}
                      placeholder="KEY"
                      className="input-field flex-1 font-mono text-xs"
                    />
                    <input
                      type="text"
                      value={env.value}
                      onChange={(e) =>
                        updateEnvVar(i, "value", e.target.value)
                      }
                      placeholder="value"
                      className="input-field flex-1 font-mono text-xs"
                    />
                    <button
                      onClick={() => removeEnvVar(i)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Routing */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRouting("internal")}
                className={`card-hover p-4 text-left ${
                  routing === "internal"
                    ? "border-accent/40 bg-accent/5"
                    : ""
                }`}
              >
                <p className="text-sm font-medium text-white">Internal</p>
                <p className="text-xs text-gray-500 mt-1">
                  Accessible within cluster only
                </p>
              </button>
              <button
                onClick={() => {
                  setRouting("external");
                  loadZones();
                }}
                className={`card-hover p-4 text-left ${
                  routing === "external"
                    ? "border-accent/40 bg-accent/5"
                    : ""
                }`}
              >
                <p className="text-sm font-medium text-white">External</p>
                <p className="text-xs text-gray-500 mt-1">
                  Public HTTPS via Traefik + DNS
                </p>
              </button>
            </div>

            {routing === "external" && (
              <div className="space-y-3">
                {zones.length === 0 ? (
                  <div className="card p-4 text-center">
                    <p className="text-sm text-gray-400">
                      Configure Cloudflare in{" "}
                      <a
                        href="/settings"
                        className="text-accent hover:text-accent-hover"
                      >
                        Settings
                      </a>{" "}
                      to enable external routing.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        DNS Zone
                      </label>
                      <select
                        value={zoneId}
                        onChange={(e) => {
                          setZoneId(e.target.value);
                          const zone = zones.find(
                            (z) => z.id === e.target.value
                          );
                          setSelectedZoneName(zone ? zone.name : "");
                        }}
                        className="input-field"
                      >
                        <option value="">Select a zone...</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">
                        Subdomain
                      </label>
                      <input
                        type="text"
                        value={subdomain}
                        onChange={(e) => setSubdomain(e.target.value)}
                        placeholder="my-app"
                        className="input-field"
                      />
                    </div>
                    {subdomain && selectedZoneName && (
                      <p className="text-xs text-gray-400">
                        URL:{" "}
                        <span className="text-accent">
                          https://{subdomain}.{selectedZoneName}
                        </span>
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-3">
            <div className="bg-surface-2 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Name</span>
                <span className="text-white">{appName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Image</span>
                <span className="text-white font-mono text-xs">{image}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Resources</span>
                <span className="text-white">
                  {cpu} MHz / {memory} MB
                </span>
              </div>
              {port > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Port</span>
                  <span className="text-white">{port}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Routing</span>
                <span className="text-white capitalize">{routing}</span>
              </div>
              {routing === "external" && buildDomain() && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Domain</span>
                  <span className="text-accent">{buildDomain()}</span>
                </div>
              )}
              {envVars.filter((e) => e.key.trim()).length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Env Vars</span>
                  <span className="text-white">
                    {envVars.filter((e) => e.key.trim()).length} configured
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 mt-4 text-sm text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="btn-ghost"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="btn-primary"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleDeploy}
                disabled={deploying}
                className="btn-primary"
              >
                {deploying ? "Deploying..." : "Deploy"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppRow({ app, onAction }) {
  const navigate = useNavigate();

  return (
    <div
      className="card-hover cursor-pointer"
      onClick={() => navigate(`/apps/${app.id}`)}
    >
      <div className="flex items-center gap-3 p-4">
        <StatusDot status={app.status} />
        <div className="flex-1 min-w-0">
          <span className="text-white font-medium text-sm">{app.name}</span>
          <span className="text-gray-600 text-xs ml-2 font-mono">
            {app.image}
          </span>
        </div>
        <StatusBadge status={app.status} />
        <div
          className="flex gap-1.5 ml-3"
          onClick={(e) => e.stopPropagation()}
        >
          {app.status === "stopped" ? (
            <button
              onClick={() => onAction(app.id, "start")}
              className="p-1.5 rounded-md text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
              title="Start"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <button
                onClick={() => onAction(app.id, "restart")}
                className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
                title="Restart"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAction(app.id, "stop")}
                className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Stop"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {app.domain && (
            <a
              href={`https://${app.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-gray-500 hover:text-accent hover:bg-accent/10 transition-all"
              title="Open"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function AppsListView() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeploy, setShowDeploy] = useState(false);
  const [prefill, setPrefill] = useState(null);

  function loadApps() {
    setLoading(true);
    api
      .getApps()
      .then(setApps)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadApps();
  }, []);

  async function handleAction(appId, action) {
    try {
      if (action === "stop") await api.stopApp(appId);
      if (action === "start") await api.startApp(appId);
      if (action === "restart") await api.restartApp(appId);
      loadApps();
    } catch (err) {
      setError(err.message);
    }
  }

  function openQuickDeploy(preset) {
    setPrefill(preset);
    setShowDeploy(true);
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
            <Rocket className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="page-title">Apps</h2>
            <p className="text-sm text-gray-500">
              Deploy and manage applications
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setPrefill(null);
            setShowDeploy(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Deploy App
        </button>
      </div>

      {/* Quick Deploy */}
      {apps.length > 0 && (
        <div className="mb-6">
          <p className="section-title mb-3">Quick Deploy</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK_DEPLOY.map((preset) => (
              <button
                key={preset.name}
                onClick={() => openQuickDeploy(preset)}
                className="card-hover p-3 text-left"
              >
                <p className="text-sm text-white font-medium">
                  {preset.name}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="card p-12 text-center">
          <Rocket className="w-10 h-10 text-gray-700 mx-auto mb-4" />
          <h3 className="text-white font-medium mb-2">
            Deploy your first app
          </h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Search Docker Hub for any image or connect GitHub to deploy from
            your repos.
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => {
                setPrefill(null);
                setShowDeploy(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Deploy App
            </button>
            <p className="section-title mt-4 mb-2">Or try a quick start</p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {QUICK_DEPLOY.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => openQuickDeploy(preset)}
                  className="card-hover p-3 text-left"
                >
                  <p className="text-sm text-white font-medium">
                    {preset.name}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {apps.map((app) => (
            <AppRow key={app.id} app={app} onAction={handleAction} />
          ))}
        </div>
      )}

      {showDeploy && (
        <DeployWizardModal
          onClose={() => {
            setShowDeploy(false);
            setPrefill(null);
          }}
          onDeployed={loadApps}
          prefill={prefill}
        />
      )}
    </div>
  );
}

function AppDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    api
      .getApp(id)
      .then(setApp)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAction(action) {
    try {
      if (action === "stop") await api.stopApp(id);
      if (action === "start") await api.startApp(id);
      if (action === "restart") await api.restartApp(id);
      const updated = await api.getApp(id);
      setApp(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    try {
      await api.deleteApp(id);
      navigate("/apps");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="skeleton h-10 w-48 rounded-xl" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
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

  if (!app) return null;

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => navigate("/apps")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Apps
      </button>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="page-title">{app.name}</h2>
            <StatusBadge status={app.status} />
          </div>
        </div>
        <div className="flex gap-2">
          {app.status === "stopped" ? (
            <button
              onClick={() => handleAction("start")}
              className="btn-ghost flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          ) : (
            <>
              <button
                onClick={() => handleAction("restart")}
                className="btn-ghost flex items-center gap-2"
              >
                <RotateCw className="w-4 h-4" />
                Restart
              </button>
              <button
                onClick={() => handleAction("stop")}
                className="btn-ghost flex items-center gap-2 text-red-400 hover:text-red-300"
              >
                <Square className="w-4 h-4" />
                Stop
              </button>
            </>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-ghost flex items-center gap-2 text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-medium text-white mb-4">Overview</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <p className="text-sm text-white mt-1 capitalize">{app.status}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Image</p>
            <p className="text-sm text-white mt-1 font-mono">{app.image}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Resources</p>
            <p className="text-sm text-white mt-1">
              {app.cpu} MHz / {app.memory} MB
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Port</p>
            <p className="text-sm text-white mt-1">{app.port || "None"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Routing</p>
            <p className="text-sm text-white mt-1 capitalize">
              {app.routing}
            </p>
          </div>
          {app.domain && (
            <div>
              <p className="text-xs text-gray-500">Domain</p>
              <a
                href={`https://${app.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:text-accent-hover mt-1 inline-flex items-center gap-1"
              >
                {app.domain}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500">Created</p>
            <p className="text-sm text-white mt-1">
              {new Date(app.created_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Source</p>
            <p className="text-sm text-white mt-1 capitalize">
              {app.source_type.replace("_", " ")}
            </p>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="card w-full max-w-sm p-6 animate-slide-up">
            <h3 className="text-lg font-semibold text-white mb-2">
              Delete {app.name}?
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              This will stop the Nomad job, remove DNS records, and delete all
              app data. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppsPage() {
  return (
    <Routes>
      <Route path="/" element={<AppsListView />} />
      <Route path="/:id" element={<AppDetailView />} />
    </Routes>
  );
}
