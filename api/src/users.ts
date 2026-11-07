import { Hono } from 'hono';
import { Bindings, Variables } from './types';
import { authMiddleware, verifyToken } from './auth';
import { generateSalt, hashPassword, verifyPassword } from './crypto';

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const usersApp = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ─── SEARCH USERS ──────────────────────────────────────────────────────────────
usersApp.get('/search', async (c) => {
  const query = c.req.query('q');
  if (!query || query.trim() === '') {
    return c.json({ users: [] });
  }

  let currentUserId: string | null = null;
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = await verifyToken(token, c.env.JWT_SECRET);
      if (payload) currentUserId = payload.userId;
    } catch {
      // Ignore token verification error for search view
    }
  }

  const cleanQuery = `%${query.trim().toLowerCase()}%`;
  const users = await c.env.DB.prepare(`
    SELECT id, username, display_name, avatar_url, is_verified 
    FROM users 
    WHERE (username LIKE ? OR display_name LIKE ?)
      AND (? IS NULL OR id NOT IN (
        SELECT blocker_id FROM user_blocks WHERE blocked_id = ?
        UNION
        SELECT blocked_id FROM user_blocks WHERE blocker_id = ?
      ))
    LIMIT 15
  `)
    .bind(cleanQuery, cleanQuery, currentUserId, currentUserId, currentUserId)
    .all();

  const mappedUsers = (users.results || []).map((u: any) => ({
    ...u,
    is_verified: !!u.is_verified
  }));

  return c.json({ users: mappedUsers });
});

