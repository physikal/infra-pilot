import { useState, useEffect } from "react";
import {
  Monitor,
  Play,
  Square,
  RotateCw,
  Plus,
  Cpu,
  MemoryStick,
  X,
  AlertTriangle,
} from "lucide-react";
import { api } from "../api.js";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

function VMStatusBadge({ status }) {
  const styles = {
    running: "badge-success",
    stopped: "badge-neutral",
    paused: "badge-warning",
  };
  return (
    <span className={styles[status] || "badge-neutral"}>{status}</span>
  );
}

function CreateVMModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    node: "",
    vmid: "",
    name: "",
    cores: "2",
    memory: "2048",
    clone: "",
    ipconfig0: "",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    if (!form.node || !form.vmid || !form.name) {
      setError("Node, VM ID, and name are required");
      return;
    }
    setCreating(true);
    setError("");
    try {
      await onCreate(form.node, {
        vmid: parseInt(form.vmid, 10),
        name: form.name,
        cores: parseInt(form.cores, 10),
        memory: parseInt(form.memory, 10),
        clone: form.clone || undefined,
        ipconfig0: form.ipconfig0 || undefined,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  const fields = [
    { key: "node", label: "Node", placeholder: "pve" },
    { key: "vmid", label: "VM ID", placeholder: "100", type: "number" },
    { key: "name", label: "Name", placeholder: "my-vm" },
    { key: "cores", label: "CPU Cores", placeholder: "2", type: "number" },
    {
      key: "memory",
      label: "Memory (MB)",
      placeholder: "2048",
      type: "number",
    },
    {
      key: "clone",
      label: "Clone Template ID (optional)",
      placeholder: "9000",
    },
    {
      key: "ipconfig0",
      label: "IP Config (optional)",
      placeholder: "ip=10.0.0.50/24,gw=10.0.0.1",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="card w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Monitor className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Create VM
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                {f.label}
              </label>
              <input
                type={f.type || "text"}
                value={form[f.key]}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="input-field"
              />
            </div>
          ))}
        </div>
        {error && (
          <div className="flex items-center gap-2 mt-3 text-sm text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="btn-primary"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VMCard({ vm, onAction }) {
  const cpuPercent = ((vm.cpu || 0) * 100).toFixed(1);

  return (
    <div className="card-hover p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm">
              {vm.name || `VM ${vm.vmid}`}
            </span>
            <VMStatusBadge status={vm.status} />
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            <span className="font-mono">
              {vm.node}/{vm.vmid}
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              {cpuPercent}%
            </span>
            <span className="flex items-center gap-1">
              <MemoryStick className="w-3 h-3" />
              {formatBytes(vm.mem)} / {formatBytes(vm.maxmem)}
            </span>
          </div>
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => onAction(vm.node, vm.vmid, "start")}
            disabled={vm.status === "running"}
            className="p-1.5 rounded-md text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10
                       transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-500
                       disabled:hover:bg-transparent"
            title="Start"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onAction(vm.node, vm.vmid, "restart")}
            className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
            title="Restart"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onAction(vm.node, vm.vmid, "stop")}
            disabled={vm.status !== "running"}
            className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10
                       transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-500
                       disabled:hover:bg-transparent"
            title="Stop"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProxmoxPage() {
  const [vms, setVMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  function loadVMs() {
    setLoading(true);
    api
      .getProxmoxVMs()
      .then(setVMs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadVMs();
  }, []);

  async function handleAction(node, vmid, action) {
    try {
      if (action === "start") await api.startProxmoxVM(node, vmid);
      if (action === "stop") await api.stopProxmoxVM(node, vmid);
      if (action === "restart") await api.restartProxmoxVM(node, vmid);
      loadVMs();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreate(node, config) {
    await api.createProxmoxVM(node, config);
    loadVMs();
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
            <Monitor className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="page-title">Proxmox</h2>
            <p className="text-sm text-gray-500">
              Virtual machines
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create VM
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {vms.length === 0 && (
            <div className="card p-8 text-center">
              <Monitor className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No VMs found.</p>
            </div>
          )}
          {vms.map((vm) => (
            <VMCard
              key={`${vm.node}-${vm.vmid}`}
              vm={vm}
              onAction={handleAction}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateVMModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
