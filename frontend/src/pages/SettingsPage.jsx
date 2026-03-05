import { useState, useEffect } from "react";
import { api } from "../api.js";

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

  function handleReconfigure(id) {
    window.location.href = `/?reconfigure=${id}`;
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
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Integrations
          </h3>
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
                onReconfigure={handleReconfigure}
                onDelete={handleDeleteIntegration}
              />
            ))}
          </div>
        </div>

        <PasswordSection />
      </div>
    </div>
  );
}
