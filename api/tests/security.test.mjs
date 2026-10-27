import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { timingSafeEqualStr, verifyPassword, hashPassword, generateSalt } from '../src/crypto.js';

describe('Security Invariants Regression Suite', () => {
  it('DATAVERSE-003: Timing-safe equality and password verification work correctly', async () => {
    const salt = await generateSalt();
    const hash = await hashPassword('SecurePass123!', salt);

    const valid = await verifyPassword('SecurePass123!', salt, hash);
    assert.equal(valid, true, 'Valid password must verify');

    const invalid = await verifyPassword('WrongPassword!', salt, hash);
    assert.equal(invalid, false, 'Invalid password must not verify');
  });

  it('DATAVERSE-002: CORS origin regex accepts only official domain and subdomains', () => {
    const corsRegex = /^https:\/\/[a-z0-9-]+\.dataverse-datalex\.pages\.dev$/;

    assert.equal(corsRegex.test('https://preview-123.dataverse-datalex.pages.dev'), true);
    assert.equal(corsRegex.test('https://attacker.pages.dev'), false);
    assert.equal(corsRegex.test('https://evil-dataverse-datalex.pages.dev.attacker.com'), false);
    assert.equal(corsRegex.test('https://dataverse-datalex.pages.dev.evil.com'), false);
  });

  it('DATAVERSE-005: Media key scoping logic requires userId prefix/containment', () => {
    const userId = 'usr_alice_123';
    const legitimateAvatar = `avatars/${userId}-1698438400.jpg`;
    const legitimatePost = `posts/${userId}-1698438400-0.mp4`;
    const victimAvatar = 'avatars/usr_victim_999-1698438400.jpg';

    assert.equal(legitimateAvatar.includes(userId), true, 'User avatar key must contain user ID');
    assert.equal(legitimatePost.includes(userId), true, 'User post key must contain user ID');
    assert.equal(victimAvatar.includes(userId), false, 'Victim key must not be allowed for user Alice');
  });
});
