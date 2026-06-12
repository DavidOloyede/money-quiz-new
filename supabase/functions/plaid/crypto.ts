/**
 * AES-256-GCM for Plaid access tokens at rest. The 32-byte key lives in the
 * PLAID_TOKEN_KEY function secret (base64); ciphertext is stored as
 * base64(iv || ciphertext) in plaid_items.access_token_enc. Tokens exist in
 * plaintext only inside this function, never in the database or the browser.
 */

function b64decode(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}

function b64encode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

async function importKey(keyB64: string): Promise<CryptoKey> {
  const raw = b64decode(keyB64)
  if (raw.length !== 32) throw new Error('PLAID_TOKEN_KEY must be 32 bytes (base64)')
  return crypto.subtle.importKey('raw', raw.buffer as ArrayBuffer, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptToken(plain: string, keyB64: string): Promise<string> {
  const key = await importKey(keyB64)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  )
  const out = new Uint8Array(iv.length + cipher.byteLength)
  out.set(iv, 0)
  out.set(new Uint8Array(cipher), iv.length)
  return b64encode(out)
}

export async function decryptToken(enc: string, keyB64: string): Promise<string> {
  const key = await importKey(keyB64)
  const bytes = b64decode(enc)
  const iv = bytes.slice(0, 12)
  const cipher = bytes.slice(12)
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipher.buffer as ArrayBuffer,
  )
  return new TextDecoder().decode(plain)
}
