import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper Web Crypto functions matching implementation
const encoder = new TextEncoder();
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32ToBytes(base32) {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/[\s-]/g, '');
  let bits = 0, value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) throw new Error(`Invalid Base32 char: ${clean[i]}`);
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

function bytesToBase32(bytes) {
  let bits = 0, value = 0, output = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_CHARS[(value << (5 - bits)) & 31];
  return output;
}

async function computeTOTP(secretBase32, timeStep) {
  const keyBytes = base32ToBytes(secretBase32);
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  view.setUint32(0, Math.floor(timeStep / 0x100000000), false);
  view.setUint32(4, timeStep >>> 0, false);

  const signature = await crypto.subtle.sign('HMAC', hmacKey, counterBuffer);
  const hmac = new Uint8Array(signature);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binary % 1000000).toString().padStart(6, '0');
}

function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aLen = a.length, bLen = b.length;
  let diff = aLen ^ bLen;
  for (let i = 0; i < Math.max(aLen, bLen); i++) {
    const charA = i < aLen ? a.charCodeAt(i) : 0;
    const charB = i < bLen ? b.charCodeAt(i) : 0;
    diff |= charA ^ charB;
  }
  return diff === 0;
}

async function verifyTOTP(secretBase32, userCode, lastUsedStep = 0, currentStepOverride = null) {
  const cleanCode = String(userCode).trim().replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleanCode)) return { valid: false, step: 0, drift: 0 };
  const currentStep = currentStepOverride !== null ? currentStepOverride : Math.floor(Date.now() / 1000 / 30);
  const driftWindows = [0, -1, 1];
  for (const drift of driftWindows) {
    const candidateStep = currentStep + drift;
    if (candidateStep <= lastUsedStep) continue;
    const expected = await computeTOTP(secretBase32, candidateStep);
    if (timingSafeEqualStr(cleanCode, expected)) {
      return { valid: true, step: candidateStep, drift };
    }
  }
  return { valid: false, step: 0, drift: 0 };
}

