import { useState, useEffect } from "react";
import {
  Settings,
  Pencil,
  Trash2,
  Plus,
  Shield,
  Link,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { api } from "../api.js";

const INTEGRATION_DEFS = {
  nomad: {
    title: "Nomad",
    fields: [
      {
        key: "url",
        label: "API URL",
        placeholder: "http://your-nomad-server:4646",
        required: true,
      },
      {
        key: "token",
        label: "ACL Token",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        type: "password",
      },
    ],
  },
  proxmox: {
    title: "Proxmox",
    fields: [
      {
        key: "url",
        label: "API URL",
        placeholder: "https://your-proxmox:8006",
        required: true,
      },
      { key: "node", label: "Default Node Name", placeholder: "pve" },
      {
        key: "tokenId",
        label: "API Token ID",
        placeholder: "user@pam!token-name",
        required: true,
      },
      {
        key: "tokenSecret",
        label: "API Token Secret",
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        type: "password",
        required: true,
      },
    ],
  },
  cloudflare: {
    title: "Cloudflare",
    fields: [
      {
        key: "apiToken",
        label: "API Token",
        placeholder: "your-cloudflare-api-token",
        type: "password",
        required: true,
      },
    ],
  },
  traefik: {
    title: "Traefik",
    fields: [
      {
        key: "url",
        label: "API URL",
        placeholder: "http://your-traefik:8080",
        required: true,
      },
    ],
  },
};

function IntegrationModal({ title, def, onClose, onSaved }) {
  const [values, setValues] = useState({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const integrationId = Object.keys(INTEGRATION_DEFS).find(
    (k) => INTEGRATION_DEFS[k] === def
  );

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setError("");
    try {
      const result = await api.testIntegration(integrationId, values);
      setTestResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.saveIntegration(integrationId, values);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const hasRequired = def.fields
    .filter((f) => f.required)
    .every((f) => values[f.key]?.trim());

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="card w-full max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Link className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          {def.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                {field.label}
                {field.required && (
                  <span className="text-red-400 ml-1">*</span>
                )}
              </label>
              <input
                type={field.type || "text"}
                value={values[field.key] || ""}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
                placeholder={field.placeholder}
                className="input-field"
              />
            </div>
          ))}
        </div>

        {testResult && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
              testResult.ok
                ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
            }`}
          >
            {testResult.ok ? (
              <>
                <Check className="w-4 h-4 shrink-0" />
                Connection successful
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <div>
                  <p>Connection failed: {testResult.error}</p>
                  {testResult.suggestion && (
                    <p className="text-gray-400 mt-1 text-xs">
                      {testResult.suggestion}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 mb-4 text-sm text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            onClick={handleTest}
            disabled={!hasRequired || testing}
            className="btn-secondary"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <button
            onClick={handleSave}
            disabled={!testResult?.ok || saving}
            className="btn-primary"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({ integration, onReconfigure, onDelete }) {
  const [details, setDetails] = useState(null);
  const [expanded, setExpanded] = useState(false);

  async function loadDetails() {
    if (details) {
      setExpanded(!expanded);
      return;
    }
    try {
      const data = await api.getIntegrationDetails(integration.id);
      setDetails(data);
      setExpanded(true);
    } catch {
      setExpanded(false);
    }
  }

  return (
    <div className="card-hover">
      <div className="flex items-center gap-4 p-4">
        <div
          className={`w-2 h-2 rounded-full ${
            integration.enabled
              ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
              : "bg-gray-600"
          }`}
        />
        <div className="flex-1 min-w-0">
          <span className="text-white font-medium text-sm capitalize">
            {integration.id}
          </span>
          <span className="text-gray-600 text-xs ml-2">
            {integration.type}
          </span>
        </div>
        <button
          onClick={loadDetails}
          className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
        <button
          onClick={() => onReconfigure(integration.id)}
          className="p-1.5 rounded-md text-gray-500 hover:text-accent hover:bg-accent/10 transition-all"
          title="Reconfigure"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(integration.id)}
          className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {expanded && details && (
        <div className="px-4 pb-4 pl-10">
          <div className="bg-surface-2 rounded-lg p-3 space-y-1.5">
            {Object.entries(details.config).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-xs">
                <span className="text-gray-500 font-medium min-w-[80px]">
                  {key}
                </span>
                <span className="text-gray-300 font-mono break-all">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PasswordSection() {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSetPassword() {
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      await api.setPassword(password);
      setPassword("");
      setMessage("Password set successfully");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemovePassword() {
    try {
      await api.removePassword();
      setMessage("Password protection disabled");
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-white">
          Password Protection
        </h3>
      </div>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Set a password (min 8 characters)"
            className="input-field"
          />
        </div>
        <button
          onClick={handleSetPassword}
          disabled={saving}
          className="btn-primary"
        >
          Set
        </button>
        <button onClick={handleRemovePassword} className="btn-secondary">
          Remove
        </button>
      </div>
      {message && (
        <p className="text-xs mt-3 text-gray-400">{message}</p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [instanceName, setInstanceName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalTitle, setModalTitle] = useState("");

  function loadSettings() {
    api
      .getSettings()
      .then((data) => {
        setSettings(data);
        setInstanceName(data.instanceName);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSaveName() {
    await api.updateInstanceName(instanceName);
    setEditingName(false);
    loadSettings();
  }

  async function handleDeleteIntegration(id) {
    await api.deleteIntegration(id);
    loadSettings();
  }

  function openAddModal() {
    const available = Object.keys(INTEGRATION_DEFS).filter(
      (id) => !settings.integrations.some((i) => i.id === id)
    );
    if (available.length === 0) return;
    setModalType(available[0]);
    setModalTitle("Add Integration");
  }

  function openReconfigureModal(id) {
    setModalType(id);
    setModalTitle(`Reconfigure ${INTEGRATION_DEFS[id]?.title || id}`);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="skeleton h-8 w-48 mb-6" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="text-sm text-gray-500">
            Configure your instance
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Pencil className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-white">
              Instance Name
            </h3>
          </div>
          {editingName ? (
            <div className="flex gap-3">
              <input
                type="text"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                className="input-field"
                autoFocus
              />
              <button onClick={handleSaveName} className="btn-primary">
                Save
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-white text-sm">
                {settings.instanceName}
              </span>
              <button
                onClick={() => setEditingName(true)}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-white">
                Integrations
              </h3>
            </div>
            <button
              onClick={openAddModal}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Integration
            </button>
          </div>
          <div className="space-y-2">
            {settings.integrations.length === 0 && (
              <div className="card p-8 text-center">
                <Link className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  No integrations configured.
                </p>
              </div>
            )}
            {settings.integrations.map((i) => (
              <IntegrationCard
                key={i.id}
                integration={i}
                onReconfigure={openReconfigureModal}
                onDelete={handleDeleteIntegration}
              />
            ))}
          </div>
        </div>

        <PasswordSection />
      </div>

      {modalType && INTEGRATION_DEFS[modalType] && (
        <IntegrationModal
          title={modalTitle}
          def={INTEGRATION_DEFS[modalType]}
          onClose={() => setModalType(null)}
          onSaved={() => {
            setModalType(null);
            loadSettings();
          }}
        />
      )}
    </div>
  );
}
