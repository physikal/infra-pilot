import { useState, useEffect } from "react";
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
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
      <h3 className="text-sm font-medium text-gray-400 mb-3">
        Quick Add: Point Domain to IP
      </h3>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Zone</label>
          <select
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
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
          <label className="block text-xs text-gray-500 mb-1">Domain</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="sub.example.com"
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">IP</label>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="10.0.0.1"
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={adding}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700
                     disabled:opacity-40"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
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
    <tr className="border-b border-gray-800 hover:bg-gray-800/50">
      <td className="px-3 py-2 text-xs text-gray-500">{record.type}</td>
      <td className="px-3 py-2 text-sm text-white">{record.name}</td>
      <td className="px-3 py-2 text-sm text-gray-300 font-mono">
        {record.content}
      </td>
      <td className="px-3 py-2 text-xs text-gray-500">
        {record.proxied ? "Proxied" : "DNS only"}
      </td>
      <td className="px-3 py-2 text-right">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-40"
        >
          {deleting ? "..." : "Delete"}
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
    api
      .getCloudflareDNS(zoneId)
      .then(setRecords)
      .catch((err) => setError(err.message));
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
      <div className="bg-red-900/30 border border-red-800 rounded p-4 text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Cloudflare DNS</h2>

      {!loading && <QuickAddForm zones={zones} onAdd={handleQuickAdd} />}

      {loading ? (
        <div className="text-gray-400">Loading zones...</div>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex gap-2">
              {zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => loadRecords(z.id)}
                  className={`px-3 py-1.5 rounded text-sm ${
                    selectedZone === z.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {z.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="ml-auto px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Add Record
            </button>
          </div>

          {showAdd && (
            <div className="bg-gray-900 border border-gray-800 rounded p-4 mb-4 flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select
                  value={newRecord.type}
                  onChange={(e) =>
                    setNewRecord((r) => ({ ...r, type: e.target.value }))
                  }
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                >
                  <option value="A">A</option>
                  <option value="CNAME">CNAME</option>
                  <option value="AAAA">AAAA</option>
                  <option value="TXT">TXT</option>
                  <option value="MX">MX</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={newRecord.name}
                  onChange={(e) =>
                    setNewRecord((r) => ({ ...r, name: e.target.value }))
                  }
                  placeholder="subdomain"
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Content</label>
                <input
                  type="text"
                  value={newRecord.content}
                  onChange={(e) =>
                    setNewRecord((r) => ({ ...r, content: e.target.value }))
                  }
                  placeholder="10.0.0.1"
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={newRecord.proxied}
                  onChange={(e) =>
                    setNewRecord((r) => ({ ...r, proxied: e.target.checked }))
                  }
                  className="rounded"
                />
                Proxied
              </label>
              <button
                onClick={handleAddRecord}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Create
              </button>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">
                    Content
                  </th>
                  <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">
                    Proxy
                  </th>
                  <th className="px-3 py-2" />
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
                {records.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-gray-600 text-sm">
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
