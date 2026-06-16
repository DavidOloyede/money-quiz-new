/**
 * AES-256-GCM for Plaid access tokens at rest. The 32-byte key lives in the
 * PLAID_TOKEN_KEY env var (base64); ciphertext is stored as
 * base64(iv(12) || authTag(16) || ciphertext) in plaid_items.access_token_enc.
 * Tokens exist in plaintext only inside this server, never in the database or
 * the browser.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function loadKey(keyB64: string): Buffer {
  const raw = Buffer.from(keyB64, 'base64')
  if (raw.length !== 32) throw new Error('PLAID_TOKEN_KEY must be 32 bytes (base64)')
  return raw
}

export function encryptToken(plain: string, keyB64: string): string {
  const key = loadKey(keyB64)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decryptToken(enc: string, keyB64: string): string {
  const key = loadKey(keyB64)
  const bytes = Buffer.from(enc, 'base64')
  const iv = bytes.subarray(0, 12)
  const tag = bytes.subarray(12, 28)
  const data = bytes.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
