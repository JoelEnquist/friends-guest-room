import crypto from 'crypto';

import { appEnv } from '@/lib/env';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const key = appEnv.encryptionKey;

  if (!key) {
    throw new Error('ENCRYPTION_KEY is required for encrypted settings storage.');
  }

  return crypto.createHash('sha256').update(key).digest();
}

export function encryptField(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptField(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const [ivB64, authTagB64, encryptedB64] = value.split(':');

  if (!ivB64 || !authTagB64 || !encryptedB64) {
    return null;
  }

  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
