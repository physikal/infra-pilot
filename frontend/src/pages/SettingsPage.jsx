import { useState, useEffect } from "react";
import { api } from "../api.js";

const INTEGRATION_DEFS = {
  nomad: {
    title: "Nomad",
    fields: [
      { key: "url", label: "API URL", placeholder: "http://your-nomad-server:4646", required: true },
      { key: "token", label: "ACL Token", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", type: "password" },
    ],
  },
  proxmox: {
    title: "Proxmox",
    fields: [
      { key: "url", label: "API URL", placeholder: "https://your-proxmox:8006", required: true },
      { key: "node", label: "Default Node Name", placeholder: "pve" },
      { key: "tokenId", label: "API Token ID", placeholder: "user@pam!token-name", required: true },
      { key: "tokenSecret", label: "API Token Secret", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", type: "password", required: true },
    ],
  },
  cloudflare: {
    title: "Cloudflare",
    fields: [
      { key: "apiToken", label: "API Token", placeholder: "your-cloudflare-api-token", type: "password", required: true },
    ],
  },
  traefik: {
    title: "Traefik",
    fields: [
      { key: "url", label: "API URL", placeholder: "http://your-traefik:8080", required: true },
    ],
  },
};

function AddIntegrationModal({ onClose, onSaved, existingIds }) {
  const available = Object.keys(INTEGRATION_DEFS).filter(
    (id) => !existingIds.includes(id)
  );
  const [selected, setSelected] = useState(available[0] || "");
  const [values, setValues] = useState({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const def = INTEGRATION_DEFS[selected];

  function reset(type) {
    setSelected(type);
    setValues({});
    setTestResult(null);
    setError("");
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setError("");
    try {
      const result = await api.testIntegration(selected, values);
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
      await api.saveIntegration(selected, values);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (available.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md p-6">
          <p className="text-gray-400">All integrations are already configured.</p>
          <div className="flex justify-end mt-4">
            <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasRequired = def?.fields
    .filter((f) => f.required)
    .every((f) => values[f.key]?.trim());

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-white mb-4">Add Integration</h3>

        <div className="flex gap-2 mb-4">
          {available.map((id) => (
            <button
              key={id}
              onClick={() => reset(id)}
              className={`px-3 py-1.5 rounded text-sm ${
                selected === id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {INTEGRATION_DEFS[id].title}
            </button>
          ))}
        </div>

        {def && (
          <div className="space-y-3 mb-4">
            {def.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm text-gray-400 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                <input
                  type={field.type || "text"}
                  value={values[field.key] || ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm
                             focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        )}

        {testResult && (
          <div
            className={`p-3 rounded mb-4 text-sm ${
              testResult.ok
                ? "bg-green-900/40 border border-green-700 text-green-300"
                : "bg-red-900/40 border border-red-700 text-red-300"
            }`}
          >
            {testResult.ok ? (
              "Connection successful!"
            ) : (
              <>
                <p>Connection failed: {testResult.error}</p>
                {testResult.suggestion && (
                  <p className="mt-1 text-gray-400">{testResult.suggestion}</p>
                )}
              </>
            )}
          </div>
        )}

        {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleTest}
            disabled={!hasRequired || testing}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600
                       disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <button
            onClick={handleSave}
            disabled={!testResult?.ok || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
                       disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReconfigureModal({ integrationId, onClose, onSaved }) {
  const def = INTEGRATION_DEFS[integrationId];
  const [values, setValues] = useState({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!def) return null;

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-white mb-4">
          Reconfigure {def.title}
        </h3>

        <div className="space-y-3 mb-4">
          {def.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm text-gray-400 mb-1">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <input
                type={field.type || "text"}
                value={values[field.key] || ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={field.placeholder}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm
                           focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>

        {testResult && (
          <div
            className={`p-3 rounded mb-4 text-sm ${
              testResult.ok
                ? "bg-green-900/40 border border-green-700 text-green-300"
                : "bg-red-900/40 border border-red-700 text-red-300"
            }`}
          >
            {testResult.ok ? "Connection successful!" : (
              <>
                <p>Connection failed: {testResult.error}</p>
                {testResult.suggestion && (
                  <p className="mt-1 text-gray-400">{testResult.suggestion}</p>
                )}
              </>
            )}
          </div>
        )}

        {error && <p className="text-red-400 mb-4 text-sm">{error}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleTest}
            disabled={!hasRequired || testing}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600
                       disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <button
            onClick={handleSave}
            disabled={!testResult?.ok || saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
                       disabled:opacity-40 disabled:cursor-not-allowed text-sm"
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
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-4">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            integration.enabled ? "bg-green-500" : "bg-gray-600"
          }`}
        />
        <span className="text-white font-medium flex-1">{integration.id}</span>
        <span className="text-gray-600 text-xs">{integration.type}</span>
        <button
          onClick={loadDetails}
          className="text-xs text-gray-500 hover:text-white"
        >
          {expanded ? "Hide" : "Details"}
        </button>
        <button
          onClick={() => onReconfigure(integration.id)}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Reconfigure
        </button>
        <button
          onClick={() => onDelete(integration.id)}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Remove
        </button>
      </div>
      {expanded && details && (
        <div className="mt-3 pl-6 space-y-1">
          {Object.entries(details.config).map(([key, value]) => (
            <div key={key} className="flex gap-2 text-sm">
              <span className="text-gray-500">{key}:</span>
              <span className="text-gray-300 font-mono">{value}</span>
            </div>
          ))}
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
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-3">
        Password Protection
      </h3>
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Set a password (min 8 characters)"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm
                       focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleSetPassword}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700
                     disabled:opacity-40"
        >
          Set
        </button>
        <button
          onClick={handleRemovePassword}
          className="px-4 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-600"
        >
          Remove
        </button>
      </div>
      {message && (
        <p className="text-sm mt-2 text-gray-400">{message}</p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [instanceName, setInstanceName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [reconfiguring, setReconfiguring] = useState(null);

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

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

      <div className="space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Instance Name
          </h3>
          {editingName ? (
            <div className="flex gap-3">
              <input
                type="text"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm
                           focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleSaveName}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
              >
                Save
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="px-4 py-2 text-gray-400 text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-white">{settings.instanceName}</span>
              <button
                onClick={() => setEditingName(true)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">
              Integrations
            </h3>
            <button
              onClick={() => setShowAdd(true)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Add Integration
            </button>
          </div>
          <div className="space-y-2">
            {settings.integrations.length === 0 && (
              <p className="text-gray-600 text-sm">
                No integrations configured.
              </p>
            )}
            {settings.integrations.map((i) => (
              <IntegrationCard
                key={i.id}
                integration={i}
                onReconfigure={(id) => setReconfiguring(id)}
                onDelete={handleDeleteIntegration}
              />
            ))}
          </div>
        </div>

        <PasswordSection />
      </div>

      {showAdd && (
        <AddIntegrationModal
          existingIds={settings.integrations.map((i) => i.id)}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            loadSettings();
          }}
        />
      )}

      {reconfiguring && (
        <ReconfigureModal
          integrationId={reconfiguring}
          onClose={() => setReconfiguring(null)}
          onSaved={() => {
            setReconfiguring(null);
            loadSettings();
          }}
        />
      )}
    </div>
  );
}
