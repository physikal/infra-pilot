import { useState } from "react";
import { api } from "../api.js";

const STEPS = ["instance", "nomad", "proxmox", "cloudflare", "traefik", "summary"];

function StepIndicator({ current, steps }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              i < current
                ? "bg-green-600 text-white"
                : i === current
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-400"
            }`}
          >
            {i < current ? "\u2713" : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 ${i < current ? "bg-green-600" : "bg-gray-700"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function InstanceStep({ onNext }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function handleNext() {
    if (!name.trim()) {
      setError("Give your instance a name");
      return;
    }
    try {
      await api.setInstanceName(name.trim());
      onNext({ instanceName: name.trim() });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Name your instance</h2>
      <p className="text-gray-400 mb-6">
        What do you want to call this portal? This appears in the sidebar.
      </p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleNext()}
        placeholder="e.g. Homelab, Production, Dev Stack"
        className="w-full bg-gray-800 border border-gray-700 rounded px-4 py-3 text-white
                   placeholder-gray-500 focus:outline-none focus:border-blue-500"
        autoFocus
      />
      {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleNext}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function IntegrationStep({ type, title, fields, instructions, onNext, onSkip }) {
  const [values, setValues] = useState(
    Object.fromEntries(fields.map((f) => [f.key, ""]))
  );
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setValue(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setTestResult(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setError("");
    try {
      const result = await api.testIntegration(type, values);
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
      await api.saveIntegration(type, values);
      onNext({ [type]: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const hasRequired = fields
    .filter((f) => f.required)
    .every((f) => values[f.key]?.trim());

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <div className="bg-gray-800/50 border border-gray-700 rounded p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-2">
          How to get your credentials:
        </h3>
        <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
          {instructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
      <div className="space-y-4 mb-6">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm text-gray-300 mb-1">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <input
              type={field.type || "text"}
              value={values[field.key]}
              onChange={(e) => setValue(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white
                         placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
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

      <div className="flex justify-between">
        <button
          onClick={() => onSkip({ [type]: false })}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Skip
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleTest}
            disabled={!hasRequired || testing}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600
                       transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {testing ? "Testing..." : "Test Connection"}
          </button>
          <button
            onClick={handleSave}
            disabled={!testResult?.ok || saving}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700
                       transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save & Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryStep({ results, onFinish }) {
  const [finishing, setFinishing] = useState(false);

  async function handleFinish() {
    setFinishing(true);
    await api.completeSetup();
    onFinish();
  }

  const integrations = [
    { key: "nomad", label: "Nomad" },
    { key: "proxmox", label: "Proxmox" },
    { key: "cloudflare", label: "Cloudflare" },
    { key: "traefik", label: "Traefik" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Setup Summary</h2>
      <p className="text-gray-400 mb-6">
        Review your integrations. You can reconfigure any of these later in
        Settings.
      </p>
      <div className="space-y-3 mb-8">
        <div className="flex items-center gap-3 bg-gray-800 rounded p-3">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-white">Instance: {results.instanceName}</span>
        </div>
        {integrations.map((int) => (
          <div
            key={int.key}
            className="flex items-center gap-3 bg-gray-800 rounded p-3"
          >
            <div
              className={`w-3 h-3 rounded-full ${
                results[int.key] ? "bg-green-500" : "bg-gray-600"
              }`}
            />
            <span className={results[int.key] ? "text-white" : "text-gray-500"}>
              {int.label}
              {!results[int.key] && (
                <span className="text-gray-600 ml-2">- skipped</span>
              )}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleFinish}
          disabled={finishing}
          className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700
                     transition-colors font-medium disabled:opacity-50"
        >
          {finishing ? "Finishing..." : "Finish Setup"}
        </button>
      </div>
    </div>
  );
}

const NOMAD_FIELDS = [
  {
    key: "url",
    label: "Nomad API URL",
    placeholder: "http://your-nomad-server:4646",
    required: true,
  },
  {
    key: "token",
    label: "ACL Token",
    placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    type: "password",
    required: false,
  },
];

const NOMAD_INSTRUCTIONS = [
  "Open your Nomad UI (usually port 4646)",
  'Go to ACL Tokens (or run "nomad acl token create -type management")',
  "Create a management token for full access",
  "Copy the Secret ID and paste it below",
];

const PROXMOX_FIELDS = [
  {
    key: "url",
    label: "Proxmox API URL",
    placeholder: "https://your-proxmox:8006",
    required: true,
  },
  {
    key: "node",
    label: "Default Node Name",
    placeholder: "pve",
    required: false,
  },
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
];

const PROXMOX_INSTRUCTIONS = [
  "Open your Proxmox UI (usually port 8006)",
  "Go to Datacenter > Permissions > API Tokens",
  'Click "Add" to create a new API token',
  "Uncheck \"Privilege Separation\" for full access",
  "Copy the Token ID and Secret and paste them below",
];

const CLOUDFLARE_FIELDS = [
  {
    key: "apiToken",
    label: "API Token",
    placeholder: "your-cloudflare-api-token",
    type: "password",
    required: true,
  },
];

const CLOUDFLARE_INSTRUCTIONS = [
  "Go to the Cloudflare dashboard",
  "Click your profile icon > My Profile > API Tokens",
  'Click "Create Token"',
  'Use the "Edit zone DNS" template for DNS management',
  "Select the zones you want to manage",
  "Copy the generated token and paste it below",
];

const TRAEFIK_FIELDS = [
  {
    key: "url",
    label: "Traefik API URL",
    placeholder: "http://your-traefik:8080",
    required: true,
  },
];

const TRAEFIK_INSTRUCTIONS = [
  "Make sure the Traefik API is enabled in your config",
  'Set "api.dashboard = true" and "api.insecure = true" (for local access)',
  "The API is usually available on port 8080",
  "Enter the full URL below",
];

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [results, setResults] = useState({});

  function advance(data) {
    const newResults = { ...results, ...data };
    setResults(newResults);
    setStep((s) => s + 1);
  }

  function finish() {
    onComplete(results.instanceName || "Infra Pilot");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Infra Pilot</h1>
          <p className="text-gray-400 mt-1">Setup Wizard</p>
        </div>
        <StepIndicator current={step} steps={STEPS} />
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          {step === 0 && <InstanceStep onNext={advance} />}
          {step === 1 && (
            <IntegrationStep
              type="nomad"
              title="Connect Nomad"
              fields={NOMAD_FIELDS}
              instructions={NOMAD_INSTRUCTIONS}
              onNext={advance}
              onSkip={advance}
            />
          )}
          {step === 2 && (
            <IntegrationStep
              type="proxmox"
              title="Connect Proxmox"
              fields={PROXMOX_FIELDS}
              instructions={PROXMOX_INSTRUCTIONS}
              onNext={advance}
              onSkip={advance}
            />
          )}
          {step === 3 && (
            <IntegrationStep
              type="cloudflare"
              title="Connect Cloudflare"
              fields={CLOUDFLARE_FIELDS}
              instructions={CLOUDFLARE_INSTRUCTIONS}
              onNext={advance}
              onSkip={advance}
            />
          )}
          {step === 4 && (
            <IntegrationStep
              type="traefik"
              title="Connect Traefik"
              fields={TRAEFIK_FIELDS}
              instructions={TRAEFIK_INSTRUCTIONS}
              onNext={advance}
              onSkip={advance}
            />
          )}
          {step === 5 && (
            <SummaryStep results={results} onFinish={finish} />
          )}
        </div>
      </div>
    </div>
  );
}