// ─── GET NOTIFICATIONS ─────────────────────────────────────────────────────────
usersApp.get('/notifications', authMiddleware, async (c) => {
  const userId = c.get('userId');
  try {
    const { results: notifications } = await c.env.DB.prepare(`
      SELECT n.id, n.type, n.post_id, n.body, n.created_at, n.is_read, n.notifier_id,
        u.username, u.display_name, u.avatar_url
      FROM notifications n
      LEFT JOIN users u ON n.notifier_id = u.id
      WHERE n.user_id = ?
        AND (n.notifier_id IS NULL OR n.notifier_id NOT IN (
          SELECT blocker_id FROM user_blocks WHERE blocked_id = ?
          UNION
          SELECT blocked_id FROM user_blocks WHERE blocker_id = ?
          UNION
          SELECT muted_id FROM user_mutes WHERE muter_id = ?
        ))
      ORDER BY n.created_at DESC
      LIMIT 50
    `)
      .bind(userId, userId, userId, userId)
      .all<any>();

    return c.json({ notifications: notifications || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── MARK ALL NOTIFICATIONS AS READ ───────────────────────────────────────────
usersApp.put('/notifications/read', authMiddleware, async (c) => {
  const userId = c.get('userId');
  try {
    await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0')
      .bind(userId)
      .run();
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── GET ALL USERS (Top Admin Dashboard) ───────────────────────────────────────
usersApp.get('/', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const caller = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || (caller.is_admin !== 1 && caller.is_top_admin !== 1)) {
    return c.json({ error: 'Unauthorized admin dashboard access' }, 403);
  }

  try {
    const { results: users } = await c.env.DB.prepare(`
      SELECT u.id, u.username, u.email, u.display_name, u.avatar_url, u.is_verified, u.is_admin, u.is_top_admin, u.is_blocked, u.suspended_until, u.chat_restricted_until, u.is_verification_paid, u.verification_paid_at, u.verification_category, u.verification_document_url, u.verification_reason, u.verification_status, u.created_at,
             COALESCE(t.enabled, 0) AS has_2fa
      FROM users u
      LEFT JOIN user_2fa t ON u.id = t.user_id
      ORDER BY u.created_at DESC
    `).all<any>();

    const mappedUsers = (users || []).map(u => ({
      ...u,
      is_verified: !!u.is_verified,
      is_admin: !!u.is_admin,
      is_top_admin: !!u.is_top_admin,
      is_blocked: !!u.is_blocked,
      has_2fa: !!u.has_2fa,
      chat_restricted_until: u.chat_restricted_until || 0,
      suspended_until: u.suspended_until || 0,
      is_verification_paid: !!u.is_verification_paid,
      verification_paid_at: u.verification_paid_at || 0,
      verification_category: u.verification_category || null,
      verification_document_url: u.verification_document_url || null,
      verification_reason: u.verification_reason || null,
      verification_status: u.verification_status || 'none'
    }));

    return c.json({ users: mappedUsers });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── UPDATE PROFILE ────────────────────────────────────────────────────────────
usersApp.put('/profile', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const { username, email, display_name, bio, avatar_url, cover_url, cover_pos_y, new_password, current_password } = await c.req.json();

  try {
    // Fetch current user details including password credentials
    const currentUser = await c.env.DB.prepare('SELECT username, email, display_name, bio, avatar_url, cover_url, cover_pos_y, password_hash, password_salt FROM users WHERE id = ?')
      .bind(userId)
      .first<any>();

    if (!currentUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const targetUsername = (username && String(username).trim() !== '') ? String(username).trim().toLowerCase() : currentUser.username;
    const targetEmail = (email && String(email).trim() !== '') ? String(email).trim().toLowerCase() : currentUser.email;
    const targetAvatarUrl = (avatar_url !== undefined && avatar_url !== null) ? avatar_url : currentUser.avatar_url;
    const targetCoverUrl = cover_url !== undefined ? (cover_url || null) : (currentUser.cover_url || null);
    const targetCoverPosY = (cover_pos_y !== undefined && cover_pos_y !== null)
      ? Math.max(0, Math.min(100, Math.round(Number(cover_pos_y))))
      : (currentUser.cover_pos_y !== undefined && currentUser.cover_pos_y !== null ? currentUser.cover_pos_y : 50);

    const isChangingPassword = new_password && String(new_password).trim() !== '';
    const isChangingEmail = (email && String(email).trim() !== '') && (targetEmail.toLowerCase() !== currentUser.email.toLowerCase());

    // Require current password verification when changing password or email
    if (isChangingPassword || isChangingEmail) {
      if (!current_password || typeof current_password !== 'string') {
        return c.json({ error: 'Current password is required to change password or email address.' }, 400);
      }
      const isMatch = await verifyPassword(String(current_password), currentUser.password_salt, currentUser.password_hash);
      if (!isMatch) {
        return c.json({ error: 'Incorrect current password.' }, 401);
      }
    }

    // Validate username syntax if changed
    if (username && String(username).trim() !== '') {
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernameRegex.test(targetUsername)) {
        return c.json({ error: 'Username must be 3-30 characters long and contain only letters, numbers, and underscores.' }, 400);
      }
    }

    // Validate email format if changed
    if (email && String(email).trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(targetEmail) || targetEmail.length > 255) {
        return c.json({ error: 'Please enter a valid email address.' }, 400);
      }
    }

    // Validate password if provided
    if (isChangingPassword) {
      const passStr = String(new_password).trim();
      if (passStr.length < 8) {
        return c.json({ error: 'New password must be at least 8 characters long.' }, 400);
      }
      if (passStr.length > 128) {
        return c.json({ error: 'Password cannot exceed 128 characters.' }, 400);
      }
    }

    // Validate username uniqueness if changed
    if (targetUsername.toLowerCase() !== currentUser.username.toLowerCase()) {
      const cleanUsername = targetUsername.toLowerCase();
      const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE LOWER(username) = ? AND id != ?')
        .bind(cleanUsername, userId)
        .first<any>();
      if (existingUser) {
        return c.json({ error: 'Username is already taken' }, 400);
      }
    }

    // Validate email uniqueness if changed
    if (targetEmail.toLowerCase() !== currentUser.email.toLowerCase()) {
      const cleanEmail = targetEmail.toLowerCase();
      const existingEmail = await c.env.DB.prepare('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?')
        .bind(cleanEmail, userId)
        .first<any>();
      if (existingEmail) {
        return c.json({ error: 'Email is already taken' }, 400);
      }
    }

    const safeDisplayName = display_name !== undefined ? String(display_name).trim().substring(0, 50) : (currentUser.display_name || '');
    const safeBio = bio !== undefined ? String(bio).trim().substring(0, 500) : (currentUser.bio || '');

    if (new_password && String(new_password).trim() !== '') {
      const salt = await generateSalt();
      const passwordHash = await hashPassword(String(new_password).trim(), salt);
      await c.env.DB.prepare(
        'UPDATE users SET username = ?, email = ?, display_name = ?, bio = ?, avatar_url = ?, cover_url = ?, cover_pos_y = ?, password_hash = ?, password_salt = ? WHERE id = ?'
      )
        .bind(targetUsername, targetEmail, safeDisplayName, safeBio, targetAvatarUrl || '', targetCoverUrl, targetCoverPosY, passwordHash, salt, userId)
        .run();
    } else {
      await c.env.DB.prepare(
        'UPDATE users SET username = ?, email = ?, display_name = ?, bio = ?, avatar_url = ?, cover_url = ?, cover_pos_y = ? WHERE id = ?'
      )
        .bind(targetUsername, targetEmail, safeDisplayName, safeBio, targetAvatarUrl || '', targetCoverUrl, targetCoverPosY, userId)
        .run();
    }

    return c.json({ success: true, message: 'Profile updated', cover_url: targetCoverUrl, cover_pos_y: targetCoverPosY });
  } catch (err: any) {
    return c.json({ error: err.message || 'Update failed' }, 500);
  }
});

// ─── TOGGLE PRIVATE ACCOUNT ────────────────────────────────────────────────────
usersApp.patch('/profile/privacy', authMiddleware, async (c) => {
  const userId = c.get('userId');
  try {
    const { is_private } = await c.req.json();
    await c.env.DB.prepare('UPDATE users SET is_private = ? WHERE id = ?')
      .bind(is_private ? 1 : 0, userId)
      .run();
    return c.json({ success: true, is_private: !!is_private });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── AVATAR UPLOAD URL ─────────────────────────────────────────────────────────
usersApp.post('/profile/avatar-upload-url', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const { contentType } = await c.req.json();

  if (!contentType || !contentType.startsWith('image/')) {
    return c.json({ error: 'Invalid content type. Must be an image.' }, 400);
  }

  const fileExtension = contentType.split('/')[1] || 'jpg';
  const key = `avatars/${userId}-${Date.now()}.${fileExtension}`;

  try {
    return c.json({
      uploadPath: `/api/media/upload?key=${encodeURIComponent(key)}`,
      key
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── PAY VERIFICATION FEE (₹199 subscription) ──────────────────────────────────
usersApp.put('/profile/verify/pay', authMiddleware, async (c) => {
  const userId = c.get('userId');
  try {
    const body = await c.req.json().catch(() => ({}));
    const paymentMethod = typeof body.payment_method === 'string' && body.payment_method.trim() ? body.payment_method.trim() : 'card';
    const amount = typeof body.amount === 'number' && body.amount > 0 ? body.amount : 199;
    const transactionId = typeof body.transaction_id === 'string' && body.transaction_id.trim()
      ? body.transaction_id.trim()
      : `DV-PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Ensure verification_payments table exists
    await c.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS verification_payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT DEFAULT 'INR',
        payment_method TEXT NOT NULL,
        transaction_id TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        created_at INTEGER NOT NULL
      )
    `).run().catch(() => {});

    const payId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    await c.env.DB.prepare(
      'INSERT INTO verification_payments (id, user_id, amount, currency, payment_method, transaction_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(payId, userId, amount, 'INR', paymentMethod, transactionId, 'completed', now).run().catch(() => {});

    await c.env.DB.prepare(
      'UPDATE users SET is_verification_paid = 1, verification_paid_at = ?, verification_status = "none", is_verified = 0 WHERE id = ?'
    )
      .bind(now, userId)
      .run();

    return c.json({ 
      success: true, 
      message: 'Verification payment confirmed. You have 3 days to submit your documents.',
      transaction_id: transactionId,
      paid_at: now,
      amount,
      payment_method: paymentMethod
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── VERIFY USER DETAILS SUBMISSION & RESUBMISSION (Self-request, 3-day window) ──
usersApp.put('/profile/verify', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const { category, document_url, reason } = await c.req.json();

  if (!category || !document_url || !reason) {
    return c.json({ error: 'All fields (category, document_url, reason) are required.' }, 400);
  }

  try {
    const user = await c.env.DB.prepare(
      'SELECT is_verification_paid, verification_paid_at, username, email FROM users WHERE id = ?'
    )
      .bind(userId)
      .first<any>();

    if (!user) {
      return c.json({ error: 'User not found.' }, 404);
    }

    if (!user.is_verification_paid) {
      return c.json({ error: 'Verification fee has not been paid.' }, 402);
    }

    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const isWindowExpired = (Date.now() - user.verification_paid_at) > threeDaysMs;
    if (isWindowExpired) {
      return c.json({ error: 'Verification window of 3 days has expired. Please pay again.' }, 403);
    }

    // Save details to users table
    await c.env.DB.prepare(
      'UPDATE users SET verification_category = ?, verification_document_url = ?, verification_reason = ?, verification_status = "pending" WHERE id = ?'
    )
      .bind(category, document_url, reason, userId)
      .run();

    // Find top admins to notify
    const { results: topAdmins } = await c.env.DB.prepare(
      'SELECT id, email, username, display_name FROM users WHERE is_top_admin = 1'
    ).all<any>();

    if (topAdmins && topAdmins.length > 0) {
      const createdAt = Date.now();
      const insertStatements = topAdmins.map(admin => {
        return c.env.DB.prepare(
          'INSERT INTO notifications (id, user_id, notifier_id, type, body, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)'
        ).bind(
          crypto.randomUUID(),
          admin.id,
          userId,
          'verification_request',
          `submitted verification documents for Category: ${category}`,
          createdAt
        );
      });
      await c.env.DB.batch(insertStatements);

      // Send MailChannels email to top admins
      for (const admin of topAdmins) {
        try {
          const dateStr = new Date(createdAt).toUTCString();
          await fetch('https://api.mailchannels.net/tx/v1/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              personalizations: [{
                to: [{ email: admin.email, name: admin.display_name || admin.username }]
              }],
              from: {
                email: 'dataverse@datalexcloud.tech',
                name: 'DataVerse Verification'
              },
              subject: `[DataVerse Verification] Request from @${user.username}`,
              content: [{
                type: 'text/html',
                value: `
                  <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#09090d;color:#e2e8f0;border-radius:12px;border:1px solid #1e293b;">
                    <h2 style="color:#3b82f6;margin:0 0 4px;">✔️ Verification Request</h2>
                    <p style="color:#64748b;font-size:12px;margin:0 0 24px;">Submitted by @${user.username}</p>
                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                      <tr><td style="padding:8px 0;color:#64748b;width:140px;">User</td><td style="padding:8px 0;color:#e2e8f0;">@${user.username} (${user.email})</td></tr>
                      <tr><td style="padding:8px 0;color:#64748b;">Category</td><td style="padding:8px 0;color:#f59e0b;font-weight:bold;">${category}</td></tr>
                      <tr><td style="padding:8px 0;color:#64748b;">Document Key</td><td style="padding:8px 0;color:#e2e8f0;font-family:monospace;">${document_url}</td></tr>
                      <tr><td style="padding:8px 0;color:#64748b;">Document</td><td style="padding:8px 0;color:#e2e8f0;"><a href="https://dataverse-api.workers.dev/api/media/file/${encodeURIComponent(document_url)}" style="color:#3b82f6;text-decoration:none;" target="_blank">View Uploaded ID Card</a></td></tr>
                      <tr><td style="padding:8px 0;color:#64748b;">Date Submitted</td><td style="padding:8px 0;color:#e2e8f0;">${dateStr}</td></tr>
                    </table>
                    <div style="margin-top:20px;padding:16px;background:#0f172a;border-radius:8px;border-left:3px solid #3b82f6;">
                      <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Reason for Verification</p>
                      <p style="color:#e2e8f0;font-size:14px;line-height:1.6;margin:0;">${reason.trim()}</p>
                    </div>
                    <p style="margin-top:24px;font-size:11px;color:#334155;">Please review and take appropriate action in the Admin Console under the Verifications tab.</p>
                  </div>
                `
              }]
            })
          });
        } catch (mailErr) {
          console.error('MailChannels send failed for verification request:', mailErr);
        }
      }
    }

    return c.json({ success: true, message: 'Verification details submitted successfully.' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── TOGGLE USER ADMIN ROLE (Top Admin only) ───────────────────────────────────
usersApp.put('/:id/admin', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const targetUserId = c.req.param('id');
  const { is_admin } = await c.req.json();

  const caller = await c.env.DB.prepare('SELECT is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || !caller.is_top_admin) {
    return c.json({ error: 'Unauthorized admin change request' }, 403);
  }

  try {
    await c.env.DB.prepare('UPDATE users SET is_admin = ? WHERE id = ?')
      .bind(is_admin ? 1 : 0, targetUserId)
      .run();

    try {
      await c.env.DB.prepare(
        'INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(crypto.randomUUID(), callerId, is_admin ? 'grant_admin' : 'revoke_admin', targetUserId, JSON.stringify({ is_admin: !!is_admin }), Date.now())
        .run();
    } catch (_) {}

    return c.json({ success: true, message: 'User admin rights updated' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── TOGGLE USER VERIFIED BADGE (Top Admin only) ──────────────────────────────
usersApp.put('/:id/verify-admin', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const targetUserId = c.req.param('id');
  const { is_verified, verification_status } = await c.req.json();

  const caller = await c.env.DB.prepare('SELECT is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || !caller.is_top_admin) {
    return c.json({ error: 'Unauthorized user verification request' }, 403);
  }

  try {
    const finalVerified = is_verified ? 1 : 0;
    const finalStatus = verification_status || (is_verified ? 'approved' : 'rejected');

    await c.env.DB.prepare('UPDATE users SET is_verified = ?, verification_status = ? WHERE id = ?')
      .bind(finalVerified, finalStatus, targetUserId)
      .run();

    try {
      await c.env.DB.prepare(
        'INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(crypto.randomUUID(), callerId, 'toggle_verification', targetUserId, JSON.stringify({ is_verified: !!is_verified, verification_status: finalStatus }), Date.now())
        .run();
    } catch (_) {}

    return c.json({ success: true, message: 'User verification status updated' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── TOGGLE USER BLOCK STATE (Admin & Top Admin) ──────────────────────────────
usersApp.put('/:id/block', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const targetUserId = c.req.param('id');
  const { is_blocked } = await c.req.json();

  const caller = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || (caller.is_admin !== 1 && caller.is_top_admin !== 1)) {
    return c.json({ error: 'Unauthorized block user request' }, 403);
  }

  if (callerId === targetUserId) {
    return c.json({ error: 'Cannot block yourself' }, 400);
  }

  // Prevent regular admins from blocking top admins
  const targetUser = await c.env.DB.prepare('SELECT is_top_admin FROM users WHERE id = ?')
    .bind(targetUserId)
    .first<any>();

  if (targetUser && targetUser.is_top_admin === 1 && caller.is_top_admin !== 1) {
    return c.json({ error: 'Cannot block a top admin' }, 403);
  }

  try {
    await c.env.DB.prepare('UPDATE users SET is_blocked = ? WHERE id = ?')
      .bind(is_blocked ? 1 : 0, targetUserId)
      .run();

    try {
      await c.env.DB.prepare(
        'INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(crypto.randomUUID(), callerId, is_blocked ? 'block_user' : 'unblock_user', targetUserId, JSON.stringify({ is_blocked: !!is_blocked }), Date.now())
        .run();
    } catch (_) {}

    return c.json({ success: true, message: 'User blocked status updated' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

usersApp.put('/:id/chat-restrict', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const targetUserId = c.req.param('id');
  const { minutes, senderType } = await c.req.json();

  const caller = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || (caller.is_admin !== 1 && caller.is_top_admin !== 1)) {
    return c.json({ error: 'Unauthorized user restriction request' }, 403);
  }

  // Prevent regular admins from restricting top admins
  const targetUser = await c.env.DB.prepare('SELECT is_top_admin FROM users WHERE id = ?')
    .bind(targetUserId)
    .first<any>();

  if (targetUser && targetUser.is_top_admin === 1 && caller.is_top_admin !== 1) {
    return c.json({ error: 'Cannot restrict a top admin' }, 403);
  }

  try {
    const restrictUntil = minutes > 0 ? Date.now() + minutes * 60 * 1000 : 0;
    await c.env.DB.prepare('UPDATE users SET chat_restricted_until = ? WHERE id = ?')
      .bind(restrictUntil, targetUserId)
      .run();

    if (minutes > 0) {
      let durationText = '';
      if (minutes === 10) durationText = '10 minutes';
      else if (minutes === 60) durationText = '1 hour';
      else if (minutes === 720) durationText = '12 hours';
      else if (minutes === 1440) durationText = '24 hours';
      else if (minutes === 10080) durationText = '7 days';
      else {
        if (minutes % 1440 === 0) {
          durationText = `${minutes / 1440} days`;
        } else if (minutes % 60 === 0) {
          durationText = `${minutes / 60} hours`;
        } else {
          durationText = `${minutes} minutes`;
        }
      }

      const notifierIdToSave = senderType === 'system' ? null : callerId;
      const notifId = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO notifications (id, user_id, notifier_id, type, body, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)'
      )
        .bind(
          notifId,
          targetUserId,
          notifierIdToSave,
          'restriction',
          `You can't chat for ${durationText} due to policy violation.`,
          Date.now()
        )
        .run();
    }

    try {
      await c.env.DB.prepare(
        'INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(crypto.randomUUID(), callerId, 'chat_restrict', targetUserId, JSON.stringify({ minutes, restrictUntil }), Date.now())
        .run();
    } catch (_) {}

    return c.json({ success: true, chat_restricted_until: restrictUntil, message: 'User chat restriction updated' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── ADMIN RESET USER 2FA (Admin & Top Admin) ─────────────────────────────────
usersApp.post('/:id/2fa/reset', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const targetUserId = c.req.param('id');

  const caller = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || (caller.is_admin !== 1 && caller.is_top_admin !== 1)) {
    return c.json({ error: 'Unauthorized: Admin privileges required.' }, 403);
  }

  const targetUser = await c.env.DB.prepare('SELECT id, username, email, is_top_admin FROM users WHERE id = ?')
    .bind(targetUserId)
    .first<any>();

  if (!targetUser) {
    return c.json({ error: 'User not found.' }, 404);
  }

  // Prevent regular admins from resetting a top admin's 2FA
  if (targetUser.is_top_admin === 1 && caller.is_top_admin !== 1) {
    return c.json({ error: 'Unauthorized: Cannot reset 2FA for a Top Admin.' }, 403);
  }

  try {
    // 1. Delete 2FA credentials & revoke trusted devices
    await c.env.DB.prepare('DELETE FROM user_2fa WHERE user_id = ?').bind(targetUserId).run();
    await c.env.DB.prepare('DELETE FROM backup_codes WHERE user_id = ?').bind(targetUserId).run();
    await c.env.DB.prepare('DELETE FROM trusted_devices WHERE user_id = ?').bind(targetUserId).run();

    // 2. Audit log in admin_audit_logs
    await c.env.DB.prepare(
      'INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(crypto.randomUUID(), callerId, 'admin_2fa_reset', targetUserId, JSON.stringify({ reset_by: callerId }), Date.now())
      .run();

    // 3. Audit log in auth_audit_log
    const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || '127.0.0.1';
    await c.env.DB.prepare(
      'INSERT INTO auth_audit_log (id, user_id, event, ip, user_agent, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(crypto.randomUUID(), targetUserId, 'admin_2fa_reset', clientIp, c.req.header('user-agent') || '', JSON.stringify({ admin_id: callerId }), Date.now())
      .run();

    // 4. Send email notice to target user
    if (targetUser.email) {
      const { sendSecurityEmail } = await import('./email');
      await sendSecurityEmail({
        toEmail: targetUser.email,
        toName: targetUser.username,
        subject: 'Security Alert: Two-Factor Authentication Was Reset by an Administrator',
        html: `
          <h2 style="color:#ff6b81;margin:0 0 12px;font-size:18px;">2FA Security Notice</h2>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#e0f2f1;">
            Hello <strong>@${targetUser.username}</strong>,<br>
            An administrator has reset two-factor authentication on your DataVerse account. You can now sign in using your username/email and password.
          </p>
          <p style="margin:0;font-size:13px;color:#7fa3aa;">
            For your security, we strongly recommend navigating to Settings &gt; Security to re-enable Two-Factor Authentication immediately.
          </p>
        `
      });
    }

    return c.json({ success: true, message: `Two-factor authentication has been reset for @${targetUser.username}.` });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to reset 2FA.' }, 500);
  }
});

// ─── SEND SYSTEM NOTIFICATION (Top Admin only) ─────────────────────────────────
usersApp.post('/broadcast-notification', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const { targetUserId, text, senderType } = await c.req.json();

  if (!text || text.trim() === '') {
    return c.json({ error: 'Notification message cannot be empty' }, 400);
  }

  const caller = await c.env.DB.prepare('SELECT is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || !caller.is_top_admin) {
    return c.json({ error: 'Unauthorized notification broadcast request' }, 403);
  }

  try {
    const createdAt = Date.now();
    const notifierIdToSave = senderType === 'system' ? null : callerId;

    if (targetUserId === 'all') {
      const { results: allUsers } = await c.env.DB.prepare('SELECT id FROM users').all<any>();
      const insertStatements = (allUsers || []).map(u => {
        return c.env.DB.prepare(
          'INSERT INTO notifications (id, user_id, notifier_id, type, body, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)'
        ).bind(crypto.randomUUID(), u.id, notifierIdToSave, 'welcome', text.trim(), createdAt);
      });

      if (insertStatements.length > 0) {
        await c.env.DB.batch(insertStatements);
      }
    } else {
      const notificationId = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO notifications (id, user_id, notifier_id, type, body, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)'
      )
        .bind(notificationId, targetUserId, notifierIdToSave, 'welcome', text.trim(), createdAt)
        .run();
    }

    return c.json({ success: true, message: 'Notification(s) sent successfully' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── GET BLOCKED USERS LIST ──────────────────────────────────────────────────
usersApp.get('/blocked-list', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url
      FROM users u
      JOIN user_blocks ub ON u.id = ub.blocked_id
      WHERE ub.blocker_id = ?
      ORDER BY ub.created_at DESC
    `)
      .bind(callerId)
      .all<any>();

    return c.json({ blockedUsers: results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── BLOCK A USER ─────────────────────────────────────────────────────────────
usersApp.post('/:id/block-user', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const targetUserId = c.req.param('id');

  if (callerId === targetUserId) {
    return c.json({ error: 'Cannot block yourself' }, 400);
  }

  try {
    const timestamp = Date.now();
    const statements = [
      c.env.DB.prepare('INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)').bind(callerId, targetUserId, timestamp),
      c.env.DB.prepare('DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)').bind(callerId, targetUserId, targetUserId, callerId)
    ];
    await c.env.DB.batch(statements);

    return c.json({ success: true, message: 'User blocked successfully' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── UNBLOCK A USER ───────────────────────────────────────────────────────────
usersApp.delete('/:id/block-user', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const targetUserId = c.req.param('id');

  try {
    await c.env.DB.prepare('DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?')
      .bind(callerId, targetUserId)
      .run();

    return c.json({ success: true, message: 'User unblocked successfully' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── GET MUTED USERS LIST ────────────────────────────────────────────────────
usersApp.get('/muted-list', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT u.id, u.username, u.display_name, u.avatar_url, um.created_at as muted_at
      FROM users u
      JOIN user_mutes um ON u.id = um.muted_id
      WHERE um.muter_id = ?
      ORDER BY um.created_at DESC
    `)
      .bind(callerId)
      .all<any>();

    return c.json({ mutedUsers: results || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── MUTE A USER ─────────────────────────────────────────────────────────────
usersApp.post('/:id/mute-user', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const targetUserId = c.req.param('id');

  if (callerId === targetUserId) {
    return c.json({ error: 'Cannot mute yourself' }, 400);
  }

  try {
    await c.env.DB.prepare('INSERT OR IGNORE INTO user_mutes (muter_id, muted_id, created_at) VALUES (?, ?, ?)')
      .bind(callerId, targetUserId, Date.now())
      .run();

    return c.json({ success: true, message: 'User muted successfully' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── UNMUTE A USER ───────────────────────────────────────────────────────────
usersApp.delete('/:id/mute-user', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const targetUserId = c.req.param('id');

  try {
    await c.env.DB.prepare('DELETE FROM user_mutes WHERE muter_id = ? AND muted_id = ?')
      .bind(callerId, targetUserId)
      .run();

    return c.json({ success: true, message: 'User unmuted successfully' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── FOLLOW A USER ─────────────────────────────────────────────────────────────
usersApp.post('/:id/follow', authMiddleware, async (c) => {
  const followerId = c.get('userId');
  const followingId = c.req.param('id');

  if (followerId === followingId) {
    return c.json({ error: 'Cannot follow yourself' }, 400);
  }

  const exists = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?')
    .bind(followingId)
    .first();

  if (!exists) {
    return c.json({ error: 'User to follow does not exist' }, 404);
  }

  // Check user blocking
  const isBlocked = await c.env.DB.prepare(`
    SELECT 1 FROM user_blocks 
    WHERE (blocker_id = ? AND blocked_id = ?) 
       OR (blocker_id = ? AND blocked_id = ?)
  `)
    .bind(followerId, followingId, followingId, followerId)
    .first();

  if (isBlocked) {
    return c.json({ error: 'Cannot follow a blocked user' }, 403);
  }

  try {
    // Check if target user is private
    const targetUser = await c.env.DB.prepare('SELECT is_private FROM users WHERE id = ?')
      .bind(followingId)
      .first<any>();

    const isPrivate = targetUser ? !!targetUser.is_private : false;
    const isAccepted = isPrivate ? 0 : 1;

    const timestamp = Date.now();
    const followResult = await c.env.DB.prepare(
      'INSERT OR IGNORE INTO follows (follower_id, following_id, created_at, is_accepted) VALUES (?, ?, ?, ?)'
    )
      .bind(followerId, followingId, timestamp, isAccepted)
      .run();

    // Only insert notification on a genuinely new follow or follow request
    if (followResult.meta.changes > 0) {
      const notificationId = crypto.randomUUID();
      const notificationType = isPrivate ? 'follow_request' : 'follow';
      await c.env.DB.prepare(
        "INSERT INTO notifications (id, user_id, notifier_id, type, created_at, is_read) VALUES (?, ?, ?, ?, ?, 0)"
      )
        .bind(notificationId, followingId, followerId, notificationType, timestamp)
        .run();
    }

    return c.json({
      success: true,
      message: isPrivate ? 'Follow request sent' : 'Followed user',
      is_following: !isPrivate,
      is_requested: isPrivate
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Follow failed' }, 500);
  }
});

// ─── UNFOLLOW A USER ───────────────────────────────────────────────────────────
usersApp.delete('/:id/follow', authMiddleware, async (c) => {
  const followerId = c.get('userId');
  const followingId = c.req.param('id');

  try {
    await c.env.DB.prepare(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?'
    )
      .bind(followerId, followingId)
      .run();

    // Also delete any pending follow_request notifications from followerId to followingId
    await c.env.DB.prepare(
      "DELETE FROM notifications WHERE user_id = ? AND notifier_id = ? AND type = 'follow_request'"
    )
      .bind(followingId, followerId)
      .run();

    return c.json({ success: true, message: 'Unfollowed user' });
  } catch (err: any) {
    return c.json({ error: err.message || 'Unfollow failed' }, 500);
  }
});

// ─── GET PUBLIC PROFILE (must be last — wildcard route) ───────────────────────
usersApp.get('/:username', async (c) => {
  const username = c.req.param('username').trim().toLowerCase();

  // Optional auth check to see if current user is following this profile
  let currentUserId: string | null = null;
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = await verifyToken(token, c.env.JWT_SECRET);
      if (payload) currentUserId = payload.userId;
    } catch {
      // Ignore token verification error for public profile view
    }
  }

  const queryUser = await c.env.DB.prepare(`
    SELECT id, username, display_name, bio, avatar_url, cover_url, cover_pos_y, created_at, is_verified, is_admin, is_top_admin, is_blocked, is_private, last_active_at,
      (SELECT COUNT(*) FROM follows WHERE following_id = users.id AND is_accepted = 1) AS followers_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id = users.id AND is_accepted = 1) AS following_count,
      (SELECT COUNT(*) FROM posts WHERE user_id = users.id) AS posts_count,
      (CASE WHEN ? IS NOT NULL THEN (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = users.id AND is_accepted = 1) ELSE 0 END) AS is_following,
      (CASE WHEN ? IS NOT NULL THEN (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = users.id AND is_accepted = 0) ELSE 0 END) AS is_requested,
      (CASE WHEN ? IS NOT NULL THEN (SELECT COUNT(*) FROM follows WHERE follower_id = users.id AND following_id = ? AND is_accepted = 1) ELSE 0 END) AS is_followed_by
    FROM users
    WHERE LOWER(username) = ?
  `)
    .bind(currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, username)
    .first<any>();

  if (!queryUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  if (currentUserId) {
    const isBlocked = await c.env.DB.prepare(`
      SELECT blocker_id, blocked_id FROM user_blocks 
      WHERE (blocker_id = ? AND blocked_id = ?) 
         OR (blocker_id = ? AND blocked_id = ?)
    `)
      .bind(currentUserId, queryUser.id, queryUser.id, currentUserId)
      .first<any>();

    if (isBlocked) {
      const viewerBlocked = isBlocked.blocker_id === queryUser.id;
      return c.json({ 
        error: 'Profile is not accessible due to blocking', 
        isBlocked: true,
        viewerBlocked
      }, 403);
    }
  }

  let isMuted = false;
  if (currentUserId && currentUserId !== queryUser.id) {
    const muteRow = await c.env.DB.prepare(
      'SELECT 1 FROM user_mutes WHERE muter_id = ? AND muted_id = ?'
    ).bind(currentUserId, queryUser.id).first();
    isMuted = !!muteRow;
  }

  return c.json({
    user: {
      id: queryUser.id,
      username: queryUser.username,
      display_name: queryUser.display_name,
      bio: queryUser.bio || '',
      avatar_url: queryUser.avatar_url || '',
      is_verified: !!queryUser.is_verified,
      is_admin: !!queryUser.is_admin,
      is_top_admin: !!queryUser.is_top_admin,
      is_blocked: !!queryUser.is_blocked,
      is_private: !!queryUser.is_private,
      last_active_at: queryUser.last_active_at || 0,
      is_muted: isMuted,
      created_at: queryUser.created_at,
      followers_count: queryUser.followers_count,
      following_count: queryUser.following_count,
      posts_count: queryUser.posts_count,
      is_following: queryUser.is_following > 0,
      is_requested: queryUser.is_requested > 0,
      is_followed_by: queryUser.is_followed_by > 0
    }
  });
});

// ─── GET USER FOLLOWERS ────────────────────────────────────────────────────────
usersApp.get('/profile/:username/followers', authMiddleware, async (c) => {
  const currentUserId = c.get('userId');
  const { username } = c.req.param();

  // 1. Fetch user to check privacy
  const targetUser = await c.env.DB.prepare('SELECT id, is_private FROM users WHERE LOWER(username) = ?')
    .bind(username.toLowerCase())
    .first<any>();

  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  // 2. Check viewer permissions
  const isOwn = currentUserId === targetUser.id;
  const viewer = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
    .bind(currentUserId)
    .first<any>();
  const isViewerAdmin = !!(viewer?.is_admin || viewer?.is_top_admin);

  if (targetUser.is_private && !isOwn && !isViewerAdmin) {
    // Check if following
    const followRow = await c.env.DB.prepare(
      'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? AND is_accepted = 1'
    )
      .bind(currentUserId, targetUser.id)
      .first<any>();

    if (!followRow) {
      return c.json({ error: 'This profile is private' }, 403);
    }
  }

  // 3. Fetch followers, excluding users who have blocked or been blocked by the viewer
  const { results: followers } = await c.env.DB.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified
    FROM follows f
    JOIN users u ON f.follower_id = u.id
    WHERE f.following_id = ? AND f.is_accepted = 1
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks
        WHERE (blocker_id = ? AND blocked_id = u.id)
           OR (blocker_id = u.id AND blocked_id = ?)
      )
  `)
    .bind(targetUser.id, currentUserId, currentUserId)
    .all();

  return c.json({ users: followers || [] });
});

// ─── GET USER FOLLOWING ────────────────────────────────────────────────────────
usersApp.get('/profile/:username/following', authMiddleware, async (c) => {
  const currentUserId = c.get('userId');
  const { username } = c.req.param();

  // 1. Fetch user to check privacy
  const targetUser = await c.env.DB.prepare('SELECT id, is_private FROM users WHERE LOWER(username) = ?')
    .bind(username.toLowerCase())
    .first<any>();

  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  // 2. Check viewer permissions
  const isOwn = currentUserId === targetUser.id;
  const viewer = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
    .bind(currentUserId)
    .first<any>();
  const isViewerAdmin = !!(viewer?.is_admin || viewer?.is_top_admin);

  if (targetUser.is_private && !isOwn && !isViewerAdmin) {
    // Check if following
    const followRow = await c.env.DB.prepare(
      'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? AND is_accepted = 1'
    )
      .bind(currentUserId, targetUser.id)
      .first<any>();

    if (!followRow) {
      return c.json({ error: 'This profile is private' }, 403);
    }
  }

  // 3. Fetch following, excluding users who have blocked or been blocked by the viewer
  const { results: following } = await c.env.DB.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified
    FROM follows f
    JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ? AND f.is_accepted = 1
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks
        WHERE (blocker_id = ? AND blocked_id = u.id)
           OR (blocker_id = u.id AND blocked_id = ?)
      )
  `)
    .bind(targetUser.id, currentUserId, currentUserId)
    .all();

  return c.json({ users: following || [] });
});

// ─── ACCEPT FOLLOW REQUEST ───────────────────────────────────────────────────
usersApp.post('/follow-requests/:notificationId/accept', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const notificationId = c.req.param('notificationId');

  try {
    // Find the notification
    const notification = await c.env.DB.prepare(
      "SELECT notifier_id FROM notifications WHERE id = ? AND user_id = ? AND type = 'follow_request'"
    )
      .bind(notificationId, userId)
      .first<any>();

    if (!notification) {
      return c.json({ error: 'Follow request notification not found' }, 404);
    }

    const followerId = notification.notifier_id;

    // Update follow relation to accepted
    await c.env.DB.prepare(
      'UPDATE follows SET is_accepted = 1 WHERE follower_id = ? AND following_id = ?'
    )
      .bind(followerId, userId)
      .run();

    // Update notification type to standard follow
    await c.env.DB.prepare(
      "UPDATE notifications SET type = 'follow', is_read = 1 WHERE id = ?"
    )
      .bind(notificationId)
      .run();

    // Insert a new notification for the requester (followerId) from the private user (userId)
    const acceptNotificationId = crypto.randomUUID();
    const timestamp = Date.now();
    await c.env.DB.prepare(
      "INSERT INTO notifications (id, user_id, notifier_id, type, created_at, is_read) VALUES (?, ?, ?, 'follow_accept', ?, 0)"
    )
      .bind(acceptNotificationId, followerId, userId, timestamp)
      .run();

    return c.json({ success: true, message: 'Follow request accepted' });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to accept follow request' }, 500);
  }
});

// ─── REJECT FOLLOW REQUEST ───────────────────────────────────────────────────
usersApp.post('/follow-requests/:notificationId/reject', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const notificationId = c.req.param('notificationId');

  try {
    // Find the notification
    const notification = await c.env.DB.prepare(
      "SELECT notifier_id FROM notifications WHERE id = ? AND user_id = ? AND type = 'follow_request'"
    )
      .bind(notificationId, userId)
      .first<any>();

    if (!notification) {
      return c.json({ error: 'Follow request notification not found' }, 404);
    }

    const followerId = notification.notifier_id;

    // Delete follow request relation
    await c.env.DB.prepare(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?'
    )
      .bind(followerId, userId)
      .run();

    // Delete notification
    await c.env.DB.prepare(
      'DELETE FROM notifications WHERE id = ?'
    )
      .bind(notificationId)
      .run();

    return c.json({ success: true, message: 'Follow request rejected' });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to reject follow request' }, 500);
  }
});

// ─── SUBMIT REPORT ─────────────────────────────────────────────────────────────
usersApp.post('/report', authMiddleware, async (c) => {
  const reporterId = c.get('userId');
  const { report_type, description, reported_username } = await c.req.json();

  if (!report_type || !description || description.trim().length < 10) {
    return c.json({ error: 'Please provide a report type and a detailed description (min 10 characters).' }, 400);
  }

  const ALLOWED_TYPES = [
    'spam', 'harassment', 'hate_speech', 'inappropriate_content',
    'impersonation', 'fake_account', 'violence', 'other'
  ];
  if (!ALLOWED_TYPES.includes(report_type)) {
    return c.json({ error: 'Invalid report type.' }, 400);
  }

  try {
    const reporter = await c.env.DB.prepare(
      'SELECT username, email FROM users WHERE id = ?'
    ).bind(reporterId).first<any>();

    if (!reporter) {
      return c.json({ error: 'Reporter user not found.' }, 404);
    }

    const reportId = crypto.randomUUID();
    const createdAt = Date.now();

    // Save report to DB
    await c.env.DB.prepare(
      'INSERT INTO reports (id, reporter_id, report_type, description, reported_username, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(reportId, reporterId, report_type, description.trim(), reported_username || null, createdAt).run();

    // Format date for email
    const dateStr = new Date(createdAt).toUTCString();
    const typeLabel = report_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    // Send email to admin via MailChannels (free Cloudflare Workers integration)
    try {
      const adminMailRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: 'dataverse@datalexcloud.tech', name: 'DataVerse Admin' }]
          }],
          from: {
            email: 'dataverse@datalexcloud.tech',
            name: 'DataVerse Reports'
          },
          subject: `[DataVerse Report] ${escapeHtml(typeLabel)} — @${escapeHtml(reporter.username)}`,
          content: [{
            type: 'text/html',
            value: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#09090d;color:#e2e8f0;border-radius:12px;border:1px solid #1e293b;">
                <h2 style="color:#a78bfa;margin:0 0 4px;">⚠️ New User Report</h2>
                <p style="color:#64748b;font-size:12px;margin:0 0 24px;">Submitted via DataVerse in-app reporting system</p>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <tr><td style="padding:8px 0;color:#64748b;width:140px;">Report ID</td><td style="padding:8px 0;color:#e2e8f0;font-family:monospace;">${escapeHtml(reportId)}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b;">Type</td><td style="padding:8px 0;color:#f97316;font-weight:bold;">${escapeHtml(typeLabel)}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b;">Reported By</td><td style="padding:8px 0;color:#e2e8f0;">@${escapeHtml(reporter.username)} (${escapeHtml(reporter.email)})</td></tr>
                  ${reported_username ? `<tr><td style="padding:8px 0;color:#64748b;">Reported User</td><td style="padding:8px 0;color:#e2e8f0;">@${escapeHtml(reported_username)}</td></tr>` : ''}
                  <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;color:#e2e8f0;">${escapeHtml(dateStr)}</td></tr>
                </table>
                <div style="margin-top:20px;padding:16px;background:#0f172a;border-radius:8px;border-left:3px solid #a78bfa;">
                  <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Description</p>
                  <p style="color:#e2e8f0;font-size:14px;line-height:1.6;margin:0;">${escapeHtml(description.trim())}</p>
                </div>
                <p style="margin-top:24px;font-size:11px;color:#334155;">This report has been logged in the DataVerse D1 database with ID <code>${escapeHtml(reportId)}</code>. Please review and take appropriate action.</p>
              </div>
            `
          }]
        })
      });
      if (!adminMailRes.ok) {
        const errText = await adminMailRes.text();
        console.error('MailChannels response not OK for admin report:', adminMailRes.status, errText);
      }
    } catch (mailErr) {
      console.error('MailChannels send failed for admin alert:', mailErr);
    }

    // Send confirmation email to the reporter user
    try {
      const reporterMailRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: reporter.email, name: reporter.display_name || reporter.username }]
          }],
          from: {
            email: 'dataverse@datalexcloud.tech',
            name: 'DataVerse Safety Team'
          },
          subject: `We received your report — DataVerse`,
          content: [{
            type: 'text/html',
            value: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#09090d;color:#e2e8f0;border-radius:12px;border:1px solid #1e293b;">
                <h2 style="color:#a78bfa;margin:0 0 4px;">Thank you for your report</h2>
                <p style="color:#64748b;font-size:12px;margin:0 0 24px;">Reference ID: ${escapeHtml(reportId)}</p>
                <p style="font-size:14px;line-height:1.6;color:#e2e8f0;">
                  Hello @${escapeHtml(reporter.username)},
                </p>
                <p style="font-size:14px;line-height:1.6;color:#e2e8f0;">
                  We have received your safety report regarding <strong>${escapeHtml(typeLabel)}</strong> and our team is actively reviewing it. 
                  Keeping DataVerse safe for everyone is our top priority.
                </p>
                <div style="margin-top:20px;padding:16px;background:#0f172a;border-radius:8px;border-left:3px solid #a78bfa;">
                  <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Your report details</p>
                  <p style="color:#e2e8f0;font-size:13px;line-height:1.6;margin:0;"><strong>Type:</strong> ${escapeHtml(typeLabel)}</p>
                  ${reported_username ? `<p style="color:#e2e8f0;font-size:13px;line-height:1.6;margin:0;"><strong>Reported User:</strong> @${escapeHtml(reported_username)}</p>` : ''}
                  <p style="color:#e2e8f0;font-size:13px;line-height:1.6;margin:0;"><strong>Date:</strong> ${escapeHtml(dateStr)}</p>
                </div>
                <p style="font-size:12px;color:#64748b;margin-top:24px;line-height:1.6;">
                  If we need further details or take actions on your report, we will notify you. Thank you for being a valued member of the DataVerse community!
                </p>
                <p style="font-size:11px;color:#334155;margin-top:16px;border-top:1px solid #1e293b;padding-top:12px;">
                  This is an automated notification. Please do not reply directly to this email.
                </p>
              </div>
            `
          }]
        })
      });
      if (!reporterMailRes.ok) {
        const errText = await reporterMailRes.text();
        console.error('MailChannels response not OK for reporter confirmation:', reporterMailRes.status, errText);
      }
    } catch (mailErr) {
      console.error('MailChannels send failed for reporter confirmation:', mailErr);
    }

    return c.json({ success: true, report_id: reportId, message: 'Your report has been submitted and forwarded to our safety team.' });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to submit report.' }, 500);
  }
});

// ─── ADMIN: GET ALL REPORTS (ADMIN & TOP ADMIN) ───────────────────────────────
usersApp.get('/admin/reports', authMiddleware, async (c) => {
  const callerId = c.get('userId');

  // Verify caller is Admin or Top Admin
  const caller = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || (!caller.is_admin && !caller.is_top_admin)) {
    return c.json({ error: 'Unauthorized: Admin privileges required' }, 403);
  }

  // Fetch reports joined with reporter metadata and target user metadata
  const { results: reports } = await c.env.DB.prepare(`
    SELECT r.id, r.reporter_id, r.report_type, r.description, r.reported_username, r.created_at,
           u.username AS reporter_username, u.display_name AS reporter_display_name,
           ru.id AS reported_user_id, ru.display_name AS reported_display_name, ru.avatar_url AS reported_avatar_url,
           COALESCE(ru.is_blocked, 0) AS reported_is_blocked,
           COALESCE(ru.chat_restricted_until, 0) AS reported_chat_restricted_until,
           COALESCE(ru.suspended_until, 0) AS reported_suspended_until,
           COALESCE(ru.is_admin, 0) AS reported_is_admin,
           COALESCE(ru.is_top_admin, 0) AS reported_is_top_admin
    FROM reports r
    JOIN users u ON r.reporter_id = u.id
    LEFT JOIN users ru ON LOWER(REPLACE(COALESCE(r.reported_username, ''), '@', '')) = LOWER(ru.username)
    ORDER BY r.created_at DESC
  `).all();

  return c.json({ reports: reports || [] });
});

// ─── ADMIN: RESOLVE REPORT WITH ACTION (ADMIN & TOP ADMIN) ────────────────────
usersApp.post('/admin/reports/:id/action', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const reportId = c.req.param('id');
  const { action, targetUserId, durationMinutes, reason } = await c.req.json();

  // Verify caller is Admin or Top Admin
  const caller = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || (!caller.is_admin && !caller.is_top_admin)) {
    return c.json({ error: 'Unauthorized: Admin privileges required' }, 403);
  }

  let enforcementMsg = 'Report resolved';

  if (targetUserId) {
    const target = await c.env.DB.prepare('SELECT id, username, is_admin, is_top_admin FROM users WHERE id = ?')
      .bind(targetUserId)
      .first<any>();

    if (target) {
      if (target.is_top_admin && !caller.is_top_admin) {
        return c.json({ error: 'Cannot enforce action against a Super Admin' }, 403);
      }
      if (target.id === callerId) {
        return c.json({ error: 'Cannot enforce action against yourself' }, 400);
      }

      if (action === 'chat_restrict') {
        const mins = Number(durationMinutes) || 60;
        const restrictUntil = Date.now() + mins * 60 * 1000;
        await c.env.DB.prepare('UPDATE users SET chat_restricted_until = ? WHERE id = ?')
          .bind(restrictUntil, targetUserId)
          .run();

        let durationText = `${mins} minutes`;
        if (mins >= 1440 && mins % 1440 === 0) durationText = `${mins / 1440} day(s)`;
        else if (mins >= 60 && mins % 60 === 0) durationText = `${mins / 60} hour(s)`;

        try {
          await c.env.DB.prepare(
            'INSERT INTO notifications (id, user_id, notifier_id, type, body, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)'
          ).bind(
            crypto.randomUUID(),
            targetUserId,
            null,
            'restriction',
            `Your chat privileges have been restricted for ${durationText} following safety report review. Reason: ${reason || 'Community Guidelines violation'}.`,
            Date.now()
          ).run();
        } catch (_) {}

        enforcementMsg = `Chat restricted for ${durationText} and report resolved`;

      } else if (action === 'suspend') {
        const mins = Number(durationMinutes);
        let durationText = '';

        if (mins === -1) {
          // Permanent suspension / ban
          await c.env.DB.prepare('UPDATE users SET is_blocked = 1, suspended_until = 0 WHERE id = ?')
            .bind(targetUserId)
            .run();
          durationText = 'permanently';
          enforcementMsg = 'Account permanently banned and report resolved';
        } else {
          // Time-based suspension (hours/days)
          const suspendUntil = Date.now() + mins * 60 * 1000;
          await c.env.DB.prepare('UPDATE users SET suspended_until = ?, is_blocked = 0 WHERE id = ?')
            .bind(suspendUntil, targetUserId)
            .run();

          if (mins >= 1440 && mins % 1440 === 0) durationText = `for ${mins / 1440} day(s)`;
          else if (mins >= 60 && mins % 60 === 0) durationText = `for ${mins / 60} hour(s)`;
          else durationText = `for ${mins} minutes`;

          enforcementMsg = `Account suspended ${durationText} and report resolved`;
        }

        try {
          await c.env.DB.prepare(
            'INSERT INTO notifications (id, user_id, notifier_id, type, body, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)'
          ).bind(
            crypto.randomUUID(),
            targetUserId,
            null,
            'system',
            `Your account has been suspended ${durationText}. Reason: ${reason || 'Terms of Service violation'}.`,
            Date.now()
          ).run();
        } catch (_) {}

      } else if (action === 'remove_account') {
        // Complete account removal
        await c.env.DB.prepare('DELETE FROM follows WHERE follower_id = ? OR following_id = ?').bind(targetUserId, targetUserId).run();
        await c.env.DB.prepare('DELETE FROM user_blocks WHERE blocker_id = ? OR blocked_id = ?').bind(targetUserId, targetUserId).run();
        await c.env.DB.prepare('DELETE FROM notifications WHERE user_id = ? OR notifier_id = ?').bind(targetUserId, targetUserId).run();
        await c.env.DB.prepare('DELETE FROM likes WHERE user_id = ?').bind(targetUserId).run();
        await c.env.DB.prepare('DELETE FROM comments WHERE user_id = ?').bind(targetUserId).run();
        await c.env.DB.prepare('DELETE FROM posts WHERE user_id = ?').bind(targetUserId).run();
        await c.env.DB.prepare('DELETE FROM user_2fa WHERE user_id = ?').bind(targetUserId).run();
        await c.env.DB.prepare('DELETE FROM backup_codes WHERE user_id = ?').bind(targetUserId).run();
        await c.env.DB.prepare('DELETE FROM trusted_devices WHERE user_id = ?').bind(targetUserId).run();
        await c.env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').bind(targetUserId).run();
        await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetUserId).run();

        enforcementMsg = 'Account permanently removed and report resolved';
      }
    }
  }

  // Delete/Resolve the report
  await c.env.DB.prepare('DELETE FROM reports WHERE id = ?')
    .bind(reportId)
    .run();

  try {
    await c.env.DB.prepare(
      'INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(crypto.randomUUID(), callerId, `report_action_${action || 'resolve'}`, reportId, JSON.stringify({ action, targetUserId, durationMinutes, reason }), Date.now())
      .run();
  } catch (_) {}

  return c.json({ success: true, message: enforcementMsg });
});

// ─── ADMIN: SUSPEND USER DIRECTLY (HOURS / DAYS / PERMANENT) ──────────────────
usersApp.put('/:id/suspend', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const targetUserId = c.req.param('id');
  const { minutes, reason } = await c.req.json();

  const caller = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || (!caller.is_admin && !caller.is_top_admin)) {
    return c.json({ error: 'Unauthorized user suspension request' }, 403);
  }

  if (callerId === targetUserId) {
    return c.json({ error: 'Cannot suspend yourself' }, 400);
  }

  const targetUser = await c.env.DB.prepare('SELECT id, is_top_admin FROM users WHERE id = ?')
    .bind(targetUserId)
    .first<any>();

  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  if (targetUser.is_top_admin === 1 && caller.is_top_admin !== 1) {
    return c.json({ error: 'Cannot suspend a top admin' }, 403);
  }

  try {
    const mins = Number(minutes);
    let suspendUntil = 0;
    let isBlocked = 0;
    let durationText = '';

    if (mins === -1) {
      // Permanent ban
      isBlocked = 1;
      suspendUntil = 0;
      durationText = 'permanently';
    } else if (mins > 0) {
      // Temporary suspension
      suspendUntil = Date.now() + mins * 60 * 1000;
      isBlocked = 0;
      if (mins >= 1440 && mins % 1440 === 0) durationText = `for ${mins / 1440} day(s)`;
      else if (mins >= 60 && mins % 60 === 0) durationText = `for ${mins / 60} hour(s)`;
      else durationText = `for ${mins} minutes`;
    } else {
      // Lift suspension
      suspendUntil = 0;
      isBlocked = 0;
    }

    await c.env.DB.prepare('UPDATE users SET suspended_until = ?, is_blocked = ? WHERE id = ?')
      .bind(suspendUntil, isBlocked, targetUserId)
      .run();

    if (mins !== 0) {
      try {
        await c.env.DB.prepare(
          'INSERT INTO notifications (id, user_id, notifier_id, type, body, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)'
        ).bind(
          crypto.randomUUID(),
          targetUserId,
          null,
          'system',
          `Your account has been suspended ${durationText}. Reason: ${reason || 'Community Guidelines violation'}.`,
          Date.now()
        ).run();
      } catch (_) {}
    }

    try {
      await c.env.DB.prepare(
        'INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(crypto.randomUUID(), callerId, mins === 0 ? 'lift_suspension' : 'suspend_user', targetUserId, JSON.stringify({ minutes: mins, suspendUntil, isBlocked }), Date.now())
        .run();
    } catch (_) {}

    return c.json({ 
      success: true, 
      suspended_until: suspendUntil, 
      is_blocked: isBlocked === 1,
      message: mins === 0 ? 'Suspension lifted successfully' : `User suspended ${durationText}` 
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── ADMIN: REMOVE / DELETE USER ACCOUNT PERMANENTLY ──────────────────────────
usersApp.delete('/admin/users/:id', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const targetUserId = c.req.param('id');

  const caller = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || (!caller.is_admin && !caller.is_top_admin)) {
    return c.json({ error: 'Unauthorized user removal request' }, 403);
  }

  if (callerId === targetUserId) {
    return c.json({ error: 'Cannot delete yourself from admin console' }, 400);
  }

  const targetUser = await c.env.DB.prepare('SELECT id, is_top_admin, username FROM users WHERE id = ?')
    .bind(targetUserId)
    .first<any>();

  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  if (targetUser.is_top_admin === 1 && caller.is_top_admin !== 1) {
    return c.json({ error: 'Cannot delete a top admin' }, 403);
  }

  try {
    await c.env.DB.prepare('DELETE FROM follows WHERE follower_id = ? OR following_id = ?').bind(targetUserId, targetUserId).run();
    await c.env.DB.prepare('DELETE FROM user_blocks WHERE blocker_id = ? OR blocked_id = ?').bind(targetUserId, targetUserId).run();
    await c.env.DB.prepare('DELETE FROM notifications WHERE user_id = ? OR notifier_id = ?').bind(targetUserId, targetUserId).run();
    await c.env.DB.prepare('DELETE FROM likes WHERE user_id = ?').bind(targetUserId).run();
    await c.env.DB.prepare('DELETE FROM comments WHERE user_id = ?').bind(targetUserId).run();
    await c.env.DB.prepare('DELETE FROM posts WHERE user_id = ?').bind(targetUserId).run();
    await c.env.DB.prepare('DELETE FROM user_2fa WHERE user_id = ?').bind(targetUserId).run();
    await c.env.DB.prepare('DELETE FROM backup_codes WHERE user_id = ?').bind(targetUserId).run();
    await c.env.DB.prepare('DELETE FROM trusted_devices WHERE user_id = ?').bind(targetUserId).run();
    await c.env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').bind(targetUserId).run();
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetUserId).run();

    try {
      await c.env.DB.prepare(
        'INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(crypto.randomUUID(), callerId, 'delete_user_account', targetUserId, JSON.stringify({ targetUsername: targetUser.username }), Date.now())
        .run();
    } catch (_) {}

    return c.json({ success: true, message: `Account @${targetUser.username} removed successfully` });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── ADMIN: RESOLVE/DELETE REPORT (ADMIN & TOP ADMIN) ─────────────────────────
usersApp.delete('/admin/reports/:id', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const reportId = c.req.param('id');

  // Verify caller is Admin or Top Admin
  const caller = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || (!caller.is_admin && !caller.is_top_admin)) {
    return c.json({ error: 'Unauthorized: Admin privileges required' }, 403);
  }

  await c.env.DB.prepare('DELETE FROM reports WHERE id = ?')
    .bind(reportId)
    .run();

  try {
    await c.env.DB.prepare(
      'INSERT INTO admin_audit_logs (id, admin_id, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(crypto.randomUUID(), callerId, 'resolve_report', reportId, JSON.stringify({ reportId }), Date.now())
      .run();
  } catch (_) {}

  return c.json({ success: true });
});

// ─── ADMIN: GET ALL SYSTEM MEDIA (SENT TO DELETED, FILTERABLE BY USER) ───────
usersApp.get('/admin/media', authMiddleware, async (c) => {
  const callerId = c.get('userId');

  // Verify caller is Admin or Top Admin
  const caller = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || (!caller.is_admin && !caller.is_top_admin)) {
    return c.json({ error: 'Unauthorized: Admin privileges required' }, 403);
  }

  const queryUser = c.req.query('user') || '';
  const queryStatus = c.req.query('status') || 'all'; // 'all' | 'active' | 'deleted'
  const queryType = c.req.query('type') || 'all'; // 'all' | 'image' | 'video' | 'audio' | 'file'
  const querySource = c.req.query('source') || 'all'; // 'all' | 'chat' | 'post'
  const limit = Math.min(parseInt(c.req.query('limit') || '300', 10), 1000);

  try {
    // 1. Fetch Chat Messages Media (Both Active and Deleted)
    const chatQuery = `
      SELECT m.id AS message_id, m.conversation_id, m.sender_id AS user_id, m.body, m.created_at,
             COALESCE(m.is_deleted, 0) AS is_deleted,
             COALESCE(u.username, m.sender_id) AS username, u.display_name, u.avatar_url,
             c.is_group, c.group_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      LEFT JOIN conversations c ON m.conversation_id = c.id
      WHERE (m.body LIKE '%"type":"secure_media"%' OR m.body LIKE '%"type":"media"%' OR m.body LIKE '%"media_type":%')
      ORDER BY m.created_at DESC
      LIMIT 500
    `;
    const { results: chatRows } = await c.env.DB.prepare(chatQuery).all<any>();

    // 2. Fetch Post & Reel Media
    const postQuery = `
      SELECT pm.id AS media_id, pm.post_id, pm.r2_key AS url, pm.media_type, pm.position,
             p.user_id, p.caption, p.created_at,
             u.username, u.display_name, u.avatar_url
      FROM post_media pm
      JOIN posts p ON pm.post_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 500
    `;
    const { results: postRows } = await c.env.DB.prepare(postQuery).all<any>();

    const items: any[] = [];

    // Parse chat messages media
    for (const m of (chatRows || [])) {
      let parsedMedia: any = null;
      try {
        const obj = JSON.parse(m.body);
        if (obj && (obj.type === 'secure_media' || obj.type === 'media' || obj.media_type)) {
          parsedMedia = obj;
        }
      } catch {}

      if (!parsedMedia || !parsedMedia.url) continue;

      let mediaType = (parsedMedia.media_type || 'image').toLowerCase();
      if (mediaType === 'voice') mediaType = 'audio';
      if (mediaType !== 'image' && mediaType !== 'video' && mediaType !== 'audio' && mediaType !== 'file') {
        mediaType = 'file';
      }

      items.push({
        id: `chat-${m.message_id}`,
        raw_id: m.message_id,
        source: 'chat',
        source_name: m.is_group ? (m.group_name || 'Group Chat') : 'Direct Chat',
        source_id: m.conversation_id,
        user: {
          id: m.user_id,
          username: m.username || 'unknown',
          display_name: m.display_name || m.username || 'User',
          avatar_url: m.avatar_url || null
        },
        url: parsedMedia.url,
        media_type: mediaType,
        file_name: parsedMedia.file_name || (mediaType === 'audio' ? 'Voice Note.webm' : (mediaType === 'video' ? 'Video.mp4' : 'Photo.jpg')),
        allow_save: parsedMedia.allow_save !== false,
        status: m.is_deleted === 1 ? 'deleted' : 'active',
        created_at: m.created_at,
        context: parsedMedia.file_name || (m.is_group ? `Group: ${m.group_name || 'Chat'}` : 'Direct Message')
      });
    }

    // Parse posts & reels media
    for (const p of (postRows || [])) {
      const isVideo = p.media_type === 'video' || (typeof p.url === 'string' && (p.url.endsWith('.mp4') || p.url.endsWith('.webm')));
      items.push({
        id: `post-${p.media_id}`,
        raw_id: p.media_id,
        source: 'post',
        source_name: isVideo ? 'Reel / Video Post' : 'Feed Post',
        source_id: p.post_id,
        user: {
          id: p.user_id,
          username: p.username || 'unknown',
          display_name: p.display_name || p.username || 'User',
          avatar_url: p.avatar_url || null
        },
        url: p.url,
        media_type: isVideo ? 'video' : 'image',
        file_name: isVideo ? 'Video Post' : 'Post Photo',
        allow_save: true,
        status: 'active',
        created_at: p.created_at,
        context: p.caption || ''
      });
    }

    // Sort descending by created_at
    items.sort((a, b) => b.created_at - a.created_at);

    // Compute unfiltered metrics
    const counts = {
      total: items.length,
      active: items.filter(i => i.status === 'active').length,
      deleted: items.filter(i => i.status === 'deleted').length,
      images: items.filter(i => i.media_type === 'image').length,
      videos: items.filter(i => i.media_type === 'video').length,
      audio: items.filter(i => i.media_type === 'audio').length,
      files: items.filter(i => i.media_type === 'file').length,
    };

    // Filter
    let filtered = items;

    // Filter by user search (username, display name, user id, or filename)
    if (queryUser.trim()) {
      const q = queryUser.trim().toLowerCase().replace(/^@/, '');
      filtered = filtered.filter(item => 
        (item.user.username && item.user.username.toLowerCase().includes(q)) ||
        (item.user.display_name && item.user.display_name.toLowerCase().includes(q)) ||
        (item.user.id && item.user.id.toLowerCase().includes(q)) ||
        (item.file_name && item.file_name.toLowerCase().includes(q)) ||
        (item.context && item.context.toLowerCase().includes(q))
      );
    }

    // Filter by status: 'all' | 'active' | 'deleted'
    if (queryStatus === 'active') {
      filtered = filtered.filter(item => item.status === 'active');
    } else if (queryStatus === 'deleted') {
      filtered = filtered.filter(item => item.status === 'deleted');
    }

    // Filter by type: 'all' | 'image' | 'video' | 'audio' | 'file'
    if (queryType !== 'all') {
      filtered = filtered.filter(item => item.media_type === queryType);
    }

    // Filter by source: 'all' | 'chat' | 'post'
    if (querySource !== 'all') {
      filtered = filtered.filter(item => item.source === querySource);
    }

    const pagedItems = filtered.slice(0, limit);

    return c.json({
      items: pagedItems,
      total_matching: filtered.length,
      counts
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── ADMIN: PURGE / DELETE A MEDIA ASSET (ADMIN & TOP ADMIN) ─────────────────
usersApp.delete('/admin/media/:id', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const mediaId = c.req.param('id') || '';

  if (!mediaId) {
    return c.json({ error: 'Missing media ID' }, 400);
  } // e.g. "chat-<msgId>" or "post-<mediaId>"

  // Verify caller is Admin or Top Admin
  const caller = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || (!caller.is_admin && !caller.is_top_admin)) {
    return c.json({ error: 'Unauthorized: Admin privileges required' }, 403);
  }

  try {
    if (mediaId.startsWith('chat-')) {
      const msgId = mediaId.substring(5);
      await c.env.DB.prepare('UPDATE messages SET is_deleted = 1, body = ? WHERE id = ?')
        .bind(JSON.stringify({ type: 'deleted', text: '[Media purged by Admin]' }), msgId)
        .run();
    } else if (mediaId.startsWith('post-')) {
      const pmId = mediaId.substring(5);
      await c.env.DB.prepare('DELETE FROM post_media WHERE id = ?')
        .bind(pmId)
        .run();
    }

    return c.json({ success: true, message: 'Media removed successfully' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── SAVED COLLECTIONS / BOOKMARK FOLDERS ────────────────────────────────────

// GET USER COLLECTIONS
usersApp.get('/collections', authMiddleware, async (c) => {
  const userId = c.get('userId');
  try {
    const { results: collections } = await c.env.DB.prepare(`
      SELECT sc.id, sc.name, sc.created_at,
        (SELECT COUNT(*) FROM saved_collection_items WHERE collection_id = sc.id) AS item_count,
        (
          SELECT pm.r2_key 
          FROM saved_collection_items sci
          JOIN post_media pm ON sci.post_id = pm.post_id
          WHERE sci.collection_id = sc.id
          ORDER BY sci.created_at DESC LIMIT 1
        ) AS cover_image
      FROM saved_collections sc
      WHERE sc.user_id = ?
      ORDER BY sc.created_at DESC
    `).bind(userId).all<any>();

    return c.json({ collections: collections || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// CREATE COLLECTION
usersApp.post('/collections', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const { name } = await c.req.json();
  if (!name || !name.trim()) {
    return c.json({ error: 'Collection name is required' }, 400);
  }

  const id = crypto.randomUUID();
  const createdAt = Date.now();

  try {
    await c.env.DB.prepare(
      'INSERT INTO saved_collections (id, user_id, name, created_at) VALUES (?, ?, ?, ?)'
    ).bind(id, userId, name.trim(), createdAt).run();

    return c.json({
      success: true,
      collection: { id, user_id: userId, name: name.trim(), created_at: createdAt, item_count: 0 }
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// DELETE COLLECTION
usersApp.delete('/collections/:id', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const collectionId = c.req.param('id');

  try {
    await c.env.DB.prepare(
      'DELETE FROM saved_collections WHERE id = ? AND user_id = ?'
    ).bind(collectionId, userId).run();

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ADD POST TO COLLECTION
usersApp.post('/collections/:id/items', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const collectionId = c.req.param('id');
  const { postId } = await c.req.json();

  if (!postId) return c.json({ error: 'postId is required' }, 400);

  try {
    // Verify collection ownership
    const collection = await c.env.DB.prepare(
      'SELECT id FROM saved_collections WHERE id = ? AND user_id = ?'
    ).bind(collectionId, userId).first();

    if (!collection) return c.json({ error: 'Collection not found' }, 404);

    const id = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO saved_collection_items (id, collection_id, post_id, user_id, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(collection_id, post_id) DO NOTHING
    `).bind(id, collectionId, postId, userId, Date.now()).run();

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// REMOVE POST FROM COLLECTION
usersApp.delete('/collections/:id/items/:postId', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const collectionId = c.req.param('id');
  const postId = c.req.param('postId');

  try {
    await c.env.DB.prepare(
      'DELETE FROM saved_collection_items WHERE collection_id = ? AND post_id = ? AND user_id = ?'
    ).bind(collectionId, postId, userId).run();

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET POSTS IN SPECIFIC COLLECTION
usersApp.get('/collections/:id/posts', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const collectionId = c.req.param('id');

  try {
    // Verify collection ownership
    const collection = await c.env.DB.prepare(
      'SELECT id, name FROM saved_collections WHERE id = ? AND user_id = ?'
    ).bind(collectionId, userId).first<any>();

    if (!collection) return c.json({ error: 'Collection not found' }, 404);

    const { results: posts } = await c.env.DB.prepare(`
      SELECT p.id, p.caption, p.is_sensitive, p.sensitive_reason, p.created_at,
        p.user_id, u.username, u.display_name, u.avatar_url, u.is_verified,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
      FROM saved_collection_items sci
      JOIN posts p ON sci.post_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE sci.collection_id = ? AND sci.user_id = ?
      ORDER BY sci.created_at DESC
    `).bind(userId, collectionId, userId).all<any>();

    if (!posts || posts.length === 0) {
      return c.json({ collection, posts: [] });
    }

    const postIds = posts.map(p => p.id);
    const placeholders = postIds.map(() => '?').join(',');
    const { results: mediaResults }: any = await c.env.DB.prepare(`
      SELECT * FROM post_media WHERE post_id IN (${placeholders}) ORDER BY position ASC
    `).bind(...postIds).all();

    const mappedPosts = posts.map(post => ({
      ...post,
      is_liked: Boolean(post.is_liked),
      is_verified: !!post.is_verified,
      is_sensitive: Boolean(post.is_sensitive),
      sensitive_reason: post.sensitive_reason || null,
      media: (mediaResults || [])
        .filter((m: any) => m.post_id === post.id)
        .map((m: any) => ({
          id: m.id,
          r2_key: m.r2_key,
          media_type: m.media_type,
          position: m.position
        }))
    }));

    return c.json({ collection, posts: mappedPosts });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

export default usersApp;
