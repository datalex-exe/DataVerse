// Web Crypto PBKDF2 Password Hashing for Cloudflare Workers
const encoder = new TextEncoder();

/**
 * Generates a cryptographically secure random salt (hex string).
 */
export async function generateSalt(): Promise<string> {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hashes a password using PBKDF2 with HMAC-SHA256.
 * Runs natively in the Cloudflare Worker environment (<1ms CPU time).
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const passwordBytes = encoder.encode(password);
  const saltBytes = encoder.encode(salt);

  // Import the password as a raw cryptographic key
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive bits using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 10000,
      hash: 'SHA-256'
    },
    baseKey,
    256 // 32 bytes (256 bits)
  );

  const bytes = new Uint8Array(derivedBits);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time comparison between two strings to prevent timing attacks.
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aLen = a.length;
  const bLen = b.length;
  let diff = aLen ^ bLen;
  for (let i = 0; i < Math.max(aLen, bLen); i++) {
    const charA = i < aLen ? a.charCodeAt(i) : 0;
    const charB = i < bLen ? b.charCodeAt(i) : 0;
    diff |= charA ^ charB;
  }
  return diff === 0;
}

/**
 * Verifies a password against a hash and salt using constant-time comparison.
 */
export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password, salt);
  return timingSafeEqualStr(computedHash, hash);
}

/**
 * Computes SHA-256 hash of a string and returns it as a lowercase hex string.
 */
export async function sha256Hex(data: string): Promise<string> {
  const dataBytes = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates a cryptographically secure random token (hex string).
 */
export function generateRandomToken(bytesLen = 32): string {
  const bytes = new Uint8Array(bytesLen);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Helper to derive or import a 256-bit AES-GCM key from string/hex.
 */
async function getAesGcmKey(rawKey?: string): Promise<CryptoKey> {
  let keyBytes: Uint8Array;
  if (rawKey && rawKey.length >= 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    // Hex encoded 32 bytes (256 bits)
    keyBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      keyBytes[i] = parseInt(rawKey.substring(i * 2, i * 2 + 2), 16);
    }
  } else if (rawKey && rawKey.length >= 32) {
    keyBytes = encoder.encode(rawKey.substring(0, 32));
  } else {
    // Fallback key for development if not explicitly configured
    console.warn('[SECURITY WARNING] TWO_FACTOR_ENCRYPTION_KEY is not configured. Using fallback dev key.');
    const devFallback = 'dataverse-dev-2fa-aes-gcm-master-key-32bytes';
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(devFallback));
    keyBytes = new Uint8Array(hash);
  }

  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts sensitive text (e.g. 2FA TOTP secret) with AES-256-GCM.
 * Output format: `<ivHex>:<cipherHex>`
 */
export async function encryptSecret(plainText: string, encryptionKey?: string): Promise<string> {
  const key = await getAesGcmKey(encryptionKey);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const encodedData = encoder.encode(plainText);
  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    key,
    encodedData
  );

  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const cipherBytes = new Uint8Array(cipherBuffer);
  const cipherHex = Array.from(cipherBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  return `${ivHex}:${cipherHex}`;
}

/**
 * Decrypts AES-256-GCM encrypted text in `<ivHex>:<cipherHex>` format.
 */
export async function decryptSecret(encryptedPayload: string, encryptionKey?: string): Promise<string> {
  const [ivHex, cipherHex] = encryptedPayload.split(':');
  if (!ivHex || !cipherHex) {
    throw new Error('Invalid encrypted payload format');
  }

  const key = await getAesGcmKey(encryptionKey);
  const iv = new Uint8Array(ivHex.length / 2);
  for (let i = 0; i < iv.length; i++) {
    iv[i] = parseInt(ivHex.substring(i * 2, i * 2 + 2), 16);
  }

  const cipherBytes = new Uint8Array(cipherHex.length / 2);
  for (let i = 0; i < cipherBytes.length; i++) {
    cipherBytes[i] = parseInt(cipherHex.substring(i * 2, i * 2 + 2), 16);
  }

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128
    },
    key,
    cipherBytes
  );

  return new TextDecoder().decode(decryptedBuffer);
}

