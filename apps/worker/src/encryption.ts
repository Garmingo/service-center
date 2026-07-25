import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "@service-center/env/server";

function getKey() {
  const encoded = env.SERVICE_CENTER_ENCRYPTION_KEY;
  if (!encoded) {
    throw new Error("SERVICE_CENTER_ENCRYPTION_KEY is required by the worker.");
  }

  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("SERVICE_CENTER_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }

  return key;
}

export function decryptSecret(ciphertext: string) {
  const [ivText, tagText, payloadText] = ciphertext.split(".");
  if (!ivText || !tagText || !payloadText) {
    throw new Error("Invalid encrypted sender configuration.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(payloadText, "base64")), decipher.final()]).toString("utf8");
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const payload = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${payload.toString("base64")}`;
}
