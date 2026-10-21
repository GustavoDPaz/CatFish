import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Validates HMAC SHA-256 signature against webhook raw payload.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifyWebhookSignature(
  rawBody: string | Buffer,
  receivedSignature: string,
  secret: string = env.PLUGGY_WEBHOOK_SECRET
): boolean {
  if (!receivedSignature || !secret) {
    return false;
  }

  const normalizedReceived = receivedSignature.replace(/^sha256=/i, '').trim();

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest('hex');

  const receivedBuffer = Buffer.from(normalizedReceived, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}
