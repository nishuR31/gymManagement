import crypto from "node:crypto";

export function createQrSecret(): string {
  return crypto.randomBytes(32).toString("base64url");
}
