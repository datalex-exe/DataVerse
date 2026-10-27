-- Two-Factor Authentication (TOTP, RFC 6238) and Hardened Auth Migrations

-- 1. User 2FA Configuration
CREATE TABLE IF NOT EXISTS user_2fa (
  user_id TEXT PRIMARY KEY,
  secret_encrypted TEXT NOT NULL,
  enabled INTEGER DEFAULT 0,
  enabled_at INTEGER,
  last_used_step INTEGER DEFAULT 0,
  failed_attempts INTEGER DEFAULT 0,
  locked_until INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2. Single-use Hashed Backup Codes
CREATE TABLE IF NOT EXISTS backup_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  used_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_backup_codes_user ON backup_codes(user_id);

-- 3. Trusted Devices (30-day "Remember this device")
CREATE TABLE IF NOT EXISTS trusted_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);

-- 4. Auth & 2FA Audit Logs
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  details TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created ON auth_audit_log(created_at DESC);
