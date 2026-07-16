import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error('TOKEN_ENCRYPTION_KEY is not configured');
  return Buffer.from(key, 'hex'); // 32 bytes = 64 hex chars
}

export function encrypt(plainText: string): { encrypted: Buffer; iv: Buffer } {
  const iv = crypto.randomBytes(12); // 12 bytes is the GCM-recommended IV length
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted: Buffer.concat([ciphertext, authTag]), // tag appended to the end
    iv,
  };
}

export function decrypt(encryptedWithTag: Buffer, iv: Buffer): string {
  const authTag = encryptedWithTag.subarray(encryptedWithTag.length - 16);
  const ciphertext = encryptedWithTag.subarray(0, encryptedWithTag.length - 16);

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
