# Two-Factor Authentication (2FA) & Security Hardening — DataVerse

This document describes the architecture, configuration, user experience, and testing procedures for the Two-Factor Authentication (TOTP, RFC 6238) and authentication hardening implementation in DataVerse.

---

## 📍 Where is the 2FA Setup Located?

### In the User Interface:
1. **Log in** to your DataVerse account at `https://dataverse-datalex.pages.dev`.
2. Navigate to your **Profile** page (`/profile` or click your avatar/username in the navigation).
3. Click the **Settings** button (gear icon next to your profile username).
4. In the Settings sidebar, click **Security & 2FA** (shield icon).
5. Click **Enable 2FA** to start the enrollment wizard:
   - **Step 1 (Authenticate)**: Enter your current account password to initiate secure key generation.
   - **Step 2 (Scan & Verify)**: Scan the high-contrast SVG QR Code using **Google Authenticator**, **Microsoft Authenticator**, **Authy**, or **1Password** (or copy the Base32 secret key manually), then enter the current 6-digit code.
   - **Step 3 (Backup Codes)**: Receive 10 single-use recovery codes. Copy them to your clipboard or download them as a `.txt` file, check the acknowledgment box, and finalize setup.

### In the Admin Console:
- Administrators can visit the **Admin Console > Users** tab.
- Users with active two-factor authentication display a teal **2FA** badge.
- Administrators can click the **Reset 2FA** button (amber shield icon) to perform emergency account recovery, which clears 2FA configuration, revokes trusted devices, logs the administrative action, and sends a notification email to the user.

---

## 🛡️ Architecture & Security Pillars

### 1. RFC 6238 TOTP Engine (`api/src/totp.ts`)
- **Zero External Dependencies**: Operates natively on Web Crypto (`crypto.subtle`) for maximum performance and security on Cloudflare Workers.
- **HMAC-SHA1**: Computes standard 6-digit codes over 30-second time steps using the Unix epoch.
- **Base32 RFC 4648**: Custom Base32 encoder/decoder for 160-bit secret generation without npm bloat.
- **Clock Drift Window**: Tolerates $\pm 1$ time step (a 90-second acceptance window) to prevent user lockout due to minor client device clock skew.
- **Replay Protection**: The database table `user_2fa` tracks `last_used_step`. Any subsequent submission with the same or an older time step is rejected.

### 2. Encryption at Rest (`api/src/crypto.ts`)
- 2FA secrets are encrypted using **AES-256-GCM** with a cryptographically random 12-byte initialization vector (IV) prepended to the ciphertext before persisting in Cloudflare D1 (`user_2fa.secret_encrypted`).
- Key is provided via `TWO_FACTOR_ENCRYPTION_KEY` in environment bindings.

### 3. Single-Use Backup Recovery Codes
- 10 backup codes generated in `XXXX-XXXX` format using secure random bytes.
- Stored as salted PBKDF2 hashes in `backup_codes` table.
- Codes are single-use; the raw codes are displayed only once upon generation.
- Using a backup code marks `used_at = timestamp` and dispatches a security warning email to the account owner.

### 4. Brute-Force & Lockout Protection
- 5 consecutive failed 2FA verification attempts results in an automatic **15-minute account lockout** (`locked_until`).
- IP-based rate limiting on `/api/auth/2fa/verify` (10 attempts per 5 minutes per IP).

### 5. Trusted Devices ("Remember this device for 30 days")
- Users can check "Trust this device for 30 days" during login.
- Issues a cryptographically secure 256-bit token stored in `trusted_devices` table and set via secure `HttpOnly; SameSite=Lax` cookie (`dv_trusted_device`).
- Trusted devices bypass the TOTP prompt for 30 days, but are automatically invalidated if the user changes their password or disables 2FA.

### 6. Audit Logging (`auth_audit_log`)
Every critical security event is permanently recorded in the database:
- `2fa_setup_initiated`
- `2fa_enabled`
- `2fa_verify_success`
- `2fa_verify_backup_code_used`
- `2fa_verify_failed`
- `2fa_verify_locked`
- `2fa_disabled`
- `2fa_admin_reset`

---

## 🧪 Automated & Manual Verification

### Running Automated Test Suite
From the `api/` directory:
```bash
node --test tests/2fa.test.mjs
```
Expected output:
```
▶ Two-Factor Authentication (RFC 6238 TOTP) Test Suite
  ✔ 1. Base32 Encoding and Decoding Integrity
  ✔ 2. Standard RFC 6238 Code Computation
  ✔ 3. Clock Drift Acceptance Window (+/- 1 time step)
  ✔ 4. Replay Attack Prevention (last_used_step)
  ✔ 5. AES-256-GCM Secret Encryption and Decryption
  ✔ 6. Backup Code Hashing and Single-Use Consumption
  ✔ 7. Rate Limiting and 15-Minute Lockout Logic
✔ Two-Factor Authentication (RFC 6238 TOTP) Test Suite
ℹ tests 7 | pass 7 | fail 0
```

### Manual Testing Checklist
1. **Enrollment**: Go to Profile > Settings > Security & 2FA > Enable 2FA. Verify password -> scan QR in Google Authenticator -> enter 6-digit code -> save backup codes.
2. **Challenge on Login**: Log out, then log in with username and password. Confirm the 2FA challenge modal appears.
3. **Valid Code**: Enter the 6-digit code from Google Authenticator. Confirm automatic verification and session creation.
4. **Replay Protection**: Attempt to use the same 6-digit code a second time within the same 30-second window. Confirm rejection.
5. **Backup Code**: Log in using a single-use backup code (`XXXX-XXXX`). Confirm successful entry, code invalidation, and email alert.
6. **Device Trust**: Log in with "Trust this device for 30 days" checked. Log out and log back in from the same browser. Confirm 2FA prompt is skipped.
7. **Regenerate Codes**: In Settings > Security & 2FA, click "Regenerate Codes". Enter current TOTP code and confirm 10 new codes are generated.
8. **Disable 2FA**: In Settings > Security & 2FA, click "Disable". Enter password + 6-digit TOTP code and confirm 2FA is turned off.
9. **Admin Reset**: Log in as an administrator, open Admin Console > Users, locate user with 2FA, and click "Reset 2FA". Confirm user is reset to password-only login.
