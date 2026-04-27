import crypto from "node:crypto";

function pepper() {
  return process.env.RESELLER_API_KEY_PEPPER?.trim() || "dev-reseller-pepper-change-me";
}

export function hashResellerApiKey(apiKey: string) {
  return crypto.createHmac("sha256", pepper()).update(apiKey).digest("hex");
}

export function generateResellerApiKey() {
  return crypto.randomBytes(24).toString("hex");
}
