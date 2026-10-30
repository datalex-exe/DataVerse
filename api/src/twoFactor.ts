import { Hono } from 'hono';
import { Bindings, Variables, User, User2FA } from './types';
import { authMiddleware, signToken, verifyToken } from './auth';
import { 
  verifyPassword, 
  encryptSecret, 
  decryptSecret, 
  sha256Hex, 
  generateRandomToken 
} from './crypto';
import { 
  generateBase32Secret, 
  verifyTOTP, 
  generateTOTPUri, 
  generateBackupCodes, 
  generateQRCodeSvg 
} from './totp';
import { checkRateLimit, getClientIp } from './rateLimit';
import { sendSecurityEmail } from './email';

const twoFactorApp = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Audit log helper
 */
async function recordAuditLog(
  db: any,
  userId: string,
  event: string,
  ip: string,
  userAgent: string | null,
  details?: any
) {
  try {
    const id = crypto.randomUUID();
    const detailsStr = details ? JSON.stringify(details) : null;
    await db.prepare(
      'INSERT INTO auth_audit_log (id, user_id, event, ip, user_agent, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(id, userId, event, ip, userAgent || '', detailsStr, Date.now())
      .run();
  } catch (err) {
    console.error('Failed to write auth audit log:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET 2FA STATUS (Protected)
// ─────────────────────────────────────────────────────────────────────────────
twoFactorApp.get('/status', authMiddleware, async (c) => {
  const userId = c.get('userId');

  const config = await c.env.DB.prepare(
    'SELECT enabled, enabled_at FROM user_2fa WHERE user_id = ?'
  )
    .bind(userId)
    .first<any>();

  const backupCountResult = await c.env.DB.prepare(
    'SELECT COUNT(*) as remaining FROM backup_codes WHERE user_id = ? AND used_at IS NULL'
  )
    .bind(userId)
    .first<any>();

  const isEnabled = config && config.enabled === 1;
  const remainingCodes = backupCountResult ? Number(backupCountResult.remaining) : 0;

  return c.json({
    enabled: !!isEnabled,
    enabled_at: config ? config.enabled_at : null,
    backup_codes_remaining: remainingCodes
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. SETUP 2FA (Protected, Re-authenticates with password)
// ─────────────────────────────────────────────────────────────────────────────
twoFactorApp.post('/setup', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const ip = getClientIp(c);
  const userAgent = c.req.header('user-agent') || null;

  // Rate limit: 5 setup attempts per 10 minutes
  const rl = await checkRateLimit(c, { prefix: `2fa_setup_${userId}`, limit: 5, windowSeconds: 600 });
  if (!rl.allowed) {
    return c.json({ error: 'Too many setup requests. Please wait a few minutes before trying again.' }, 429);
  }

  const { password } = await c.req.json();
  if (!password) {
    return c.json({ error: 'Current password is required to configure two-factor authentication.' }, 400);
  }

  // Fetch user credentials for re-authentication
  const user = await c.env.DB.prepare('SELECT username, password_salt, password_hash FROM users WHERE id = ?')
    .bind(userId)
    .first<any>();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const isMatch = await verifyPassword(String(password), user.password_salt, user.password_hash);
  if (!isMatch) {
    await recordAuditLog(c.env.DB, userId, '2fa_setup_auth_failed', ip, userAgent);
    return c.json({ error: 'Incorrect password.' }, 401);
  }

  // Generate Base32 secret (160-bit key)
  const plainSecret = generateBase32Secret(20);
  const encryptedSecret = await encryptSecret(plainSecret, c.env.TWO_FACTOR_ENCRYPTION_KEY);

  // Store in KV with 10-minute expiration
  const pendingData = {
    userId,
    secret_plain: plainSecret,
    secret_encrypted: encryptedSecret,
    createdAt: Date.now()
  };
  await c.env.SESSION_KV.put(`2fa_pending:${userId}`, JSON.stringify(pendingData), { expirationTtl: 600 });

  const otpauthUri = generateTOTPUri(user.username, plainSecret, 'DataVerse');
  const qrCodeSvg = generateQRCodeSvg(otpauthUri, 220);

  await recordAuditLog(c.env.DB, userId, '2fa_setup_initiated', ip, userAgent);

  return c.json({
    success: true,
    secret: plainSecret,
    otpauth_uri: otpauthUri,
    qr_code_svg: qrCodeSvg,
    expires_in_seconds: 600
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ENABLE 2FA (Protected, Verifies first code)
// ─────────────────────────────────────────────────────────────────────────────
twoFactorApp.post('/enable', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const ip = getClientIp(c);
  const userAgent = c.req.header('user-agent') || null;

  const { code } = await c.req.json();
  if (!code || typeof code !== 'string') {
    return c.json({ error: 'Verification code is required.' }, 400);
  }

  // Retrieve pending secret from KV
  const pendingRaw = await c.env.SESSION_KV.get(`2fa_pending:${userId}`);
  if (!pendingRaw) {
    return c.json({ error: '2FA setup session expired or not found. Please initiate setup again.' }, 400);
  }

  const pending = JSON.parse(pendingRaw);
  const result = await verifyTOTP(pending.secret_plain, code, 0);

  if (!result.valid) {
    await recordAuditLog(c.env.DB, userId, '2fa_enable_failed', ip, userAgent);
    return c.json({
      error: 'Invalid 6-digit verification code. Please ensure your authenticator app time is synchronized and try again.'
    }, 400);
  }

  const now = Date.now();

  // Commit configuration to user_2fa
  await c.env.DB.prepare(
    'INSERT OR REPLACE INTO user_2fa (user_id, secret_encrypted, enabled, enabled_at, last_used_step, failed_attempts, locked_until) VALUES (?, ?, 1, ?, ?, 0, 0)'
  )
    .bind(userId, pending.secret_encrypted, now, result.step)
    .run();

  // Generate 10 single-use backup codes
  const backupCodes = await generateBackupCodes(10);
  
  // Clean up any old backup codes
  await c.env.DB.prepare('DELETE FROM backup_codes WHERE user_id = ?').bind(userId).run();

  // Insert newly hashed backup codes
  const insertStatements = backupCodes.map((bc) => {
    return c.env.DB.prepare(
      'INSERT INTO backup_codes (id, user_id, code_hash, salt, used_at) VALUES (?, ?, ?, ?, NULL)'
    ).bind(crypto.randomUUID(), userId, bc.hash, bc.salt);
  });
  await c.env.DB.batch(insertStatements);

  // Clear KV pending secret
  await c.env.SESSION_KV.delete(`2fa_pending:${userId}`);

  // Record audit log
  await recordAuditLog(c.env.DB, userId, '2fa_enabled', ip, userAgent);

  // Send security email alert
  const user = await c.env.DB.prepare('SELECT email, username FROM users WHERE id = ?')
    .bind(userId)
    .first<any>();

  if (user && user.email) {
    await sendSecurityEmail({
      toEmail: user.email,
      toName: user.username,
      subject: 'Two-Factor Authentication Enabled on DataVerse',
      html: `
        <h2 style="color:#2dd4bf;margin:0 0 12px;font-size:18px;">Two-Factor Authentication is Active</h2>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#e0f2f1;">
          Hello <strong>@${user.username}</strong>,<br>
          Two-factor authentication (TOTP) has been successfully enabled on your DataVerse account. Your account is now protected with an additional layer of security.
        </p>
        <p style="margin:0;font-size:13px;color:#7fa3aa;">
          Make sure you saved your 10 backup codes in a safe place. If you ever lose access to your authenticator app, backup codes are the only way to recover access.
        </p>
      `
    });
  }

  return c.json({
    success: true,
    message: 'Two-factor authentication successfully enabled.',
    backup_codes: backupCodes.map((bc) => bc.raw)
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. VERIFY 2FA CHALLENGE ON LOGIN (Public, single-purpose mfa_token)
// ─────────────────────────────────────────────────────────────────────────────
twoFactorApp.post('/verify', async (c) => {
  const ip = getClientIp(c);
  const userAgent = c.req.header('user-agent') || null;

  // Rate limit: 10 attempts per 5 minutes per IP
  const rl = await checkRateLimit(c, { prefix: '2fa_verify_ip', limit: 10, windowSeconds: 300 });
  if (!rl.allowed) {
    return c.json({ error: 'Too many verification attempts. Please wait a few minutes before trying again.' }, 429);
  }

  const { mfa_token, code, trust_device } = await c.req.json();

  if (!mfa_token || !code) {
    return c.json({ error: 'Missing authentication parameters.' }, 400);
  }

  // 1. Verify single-purpose mfa_token
  const payload = await verifyToken(mfa_token, c.env.JWT_SECRET);
  if (!payload || !payload.userId) {
    return c.json({ error: 'Authentication challenge expired or invalid. Please log in again.' }, 401);
  }

  const userId = payload.userId;

  // Check if this mfa_token was already consumed (one-time use nonce)
  const isUsed = await c.env.SESSION_KV.get(`mfa_token_used:${mfa_token}`);
  if (isUsed) {
    await recordAuditLog(c.env.DB, userId, '2fa_token_replay_rejected', ip, userAgent);
    return c.json({ error: 'This authentication challenge has already been used. Please log in again.' }, 401);
  }

  // 2. Fetch user 2FA config
  const config = await c.env.DB.prepare(
    'SELECT user_id, secret_encrypted, enabled, last_used_step, failed_attempts, locked_until FROM user_2fa WHERE user_id = ?'
  )
    .bind(userId)
    .first<any>();

  if (!config || config.enabled !== 1) {
    return c.json({ error: 'Two-factor authentication is not configured for this account.' }, 400);
  }

  const now = Math.floor(Date.now() / 1000);

  // 3. Lockout enforcement (15 minutes after 5 failed attempts)
  if (config.locked_until && config.locked_until > now) {
    const remainingSeconds = config.locked_until - now;
    return c.json({
      error: `Account temporarily locked due to multiple failed 2FA attempts. Please try again in ${Math.ceil(remainingSeconds / 60)} minute(s).`
    }, 429);
  }

  const cleanCode = String(code).trim().replace(/\s/g, '');
  const isBackupCode = cleanCode.includes('-') || (cleanCode.length === 8 && !/^\d{6}$/.test(cleanCode));

  let verified = false;
  let usedBackupCodeId: string | null = null;
  let newLastUsedStep = config.last_used_step;

  if (isBackupCode) {
    // ── BACKUP CODE FLOW ──
    const normalizedInput = cleanCode.replace(/-/g, '').toLowerCase();
    const { results: unusedCodes } = await c.env.DB.prepare(
      'SELECT id, code_hash, salt FROM backup_codes WHERE user_id = ? AND used_at IS NULL'
    )
      .bind(userId)
      .all<any>();

    if (unusedCodes && unusedCodes.length > 0) {
      for (const bc of unusedCodes) {
        const matches = await verifyPassword(normalizedInput, bc.salt, bc.code_hash);
        if (matches) {
          verified = true;
          usedBackupCodeId = bc.id;
          break;
        }
      }
    }
  } else {
    // ── 6-DIGIT TOTP FLOW ──
    try {
      const secretPlain = await decryptSecret(config.secret_encrypted, c.env.TWO_FACTOR_ENCRYPTION_KEY);
      const totpResult = await verifyTOTP(secretPlain, cleanCode, config.last_used_step);
      if (totpResult.valid) {
        verified = true;
        newLastUsedStep = totpResult.step;
      }
    } catch (err) {
      console.error('TOTP verification decryption error:', err);
    }
  }

  if (!verified) {
    // Increment failed attempts and trigger lockout if >= 5
    const failedAttempts = (config.failed_attempts || 0) + 1;
    const shouldLock = failedAttempts >= 5;
    const lockedUntil = shouldLock ? now + 900 : 0;

    await c.env.DB.prepare(
      'UPDATE user_2fa SET failed_attempts = ?, locked_until = ? WHERE user_id = ?'
    )
      .bind(failedAttempts, lockedUntil, userId)
      .run();

    await recordAuditLog(c.env.DB, userId, '2fa_verify_failed', ip, userAgent, { failedAttempts, locked: shouldLock });

    if (shouldLock) {
      return c.json({
        error: 'Too many incorrect verification codes. Your account has been temporarily locked for 15 minutes.'
      }, 429);
    }

    const hint = failedAttempts >= 3 
      ? ' Hint: Make sure your device clock is set automatically under system date & time settings.' 
      : '';
    return c.json({ error: `Invalid verification code.${hint}` }, 400);
  }

  // ── SUCCESSFUL VERIFICATION ──
  // Reset failure count, update last used step
  await c.env.DB.prepare(
    'UPDATE user_2fa SET failed_attempts = 0, locked_until = 0, last_used_step = ? WHERE user_id = ?'
  )
    .bind(newLastUsedStep, userId)
    .run();

  // If backup code was used, mark it consumed immediately
  if (usedBackupCodeId) {
    await c.env.DB.prepare('UPDATE backup_codes SET used_at = ? WHERE id = ?')
      .bind(Date.now(), usedBackupCodeId)
      .run();

    await recordAuditLog(c.env.DB, userId, 'backup_code_used', ip, userAgent);

    // Alert user that a backup code was used
    const user = await c.env.DB.prepare('SELECT email, username FROM users WHERE id = ?').bind(userId).first<any>();
    if (user && user.email) {
      await sendSecurityEmail({
        toEmail: user.email,
        toName: user.username,
        subject: 'Security Alert: Backup Code Used to Sign In',
        html: `
          <h2 style="color:#f2c14e;margin:0 0 12px;font-size:18px;">Backup Code Used</h2>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#e0f2f1;">
            A single-use backup code was just used to sign into your DataVerse account <strong>@${user.username}</strong> from IP <code>${ip}</code>.
          </p>
          <p style="margin:0;font-size:13px;color:#7fa3aa;">
            Each backup code works only once. If you are running low on backup codes, you can generate a new set in Settings &gt; Security.
          </p>
        `
      });
    }
  } else {
    await recordAuditLog(c.env.DB, userId, '2fa_verify_success', ip, userAgent);
  }

  // Invalidate the single-use mfa_token in KV
  await c.env.SESSION_KV.put(`mfa_token_used:${mfa_token}`, '1', { expirationTtl: 300 });

  // Issue real session JWT token (30 days validity)
  const realSessionToken = await signToken(userId, c.env.JWT_SECRET);
  await c.env.SESSION_KV.put(`session:${realSessionToken}`, userId, { expirationTtl: 2592000 });

  // Optional: Trust this device for 30 days
  let trustedDeviceCookie: string | null = null;
  if (trust_device) {
    const rawDeviceToken = generateRandomToken(32);
    const hashedDeviceToken = await sha256Hex(rawDeviceToken);
    const deviceId = crypto.randomUUID();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

    await c.env.DB.prepare(
      'INSERT INTO trusted_devices (id, user_id, token_hash, user_agent, ip, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(deviceId, userId, hashedDeviceToken, userAgent, ip, expiresAt, Date.now())
      .run();

    // Set secure HttpOnly cookie for 30 days
    trustedDeviceCookie = `dv_trusted_device=${rawDeviceToken}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`;
    c.header('Set-Cookie', trustedDeviceCookie);
  }

  // Fetch full user record
  const user = await c.env.DB.prepare(
    'SELECT id, username, email, display_name, bio, avatar_url, cover_url, cover_pos_y, is_verified, is_admin, is_top_admin, is_blocked, is_private, created_at FROM users WHERE id = ?'
  )
    .bind(userId)
    .first<any>();

  const userObj: User = {
    ...user,
    is_verified: !!user.is_verified,
    is_admin: !!user.is_admin,
    is_top_admin: !!user.is_top_admin,
    is_blocked: !!user.is_blocked,
    is_private: !!user.is_private
  };

  return c.json({
    token: realSessionToken,
    user: userObj
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. DISABLE 2FA (Protected, requires password + current TOTP code)
// ─────────────────────────────────────────────────────────────────────────────
twoFactorApp.post('/disable', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const ip = getClientIp(c);
  const userAgent = c.req.header('user-agent') || null;

  const { password, code } = await c.req.json();
  if (!password || !code) {
    return c.json({ error: 'Both current password and 6-digit verification code are required to disable 2FA.' }, 400);
  }

  // 1. Verify password
  const user = await c.env.DB.prepare('SELECT email, username, password_salt, password_hash FROM users WHERE id = ?')
    .bind(userId)
    .first<any>();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const isMatch = await verifyPassword(String(password), user.password_salt, user.password_hash);
  if (!isMatch) {
    await recordAuditLog(c.env.DB, userId, '2fa_disable_bad_password', ip, userAgent);
    return c.json({ error: 'Incorrect password.' }, 401);
  }

  // 2. Verify TOTP code
  const config = await c.env.DB.prepare('SELECT secret_encrypted, last_used_step FROM user_2fa WHERE user_id = ?')
    .bind(userId)
    .first<any>();

  if (!config) {
    return c.json({ error: 'Two-factor authentication is not enabled.' }, 400);
  }

  const secretPlain = await decryptSecret(config.secret_encrypted, c.env.TWO_FACTOR_ENCRYPTION_KEY);
  const result = await verifyTOTP(secretPlain, String(code).trim(), config.last_used_step);

  if (!result.valid) {
    await recordAuditLog(c.env.DB, userId, '2fa_disable_bad_code', ip, userAgent);
    return c.json({ error: 'Invalid verification code.' }, 400);
  }

  // 3. Clear 2FA tables & revoke trusted devices
  await c.env.DB.prepare('DELETE FROM user_2fa WHERE user_id = ?').bind(userId).run();
  await c.env.DB.prepare('DELETE FROM backup_codes WHERE user_id = ?').bind(userId).run();
  await c.env.DB.prepare('DELETE FROM trusted_devices WHERE user_id = ?').bind(userId).run();

  await recordAuditLog(c.env.DB, userId, '2fa_disabled', ip, userAgent);

  // Send security alert email
  if (user.email) {
    await sendSecurityEmail({
      toEmail: user.email,
      toName: user.username,
      subject: 'Security Alert: Two-Factor Authentication Was Disabled',
      html: `
        <h2 style="color:#ff6b81;margin:0 0 12px;font-size:18px;">Two-Factor Authentication Disabled</h2>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#e0f2f1;">
          Hello <strong>@${user.username}</strong>,<br>
          Two-factor authentication has been disabled on your DataVerse account. Your account is now protected by password only.
        </p>
        <p style="margin:0;font-size:13px;color:#7fa3aa;">
          All previously trusted devices have been revoked. If you did not make this change, please reset your password immediately.
        </p>
      `
    });
  }

  return c.json({
    success: true,
    message: 'Two-factor authentication has been successfully disabled.'
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. REGENERATE BACKUP CODES (Protected, requires current code)
// ─────────────────────────────────────────────────────────────────────────────
twoFactorApp.post('/backup-codes/regenerate', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const ip = getClientIp(c);
  const userAgent = c.req.header('user-agent') || null;

  const { code } = await c.req.json();
  if (!code) {
    return c.json({ error: 'Current 6-digit verification code is required.' }, 400);
  }

  const config = await c.env.DB.prepare('SELECT secret_encrypted, last_used_step FROM user_2fa WHERE user_id = ?')
    .bind(userId)
    .first<any>();

  if (!config) {
    return c.json({ error: 'Two-factor authentication is not active on this account.' }, 400);
  }

  const secretPlain = await decryptSecret(config.secret_encrypted, c.env.TWO_FACTOR_ENCRYPTION_KEY);
  const result = await verifyTOTP(secretPlain, String(code).trim(), config.last_used_step);

  if (!result.valid) {
    return c.json({ error: 'Invalid verification code.' }, 400);
  }

  // Update last used step
  await c.env.DB.prepare('UPDATE user_2fa SET last_used_step = ? WHERE user_id = ?')
    .bind(result.step, userId)
    .run();

  // Generate 10 new codes
  const newBackupCodes = await generateBackupCodes(10);
  await c.env.DB.prepare('DELETE FROM backup_codes WHERE user_id = ?').bind(userId).run();

  const insertStatements = newBackupCodes.map((bc) => {
    return c.env.DB.prepare(
      'INSERT INTO backup_codes (id, user_id, code_hash, salt, used_at) VALUES (?, ?, ?, ?, NULL)'
    ).bind(crypto.randomUUID(), userId, bc.hash, bc.salt);
  });
  await c.env.DB.batch(insertStatements);

  await recordAuditLog(c.env.DB, userId, 'backup_codes_regenerated', ip, userAgent);

  return c.json({
    success: true,
    message: 'Backup codes have been regenerated. Old codes are no longer valid.',
    backup_codes: newBackupCodes.map((bc) => bc.raw)
  });
});

export default twoFactorApp;
