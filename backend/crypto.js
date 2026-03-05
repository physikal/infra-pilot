import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

const DATA_DIR = process.env.DATA_DIR || "/data";
const SECRET_PATH = join(DATA_DIR, ".server-secret");

function getOrCreateSecret() {
  mkdirSync(dirname(SECRET_PATH), { recursive: true });
  if (existsSync(SECRET_PATH)) {
    return readFileSync(SECRET_PATH, "utf-8").trim();
  }
  const secret = randomBytes(64).toString("hex");
  writeFileSync(SECRET_PATH, secret, { mode: 0o600 });
  return secret;
}

function deriveKey(secret, salt) {
  return scryptSync(secret, salt, KEY_LENGTH);
}

const serverSecret = getOrCreateSecret();

export function encrypt(plaintext) {
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(serverSecret, salt);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString("base64");
}

export function decrypt(ciphertext) {
  const combined = Buffer.from(ciphertext, "base64");
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const encrypted = combined.subarray(
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  );
  const key = deriveKey(serverSecret, salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf-8");
}
