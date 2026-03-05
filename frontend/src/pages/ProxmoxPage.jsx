import { useState, useEffect } from "react";
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
  const colors = {
    running: "bg-green-900/50 text-green-300 border-green-700",
    stopped: "bg-gray-800 text-gray-400 border-gray-700",
    paused: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  };
  const cls = colors[status] || "bg-gray-800 text-gray-400 border-gray-700";
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${cls}`}>
      {status}
    </span>
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
    { key: "memory", label: "Memory (MB)", placeholder: "2048", type: "number" },
    { key: "clone", label: "Clone Template ID (optional)", placeholder: "9000" },
    { key: "ipconfig0", label: "IP Config (optional)", placeholder: "ip=10.0.0.50/24,gw=10.0.0.1" },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-white mb-4">Create VM</h3>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
              <input
                type={f.type || "text"}
                value={form[f.key]}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white
                           text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
                       disabled:opacity-40"
          >
            {creating ? "Creating..." : "Create"}
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
      <div className="bg-red-900/30 border border-red-800 rounded p-4 text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Proxmox</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Create VM
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading VMs...</div>
      ) : (
        <div className="space-y-2">
          {vms.length === 0 && (
            <p className="text-gray-600">No VMs found.</p>
          )}
          {vms.map((vm) => (
            <div
              key={`${vm.node}-${vm.vmid}`}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <span className="text-white font-medium">
                    {vm.name || `VM ${vm.vmid}`}
                  </span>
                  <span className="text-gray-600 text-xs ml-2">
                    {vm.node} / {vm.vmid}
                  </span>
                </div>
                <VMStatusBadge status={vm.status} />
                <div className="text-right text-xs text-gray-500 hidden sm:block">
                  <div>CPU: {((vm.cpu || 0) * 100).toFixed(1)}%</div>
                  <div>
                    RAM: {formatBytes(vm.mem)} / {formatBytes(vm.maxmem)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(vm.node, vm.vmid, "start")}
                    disabled={vm.status === "running"}
                    className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400
                               hover:text-green-400 hover:bg-gray-700
                               disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => handleAction(vm.node, vm.vmid, "restart")}
                    className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400
                               hover:text-white hover:bg-gray-700"
                  >
                    Restart
                  </button>
                  <button
                    onClick={() => handleAction(vm.node, vm.vmid, "stop")}
                    disabled={vm.status !== "running"}
                    className="text-xs px-2 py-1 bg-gray-800 rounded text-gray-400
                               hover:text-red-400 hover:bg-gray-700
                               disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Stop
                  </button>
                </div>
              </div>
            </div>
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
