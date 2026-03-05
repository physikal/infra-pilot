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

export default db;