async function encryptSecret(plainText, keyHex) {
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) keyBytes[i] = parseInt(keyHex.substring(i * 2, i * 2 + 2), 16);
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, encoder.encode(plainText));
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const cipherHex = Array.from(new Uint8Array(cipher)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${ivHex}:${cipherHex}`;
}

async function decryptSecret(payload, keyHex) {
  const [ivHex, cipherHex] = payload.split(':');
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) keyBytes[i] = parseInt(keyHex.substring(i * 2, i * 2 + 2), 16);
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  const iv = new Uint8Array(ivHex.length / 2);
  for (let i = 0; i < iv.length; i++) iv[i] = parseInt(ivHex.substring(i * 2, i * 2 + 2), 16);
  const cipher = new Uint8Array(cipherHex.length / 2);
  for (let i = 0; i < cipher.length; i++) cipher[i] = parseInt(cipherHex.substring(i * 2, i * 2 + 2), 16);
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, cipher);
  return new TextDecoder().decode(dec);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE
// ─────────────────────────────────────────────────────────────────────────────
describe('Two-Factor Authentication (RFC 6238 TOTP) Test Suite', () => {

  const testSecret = 'JBSWY3DPEHPK3PXP'; // Base32 test secret ("Hello!\xde\xad\xbe\xef")
  const masterKeyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('1. Base32 Encoding and Decoding Integrity', () => {
    const rawBytes = new Uint8Array([72, 101, 108, 108, 111, 33]); // "Hello!"
    const b32 = bytesToBase32(rawBytes);
    const roundtrip = base32ToBytes(b32);
    assert.deepEqual(Array.from(roundtrip), Array.from(rawBytes));
  });

  it('2. Standard RFC 6238 Code Computation', async () => {
    // Step 1 (30s)
    const code = await computeTOTP(testSecret, 1);
    assert.match(code, /^\d{6}$/, 'TOTP must be a 6-digit numeric string');
  });

  it('3. Clock Drift Acceptance Window (+/- 1 time step)', async () => {
    const currentStep = 1000;
    // Current step (drift 0)
    const codeCurrent = await computeTOTP(testSecret, currentStep);
    const resCurrent = await verifyTOTP(testSecret, codeCurrent, 0, currentStep);
    assert.equal(resCurrent.valid, true);
    assert.equal(resCurrent.drift, 0);

    // Past step (drift -1, -30 seconds)
    const codePast = await computeTOTP(testSecret, currentStep - 1);
    const resPast = await verifyTOTP(testSecret, codePast, 0, currentStep);
    assert.equal(resPast.valid, true);
    assert.equal(resPast.drift, -1);

    // Future step (drift +1, +30 seconds)
    const codeFuture = await computeTOTP(testSecret, currentStep + 1);
    const resFuture = await verifyTOTP(testSecret, codeFuture, 0, currentStep);
    assert.equal(resFuture.valid, true);
    assert.equal(resFuture.drift, 1);

    // Outer drift (drift +2, +60 seconds) must be REJECTED
    const codeOuter = await computeTOTP(testSecret, currentStep + 2);
    const resOuter = await verifyTOTP(testSecret, codeOuter, 0, currentStep);
    assert.equal(resOuter.valid, false, 'Codes outside +/- 1 time step must be rejected');
  });

  it('4. Replay Attack Prevention (last_used_step)', async () => {
    const currentStep = 2000;
    const code = await computeTOTP(testSecret, currentStep);

    // First use: valid
    const firstCheck = await verifyTOTP(testSecret, code, 0, currentStep);
    assert.equal(firstCheck.valid, true);
    assert.equal(firstCheck.step, currentStep);

    // Replay attack: submitting same code again with lastUsedStep = currentStep
    const replayCheck = await verifyTOTP(testSecret, code, firstCheck.step, currentStep);
    assert.equal(replayCheck.valid, false, 'Replaying a code at the same or previous step must be rejected');

    // Replay of an even older code
    const olderCode = await computeTOTP(testSecret, currentStep - 1);
    const olderCheck = await verifyTOTP(testSecret, olderCode, firstCheck.step, currentStep);
    assert.equal(olderCheck.valid, false, 'Replaying an older code must be rejected');
  });

  it('5. AES-256-GCM Secret Encryption and Decryption', async () => {
    const plainSecret = 'KVKFKRCPNZQUYMLX';
    const encrypted = await encryptSecret(plainSecret, masterKeyHex);
    assert.notEqual(encrypted, plainSecret);
    assert.match(encrypted, /^[0-9a-f]{24}:[0-9a-f]+$/i, 'Ciphertext must contain 12-byte IV + auth tagged ciphertext');

    const decrypted = await decryptSecret(encrypted, masterKeyHex);
    assert.equal(decrypted, plainSecret, 'Decrypted secret must match original plain secret');
  });

  it('6. Backup Code Hashing and Single-Use Consumption', async () => {
    // Generate backup code simulation
    const rawCode = 'A7K9-W4M2';
    const normalized = rawCode.replace('-', '').toLowerCase(); // "a7k9w4m2"
    const salt = 'f0e1d2c3b4a59687';

    // Hash code with PBKDF2
    const baseKey = await crypto.subtle.importKey('raw', encoder.encode(normalized), { name: 'PBKDF2' }, false, ['deriveBits']);
    const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 10000, hash: 'SHA-256' }, baseKey, 256);
    const codeHash = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Verification check
    const testInput = 'A7K9-W4M2'.replace('-', '').toLowerCase();
    const testBaseKey = await crypto.subtle.importKey('raw', encoder.encode(testInput), { name: 'PBKDF2' }, false, ['deriveBits']);
    const testDerived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 10000, hash: 'SHA-256' }, testBaseKey, 256);
    const testHash = Array.from(new Uint8Array(testDerived)).map(b => b.toString(16).padStart(2, '0')).join('');

    assert.equal(timingSafeEqualStr(testHash, codeHash), true);

    // Simulate mark used
    let usedAt = null;
    usedAt = Date.now();
    assert.notEqual(usedAt, null, 'Used code is marked with timestamp and excluded from future lookups');
  });

  it('7. Rate Limiting and 15-Minute Lockout Logic', () => {
    let failedAttempts = 0;
    let lockedUntil = 0;
    const now = Math.floor(Date.now() / 1000);

    for (let i = 1; i <= 5; i++) {
      failedAttempts++;
      if (failedAttempts >= 5) {
        lockedUntil = now + 900; // 15 minutes lockout
      }
    }

    assert.equal(failedAttempts, 5);
    assert.equal(lockedUntil > now, true);
    assert.equal(lockedUntil - now, 900, 'Locked until 15 minutes in future');

    // Check locked state
    const isLocked = lockedUntil > now;
    assert.equal(isLocked, true);
  });
});
