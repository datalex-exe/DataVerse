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
 * Verifies a password against a hash and salt.
 */
export async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password, salt);
  return computedHash === hash;
}
