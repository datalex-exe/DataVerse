import { Hono } from 'hono';
import { Bindings, Variables } from './types';
import { authMiddleware, verifyToken } from './auth';
import { generateSalt, hashPassword } from './crypto';

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
      SELECT n.id, n.type, n.post_id, n.body, n.created_at, n.is_read,
        u.username, u.display_name, u.avatar_url
      FROM notifications n
      LEFT JOIN users u ON n.notifier_id = u.id
      WHERE n.user_id = ?
        AND (n.notifier_id IS NULL OR n.notifier_id NOT IN (
          SELECT blocker_id FROM user_blocks WHERE blocked_id = ?
          UNION
          SELECT blocked_id FROM user_blocks WHERE blocker_id = ?
        ))
      ORDER BY n.created_at DESC
      LIMIT 50
    `)
      .bind(userId, userId, userId)
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
      SELECT id, username, email, display_name, avatar_url, is_verified, is_admin, is_top_admin, is_blocked, chat_restricted_until, is_verification_paid, verification_paid_at, verification_category, verification_document_url, verification_reason, verification_status, created_at
      FROM users
      ORDER BY created_at DESC
    `).all<any>();

    const mappedUsers = (users || []).map(u => ({
      ...u,
      is_verified: !!u.is_verified,
      is_admin: !!u.is_admin,
      is_top_admin: !!u.is_top_admin,
      is_blocked: !!u.is_blocked,
      chat_restricted_until: u.chat_restricted_until || 0,
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
  const { username, email, display_name, bio, avatar_url, new_password } = await c.req.json();

  try {
    // Fetch current user details if username/email/avatar are not provided
    const currentUser = await c.env.DB.prepare('SELECT username, email, avatar_url FROM users WHERE id = ?')
      .bind(userId)
      .first<any>();

    if (!currentUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const targetUsername = (username && username.trim() !== '') ? username.trim() : currentUser.username;
    const targetEmail = (email && email.trim() !== '') ? email.trim() : currentUser.email;
    const targetAvatarUrl = (avatar_url !== undefined && avatar_url !== null) ? avatar_url : currentUser.avatar_url;

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

    if (new_password && new_password.trim() !== '') {
      const salt = await generateSalt();
      const passwordHash = await hashPassword(new_password.trim(), salt);
      await c.env.DB.prepare(
        'UPDATE users SET username = ?, email = ?, display_name = ?, bio = ?, avatar_url = ?, password_hash = ?, password_salt = ? WHERE id = ?'
      )
        .bind(targetUsername, targetEmail, display_name || '', bio || '', targetAvatarUrl || '', passwordHash, salt, userId)
        .run();
    } else {
      await c.env.DB.prepare(
        'UPDATE users SET username = ?, email = ?, display_name = ?, bio = ?, avatar_url = ? WHERE id = ?'
      )
        .bind(targetUsername, targetEmail, display_name || '', bio || '', targetAvatarUrl || '', userId)
        .run();
    }

    return c.json({ success: true, message: 'Profile updated' });
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
    await c.env.DB.prepare(
      'UPDATE users SET is_verification_paid = 1, verification_paid_at = ?, verification_status = "none", is_verified = 0 WHERE id = ?'
    )
      .bind(Date.now(), userId)
      .run();

    return c.json({ success: true, message: 'Verification payment processed. You have 3 days to submit your documents.' });
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
                email: 'verification@dataverse-app.com',
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

    return c.json({ success: true, message: 'User blocked status updated' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── CHAT RESTRICT USER (Admin & Top Admin) ──────────────────────────────────
usersApp.put('/:id/chat-restrict', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const targetUserId = c.req.param('id');
  const { minutes } = await c.req.json();

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

    return c.json({ success: true, chat_restricted_until: restrictUntil, message: 'User chat restriction updated' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ─── SEND SYSTEM NOTIFICATION (Top Admin only) ─────────────────────────────────
usersApp.post('/broadcast-notification', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const { targetUserId, text } = await c.req.json();

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

    if (targetUserId === 'all') {
      const { results: allUsers } = await c.env.DB.prepare('SELECT id FROM users').all<any>();
      const insertStatements = (allUsers || []).map(u => {
        return c.env.DB.prepare(
          'INSERT INTO notifications (id, user_id, notifier_id, type, body, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)'
        ).bind(crypto.randomUUID(), u.id, callerId, 'welcome', text.trim(), createdAt);
      });

      if (insertStatements.length > 0) {
        await c.env.DB.batch(insertStatements);
      }
    } else {
      const notificationId = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO notifications (id, user_id, notifier_id, type, body, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)'
      )
        .bind(notificationId, targetUserId, callerId, 'welcome', text.trim(), createdAt)
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
    SELECT id, username, display_name, bio, avatar_url, created_at, is_verified, is_admin, is_top_admin, is_blocked, is_private,
      (SELECT COUNT(*) FROM follows WHERE following_id = users.id AND is_accepted = 1) AS followers_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id = users.id AND is_accepted = 1) AS following_count,
      (SELECT COUNT(*) FROM posts WHERE user_id = users.id) AS posts_count,
      (CASE WHEN ? IS NOT NULL THEN (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = users.id AND is_accepted = 1) ELSE 0 END) AS is_following,
      (CASE WHEN ? IS NOT NULL THEN (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = users.id AND is_accepted = 0) ELSE 0 END) AS is_requested,
      (CASE WHEN ? IS NOT NULL THEN (SELECT COUNT(*) FROM follows WHERE follower_id = users.id AND following_id = ? AND is_accepted = 1) ELSE 0 END) AS is_followed_by
    FROM users
    WHERE username = ?
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
  const targetUser = await c.env.DB.prepare('SELECT id, is_private FROM users WHERE username = ?')
    .bind(username)
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

  // 3. Fetch followers
  const { results: followers } = await c.env.DB.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified
    FROM follows f
    JOIN users u ON f.follower_id = u.id
    WHERE f.following_id = ? AND f.is_accepted = 1
  `)
    .bind(targetUser.id)
    .all();

  return c.json({ users: followers || [] });
});

// ─── GET USER FOLLOWING ────────────────────────────────────────────────────────
usersApp.get('/profile/:username/following', authMiddleware, async (c) => {
  const currentUserId = c.get('userId');
  const { username } = c.req.param();

  // 1. Fetch user to check privacy
  const targetUser = await c.env.DB.prepare('SELECT id, is_private FROM users WHERE username = ?')
    .bind(username)
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

  // 3. Fetch following
  const { results: following } = await c.env.DB.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified
    FROM follows f
    JOIN users u ON f.following_id = u.id
    WHERE f.follower_id = ? AND f.is_accepted = 1
  `)
    .bind(targetUser.id)
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
            to: [{ email: 'datalex.exe@gmail.com', name: 'DataVerse Admin' }]
          }],
          from: {
            email: 'reports@dataverse-app.com',
            name: 'DataVerse Reports'
          },
          subject: `[DataVerse Report] ${typeLabel} — @${reporter.username}`,
          content: [{
            type: 'text/html',
            value: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#09090d;color:#e2e8f0;border-radius:12px;border:1px solid #1e293b;">
                <h2 style="color:#a78bfa;margin:0 0 4px;">⚠️ New User Report</h2>
                <p style="color:#64748b;font-size:12px;margin:0 0 24px;">Submitted via DataVerse in-app reporting system</p>
                <table style="width:100%;border-collapse:collapse;font-size:13px;">
                  <tr><td style="padding:8px 0;color:#64748b;width:140px;">Report ID</td><td style="padding:8px 0;color:#e2e8f0;font-family:monospace;">${reportId}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b;">Type</td><td style="padding:8px 0;color:#f97316;font-weight:bold;">${typeLabel}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b;">Reported By</td><td style="padding:8px 0;color:#e2e8f0;">@${reporter.username} (${reporter.email})</td></tr>
                  ${reported_username ? `<tr><td style="padding:8px 0;color:#64748b;">Reported User</td><td style="padding:8px 0;color:#e2e8f0;">@${reported_username}</td></tr>` : ''}
                  <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;color:#e2e8f0;">${dateStr}</td></tr>
                </table>
                <div style="margin-top:20px;padding:16px;background:#0f172a;border-radius:8px;border-left:3px solid #a78bfa;">
                  <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Description</p>
                  <p style="color:#e2e8f0;font-size:14px;line-height:1.6;margin:0;">${description.trim()}</p>
                </div>
                <p style="margin-top:24px;font-size:11px;color:#334155;">This report has been logged in the DataVerse D1 database with ID <code>${reportId}</code>. Please review and take appropriate action.</p>
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
            email: 'reports@dataverse-app.com',
            name: 'DataVerse Safety Team'
          },
          subject: `We received your report — DataVerse`,
          content: [{
            type: 'text/html',
            value: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#09090d;color:#e2e8f0;border-radius:12px;border:1px solid #1e293b;">
                <h2 style="color:#a78bfa;margin:0 0 4px;">Thank you for your report</h2>
                <p style="color:#64748b;font-size:12px;margin:0 0 24px;">Reference ID: ${reportId}</p>
                <p style="font-size:14px;line-height:1.6;color:#e2e8f0;">
                  Hello @${reporter.username},
                </p>
                <p style="font-size:14px;line-height:1.6;color:#e2e8f0;">
                  We have received your safety report regarding <strong>${typeLabel}</strong> and our team is actively reviewing it. 
                  Keeping DataVerse safe for everyone is our top priority.
                </p>
                <div style="margin-top:20px;padding:16px;background:#0f172a;border-radius:8px;border-left:3px solid #a78bfa;">
                  <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Your report details</p>
                  <p style="color:#e2e8f0;font-size:13px;line-height:1.6;margin:0;"><strong>Type:</strong> ${typeLabel}</p>
                  ${reported_username ? `<p style="color:#e2e8f0;font-size:13px;line-height:1.6;margin:0;"><strong>Reported User:</strong> @${reported_username}</p>` : ''}
                  <p style="color:#e2e8f0;font-size:13px;line-height:1.6;margin:0;"><strong>Date:</strong> ${dateStr}</p>
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

// ─── ADMIN: GET ALL REPORTS (TOP ADMIN ONLY) ──────────────────────────────────
usersApp.get('/admin/reports', authMiddleware, async (c) => {
  const callerId = c.get('userId');

  // Verify caller is Top Admin
  const caller = await c.env.DB.prepare('SELECT is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || !caller.is_top_admin) {
    return c.json({ error: 'Unauthorized: Top Admin only' }, 403);
  }

  // Fetch reports joined with reporter metadata
  const { results: reports } = await c.env.DB.prepare(`
    SELECT r.id, r.reporter_id, r.report_type, r.description, r.reported_username, r.created_at,
           u.username AS reporter_username, u.display_name AS reporter_display_name
    FROM reports r
    JOIN users u ON r.reporter_id = u.id
    ORDER BY r.created_at DESC
  `).all();

  return c.json({ reports: reports || [] });
});

// ─── ADMIN: RESOLVE/DELETE REPORT (TOP ADMIN ONLY) ────────────────────────────
usersApp.delete('/admin/reports/:id', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const reportId = c.req.param('id');

  // Verify caller is Top Admin
  const caller = await c.env.DB.prepare('SELECT is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || !caller.is_top_admin) {
    return c.json({ error: 'Unauthorized: Top Admin only' }, 403);
  }

  await c.env.DB.prepare('DELETE FROM reports WHERE id = ?')
    .bind(reportId)
    .run();

  return c.json({ success: true });
});

export default usersApp;
