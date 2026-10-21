import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Algorithm specifications
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH_BYTES = 16; // 128 bits authentication tag
const KEY_LENGTH_BYTES = 32; // 256 bits

/**
 * Derives a consistent 32-byte key from the master secret using HKDF (SHA-256)
 */
function deriveKey(masterSecret: string, salt: string = 'catfish_salt_v1'): Buffer {
  return Buffer.from(
    crypto.hkdfSync('sha256', masterSecret, salt, 'catfish_token_encryption', KEY_LENGTH_BYTES)
  );
}

const derivedEncryptionKey = deriveKey(env.APP_MASTER_ENCRYPTION_KEY);

export interface EncryptedPayload {
  iv: string;
  tag: string;
  ciphertext: string;
}

/**
 * Encrypts sensitive string data (e.g. Open Finance tokens) using AES-256-GCM.
 * Output format: "iv_hex:tag_hex:ciphertext_hex"
 */
export function encryptData(plainText: string): string {
  if (!plainText) return '';

  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, derivedEncryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts AES-256-GCM encrypted payload.
 * Verifies authenticity tag. If data is tampered with, decryption will throw an error.
 */
export function decryptData(encryptedEnvelope: string): string {
  if (!encryptedEnvelope) return '';

  const parts = encryptedEnvelope.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format: expected iv:tag:ciphertext');
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(cipherHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedEncryptionKey, iv, {
    authTagLength: AUTH_TAG_LENGTH_BYTES,
  });

  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
