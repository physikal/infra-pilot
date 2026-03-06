import { useState, useEffect } from "react";
import {
  Globe,
  Plus,
  Trash2,
  Zap,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { api } from "../api.js";

function QuickAddForm({ zones, onAdd }) {
  const [zoneId, setZoneId] = useState("");
  const [domain, setDomain] = useState("");
  const [ip, setIp] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!zoneId || !domain || !ip) {
      setError("All fields are required");
      return;
    }
    setAdding(true);
    setError("");
    try {
      await onAdd(zoneId, domain, ip);
      setDomain("");
      setIp("");
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-3.5 h-3.5 text-amber-400" />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Quick Add: Point Domain to IP
        </h3>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-medium">
            Zone
          </label>
          <select
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="input-field w-auto"
          >
            <option value="">Select zone</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-medium">
            Domain
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="sub.example.com"
            className="input-field w-auto"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5 font-medium">
            IP
          </label>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="10.0.0.1"
            className="input-field w-auto"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding}
          className="btn-primary"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-2 mt-2 text-sm text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

function RecordRow({ record, zoneId, onDelete, onRefresh }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(zoneId, record.id);
      onRefresh();
    } catch {
      setDeleting(false);
    }
  }

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
      <td className="px-4 py-3">
        <span className="badge-neutral font-mono">{record.type}</span>
      </td>
      <td className="px-4 py-3 text-sm text-white">{record.name}</td>
      <td className="px-4 py-3 text-sm text-gray-400 font-mono">
        {record.content}
      </td>
      <td className="px-4 py-3">
        {record.proxied ? (
          <span className="flex items-center gap-1.5 text-xs text-orange-400">
            <Shield className="w-3 h-3" />
            Proxied
          </span>
        ) : (
          <span className="text-xs text-gray-600">DNS only</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-500
                     hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

export default function CloudflarePage() {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recordsError, setRecordsError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newRecord, setNewRecord] = useState({
    type: "A",
    name: "",
    content: "",
    proxied: false,
  });

  useEffect(() => {
    api
      .getCloudflareZones()
      .then((z) => {
        setZones(z);
        if (z.length > 0) loadRecords(z[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function loadRecords(zoneId) {
    setSelectedZone(zoneId);
    setRecordsError("");
    api
      .getCloudflareDNS(zoneId)
      .then(setRecords)
      .catch((err) => {
        setRecords([]);
        const msg = err.message.includes("Authentication")
          ? "DNS record access denied. Ensure your Cloudflare API token has the 'Zone - DNS Record - Read' permission."
          : err.message;
        setRecordsError(msg);
      });
  }

  async function handleQuickAdd(zoneId, domain, ip) {
    await api.cloudflareQuickAdd(zoneId, domain, ip);
    loadRecords(zoneId);
  }

  async function handleAddRecord() {
    if (!selectedZone || !newRecord.name || !newRecord.content) return;
    try {
      await api.createCloudflareDNS(selectedZone, newRecord);
      setShowAdd(false);
      setNewRecord({ type: "A", name: "", content: "", proxied: false });
      loadRecords(selectedZone);
    } catch (err) {
      setError(err.message);
    }
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
            <Globe className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="page-title">Cloudflare DNS</h2>
            <p className="text-sm text-gray-500">
              Manage DNS records
            </p>
          </div>
        </div>
      </div>

      {!loading && <QuickAddForm zones={zones} onAdd={handleQuickAdd} />}

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-1.5 flex-wrap">
              {zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => loadRecords(z.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedZone === z.id
                      ? "bg-accent/15 text-accent-hover ring-1 ring-accent/30"
                      : "bg-surface-2 text-gray-500 hover:text-gray-300 hover:bg-surface-3"
                  }`}
                >
                  {z.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="ml-auto btn-primary flex items-center gap-2 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Record
            </button>
          </div>

          {showAdd && (
            <div className="card p-4 mb-4 animate-slide-up">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                    Type
                  </label>
                  <select
                    value={newRecord.type}
                    onChange={(e) =>
                      setNewRecord((r) => ({ ...r, type: e.target.value }))
                    }
                    className="input-field w-auto"
                  >
                    <option value="A">A</option>
                    <option value="CNAME">CNAME</option>
                    <option value="AAAA">AAAA</option>
                    <option value="TXT">TXT</option>
                    <option value="MX">MX</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newRecord.name}
                    onChange={(e) =>
                      setNewRecord((r) => ({ ...r, name: e.target.value }))
                    }
                    placeholder="subdomain"
                    className="input-field w-auto"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                    Content
                  </label>
                  <input
                    type="text"
                    value={newRecord.content}
                    onChange={(e) =>
                      setNewRecord((r) => ({
                        ...r,
                        content: e.target.value,
                      }))
                    }
                    placeholder="10.0.0.1"
                    className="input-field w-auto"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-400 py-2.5">
                  <input
                    type="checkbox"
                    checked={newRecord.proxied}
                    onChange={(e) =>
                      setNewRecord((r) => ({
                        ...r,
                        proxied: e.target.checked,
                      }))
                    }
                    className="rounded border-white/20 bg-surface-2"
                  />
                  Proxied
                </label>
                <button
                  onClick={handleAddRecord}
                  className="btn-primary text-xs"
                >
                  Create
                </button>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    Content
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    Proxy
                  </th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <RecordRow
                    key={r.id}
                    record={r}
                    zoneId={selectedZone}
                    onDelete={api.deleteCloudflareDNS}
                    onRefresh={() => loadRecords(selectedZone)}
                  />
                ))}
                {recordsError && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-red-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {recordsError}
                      </div>
                    </td>
                  </tr>
                )}
                {!recordsError && records.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-600 text-sm"
                    >
                      No DNS records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
