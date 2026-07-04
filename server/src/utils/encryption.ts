import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { getEnv } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const hex = getEnv().TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

export function encrypt(text: string): EncryptedData {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return {
    encrypted,
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
  };
}

export function decrypt(data: EncryptedData): string {
  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(data.iv, "hex"));
  decipher.setAuthTag(Buffer.from(data.tag, "hex"));
  let decrypted = decipher.update(data.encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function encryptObject<T extends Record<string, string | null | undefined>>(
  obj: T,
  ...fields: (keyof T)[]
): T & { _enc: Record<string, EncryptedData> } {
  const _enc: Record<string, EncryptedData> = {};
  for (const field of fields) {
    const value = obj[field];
    if (value) {
      _enc[field as string] = encrypt(value as string);
    }
  }
  return { ...obj, _enc };
}

export function decryptObject<T extends Record<string, any>>(
  obj: T,
  encField: string,
): { accessToken?: string; refreshToken?: string } {
  const result: { accessToken?: string; refreshToken?: string } = {};
  const enc = obj[encField] as Record<string, EncryptedData> | undefined;
  if (!enc) return result;
  if (enc.accessToken) result.accessToken = decrypt(enc.accessToken);
  if (enc.refreshToken) result.refreshToken = decrypt(enc.refreshToken);
  return result;
}
