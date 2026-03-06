import { useState } from "react";
import {
  Compass,
  Server,
  Monitor,
  Globe,
  Network,
  Check,
  AlertTriangle,
  ArrowRight,
  SkipForward,
} from "lucide-react";
import { api } from "../api.js";

const STEPS = [
  "instance",
  "nomad",
  "proxmox",
  "cloudflare",
  "traefik",
  "summary",
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-10">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
              i < current
                ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                : i === current
                  ? "bg-accent/20 text-accent ring-1 ring-accent/30"
                  : "bg-surface-2 text-gray-600"
            }`}
          >
            {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-6 h-px transition-colors duration-300 ${
                i < current ? "bg-emerald-500/40" : "bg-white/[0.06]"
              }`}
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
    <div className="animate-slide-up">
      <h2 className="text-xl font-bold text-white mb-2">
        Name your instance
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        What should we call this portal? It appears in the sidebar.
      </p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleNext()}
        placeholder="e.g. Homelab, Production, Dev Stack"
        className="input-field text-base py-3"
        autoFocus
      />
      {error && (
        <div className="flex items-center gap-2 mt-3 text-sm text-red-400">
          <AlertTriangle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleNext}
          className="btn-primary flex items-center gap-2"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function IntegrationStep({
  type,
  title,
  icon: Icon,
  fields,
  instructions,
  onNext,
  onSkip,
}) {
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
    <div className="animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-accent" />
        </div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>

      <div className="bg-surface-2 rounded-lg p-4 mb-6">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          How to get your credentials
        </h3>
        <ol className="text-sm text-gray-500 space-y-1 list-decimal list-inside">
          {instructions.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="space-y-3 mb-6">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-xs text-gray-500 mb-1.5 font-medium">
              {field.label}
              {field.required && (
                <span className="text-red-400 ml-1">*</span>
              )}
            </label>
            <input
              type={field.type || "text"}
              value={values[field.key]}
              onChange={(e) => setValue(field.key, e.target.value)}
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
          <AlertTriangle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={() => onSkip({ [type]: false })}
          className="btn-ghost flex items-center gap-2 text-xs"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip
        </button>
        <div className="flex gap-3">
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
            className="btn-primary flex items-center gap-2"
          >
            {saving ? "Saving..." : "Save & Next"}
            <ArrowRight className="w-4 h-4" />
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
    { key: "nomad", label: "Nomad", icon: Server },
    { key: "proxmox", label: "Proxmox", icon: Monitor },
    { key: "cloudflare", label: "Cloudflare", icon: Globe },
    { key: "traefik", label: "Traefik", icon: Network },
  ];

  return (
    <div className="animate-slide-up">
      <h2 className="text-xl font-bold text-white mb-2">
        Setup Complete
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Review your integrations. Reconfigure anytime in Settings.
      </p>
      <div className="space-y-2 mb-8">
        <div className="flex items-center gap-3 bg-surface-2 rounded-lg p-3">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-emerald-400" />
          </div>
          <span className="text-white text-sm font-medium">
            {results.instanceName}
          </span>
          <span className="text-gray-600 text-xs ml-auto">Instance</span>
        </div>
        {integrations.map((int) => (
          <div
            key={int.key}
            className="flex items-center gap-3 bg-surface-2 rounded-lg p-3"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                results[int.key]
                  ? "bg-emerald-500/20"
                  : "bg-white/[0.04]"
              }`}
            >
              {results[int.key] ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <int.icon className="w-3 h-3 text-gray-600" />
              )}
            </div>
            <span
              className={`text-sm font-medium ${
                results[int.key] ? "text-white" : "text-gray-600"
              }`}
            >
              {int.label}
            </span>
            {!results[int.key] && (
              <span className="badge-neutral ml-auto">skipped</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          onClick={handleFinish}
          disabled={finishing}
          className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-medium
                     hover:bg-emerald-500 transition-all active:scale-[0.98]
                     disabled:opacity-50 flex items-center gap-2"
        >
          {finishing ? "Finishing..." : "Launch Dashboard"}
          <ArrowRight className="w-4 h-4" />
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
  'Uncheck "Privilege Separation" for full access',
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-0">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mx-auto mb-4">
            <Compass className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-white">Infra Pilot</h1>
          <p className="text-sm text-gray-500 mt-1">Setup Wizard</p>
        </div>
        <StepIndicator current={step} />
        <div className="card p-6">
          {step === 0 && <InstanceStep onNext={advance} />}
          {step === 1 && (
            <IntegrationStep
              type="nomad"
              title="Connect Nomad"
              icon={Server}
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
              icon={Monitor}
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
              icon={Globe}
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
              icon={Network}
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
