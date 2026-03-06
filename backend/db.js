import Database from "better-sqlite3";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import { encrypt, decrypt } from "./crypto.js";

const DATA_DIR = process.env.DATA_DIR || "/data";
mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, "infrapilot.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS integrations (
    id         TEXT PRIMARY KEY,
    type       TEXT NOT NULL,
    config     TEXT NOT NULL,
    enabled    INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    type       TEXT NOT NULL,
    message    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS apps (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL UNIQUE,
    source_type    TEXT NOT NULL,
    image          TEXT NOT NULL,
    source_meta    TEXT NOT NULL DEFAULT '{}',
    cpu            INTEGER NOT NULL DEFAULT 200,
    memory         INTEGER NOT NULL DEFAULT 256,
    port           INTEGER,
    env_vars       TEXT NOT NULL DEFAULT '{}',
    routing        TEXT NOT NULL DEFAULT 'internal',
    domain         TEXT,
    zone_id        TEXT,
    dns_record_ids TEXT,
    nomad_job_id   TEXT,
    status         TEXT NOT NULL DEFAULT 'pending',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const stmts = {
  getConfig: db.prepare("SELECT value FROM config WHERE key = ?"),
  setConfig: db.prepare(
    `INSERT INTO config (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ),
  getIntegration: db.prepare("SELECT * FROM integrations WHERE id = ?"),
  getAllIntegrations: db.prepare("SELECT * FROM integrations"),
  upsertIntegration: db.prepare(
    `INSERT INTO integrations (id, type, config, enabled, updated_at)
     VALUES (?, ?, ?, 1, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       config = excluded.config,
       enabled = excluded.enabled,
       updated_at = datetime('now')`
  ),
  deleteIntegration: db.prepare("DELETE FROM integrations WHERE id = ?"),
  addActivity: db.prepare(
    "INSERT INTO activity (type, message) VALUES (?, ?)"
  ),
  getRecentActivity: db.prepare(
    "SELECT * FROM activity ORDER BY created_at DESC LIMIT ?"
  ),
  getApp: db.prepare("SELECT * FROM apps WHERE id = ?"),
  getAllApps: db.prepare(
    "SELECT * FROM apps ORDER BY created_at DESC"
  ),
  upsertApp: db.prepare(
    `INSERT INTO apps (id, name, source_type, image, source_meta, cpu, memory, port, env_vars, routing, domain, zone_id, dns_record_ids, nomad_job_id, status, updated_at)
     VALUES (@id, @name, @source_type, @image, @source_meta, @cpu, @memory, @port, @env_vars, @routing, @domain, @zone_id, @dns_record_ids, @nomad_job_id, @status, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       source_type = excluded.source_type,
       image = excluded.image,
       source_meta = excluded.source_meta,
       cpu = excluded.cpu,
       memory = excluded.memory,
       port = excluded.port,
       env_vars = excluded.env_vars,
       routing = excluded.routing,
       domain = excluded.domain,
       zone_id = excluded.zone_id,
       dns_record_ids = excluded.dns_record_ids,
       nomad_job_id = excluded.nomad_job_id,
       status = excluded.status,
       updated_at = datetime('now')`
  ),
  updateAppStatus: db.prepare(
    "UPDATE apps SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ),
  deleteApp: db.prepare("DELETE FROM apps WHERE id = ?"),
};

export function getConfig(key) {
  const row = stmts.getConfig.get(key);
  return row ? row.value : null;
}

export function setConfig(key, value) {
  stmts.setConfig.run(key, value);
}

export function isSetupComplete() {
  return getConfig("setup_complete") === "true";
}

export function getIntegration(id) {
  const row = stmts.getIntegration.get(id);
  if (!row) return null;
  return {
    ...row,
    config: JSON.parse(decrypt(row.config)),
    enabled: Boolean(row.enabled),
  };
}

export function getAllIntegrations() {
  return stmts.getAllIntegrations.all().map((row) => ({
    id: row.id,
    type: row.type,
    enabled: Boolean(row.enabled),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export function saveIntegration(id, type, config) {
  const encrypted = encrypt(JSON.stringify(config));
  stmts.upsertIntegration.run(id, type, encrypted);
}

export function deleteIntegration(id) {
  stmts.deleteIntegration.run(id);
}

export function addActivity(type, message) {
  stmts.addActivity.run(type, message);
}

export function getRecentActivity(limit = 20) {
  return stmts.getRecentActivity.all(limit);
}

export function getPasswordHash() {
  return getConfig("password_hash");
}

export function setPasswordHash(hash) {
  setConfig("password_hash", hash);
}

export function getApp(id) {
  const row = stmts.getApp.get(id);
  if (!row) return null;
  return {
    ...row,
    env_vars: JSON.parse(decrypt(row.env_vars)),
    source_meta: JSON.parse(row.source_meta),
    dns_record_ids: row.dns_record_ids ? JSON.parse(row.dns_record_ids) : [],
  };
}

export function getAllApps() {
  return stmts.getAllApps.all().map((row) => ({
    ...row,
    source_meta: JSON.parse(row.source_meta),
    dns_record_ids: row.dns_record_ids ? JSON.parse(row.dns_record_ids) : [],
  }));
}

export function upsertApp(app) {
  stmts.upsertApp.run({
    id: app.id,
    name: app.name,
    source_type: app.source_type,
    image: app.image,
    source_meta: JSON.stringify(app.source_meta || {}),
    cpu: app.cpu || 200,
    memory: app.memory || 256,
    port: app.port || null,
    env_vars: encrypt(JSON.stringify(app.env_vars || {})),
    routing: app.routing || "internal",
    domain: app.domain || null,
    zone_id: app.zone_id || null,
    dns_record_ids: app.dns_record_ids
      ? JSON.stringify(app.dns_record_ids)
      : null,
    nomad_job_id: app.nomad_job_id || null,
    status: app.status || "pending",
  });
}

export function updateAppStatus(id, status) {
  stmts.updateAppStatus.run(status, id);
}

export function deleteAppFromDb(id) {
  stmts.deleteApp.run(id);
}

export default db;
