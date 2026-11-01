import { Hono } from 'hono';
import { Bindings, Variables } from './types';
import { authMiddleware, verifyToken } from './auth';
import * as jose from 'jose';

export const pushApp = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const DEFAULT_VAPID_PUBLIC = 'BHyO66HTpn7JPtBva979VXMAujGZjgTU05e42aZlKTRKdNHm_Ds8wXipd6bCaCsheWilGjOxqI2GAg9cuFBRbV0';
const DEFAULT_VAPID_PRIVATE = 'X4ClCxhqH-nf7OK1iE2FhESKuYqeEpBhvyBI5w0CA94';
const DEFAULT_VAPID_SUBJECT = 'mailto:support@datalexcloud.tech';

function getVapidKeys(env: Bindings) {
  return {
    publicKey: env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC,
    privateKey: env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE,
    subject: env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT,
  };
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const raw = atob(base64 + pad);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createVapidJwt(endpoint: string, env: Bindings): Promise<string> {
  const { publicKey, privateKey, subject } = getVapidKeys(env);
  const aud = new URL(endpoint).origin;

  // Convert uncompressed 65-byte base64url public key to JWK coordinates
  const rawPub = base64UrlToUint8Array(publicKey);
  const x = uint8ArrayToBase64Url(rawPub.subarray(1, 33));
  const y = uint8ArrayToBase64Url(rawPub.subarray(33, 65));

  const key = await jose.importJWK(
    {
      kty: 'EC',
      crv: 'P-256',
      x,
      y,
      d: privateKey,
    },
    'ES256'
  );

  return new jose.SignJWT({ sub: subject })
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setAudience(aud)
    .setExpirationTime('12h')
    .sign(key);
}

// 1. Public Key Retrieval
pushApp.get('/vapid-public-key', (c) => {
  const { publicKey } = getVapidKeys(c.env);
  return c.json({ publicKey });
});

// 2. Subscribe endpoint (Visitors and registered users)
pushApp.post('/subscribe', async (c) => {
  try {
    const body = await c.req.json();
    const { endpoint, keys, userAgent } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return c.json({ error: 'Invalid push subscription payload' }, 400);
    }

    // Try extracting optional userId from Authorization header
    let userId: string | null = null;
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const verified = await verifyToken(token, c.env.JWT_SECRET);
        if (verified?.userId) {
          userId = verified.userId;
        }
      } catch {
        // Continue as anonymous visitor subscription
      }
    }

    const now = Date.now();
    const id = crypto.randomUUID();

    await c.env.DB.prepare(`
      INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, user_id, user_agent, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_id = COALESCE(excluded.user_id, push_subscriptions.user_id),
        user_agent = COALESCE(excluded.user_agent, push_subscriptions.user_agent),
        last_active_at = excluded.last_active_at
    `).bind(
      id,
      endpoint,
      keys.p256dh,
      keys.auth,
      userId,
      userAgent || c.req.header('user-agent') || null,
      now,
      now
    ).run();

    return c.json({ success: true, message: 'Push subscription registered successfully' });
  } catch (err: any) {
    console.error('Push subscribe error:', err);
    return c.json({ error: 'Failed to save push subscription', details: err.message }, 500);
  }
});

// 3. Activity Heartbeat (Keeps active/inactive segmentation accurate)
pushApp.post('/heartbeat', async (c) => {
  try {
    const { endpoint } = await c.req.json();
    if (!endpoint) return c.json({ error: 'Endpoint required' }, 400);

    await c.env.DB.prepare(`
      UPDATE push_subscriptions 
      SET last_active_at = ? 
      WHERE endpoint = ?
    `).bind(Date.now(), endpoint).run();

    return c.json({ success: true });
  } catch {
    return c.json({ success: false }, 500);
  }
});

// 4. Latest campaign payload (Service Worker fetch during push event)
pushApp.get('/latest', async (c) => {
  try {
    const campaign = await c.env.DB.prepare(`
      SELECT id, title, body, url, created_at
      FROM push_campaigns
      ORDER BY created_at DESC
      LIMIT 1
    `).first<any>();

    if (!campaign) {
      return c.json({
        title: 'DataVerse',
        body: 'Welcome back to DataVerse! Check out the latest posts and reels.',
        url: 'https://dataverse.datalexcloud.tech',
      });
    }

    return c.json(campaign);
  } catch (err: any) {
    return c.json({ error: 'Failed to retrieve notification payload' }, 500);
  }
});

// 5. Admin Stats (Admins and Super Admins)
pushApp.get('/admin/stats', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const caller = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || (!caller.is_admin && !caller.is_top_admin)) {
    return c.json({ error: 'Unauthorized: Admin privileges required' }, 403);
  }

  try {
    const now = Date.now();
    const threeDaysAgo = now - 3 * 86400 * 1000;
    const sevenDaysAgo = now - 7 * 86400 * 1000;

    const totalSubscribers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM push_subscriptions')
      .first<any>();

    const active3d = await c.env.DB.prepare('SELECT COUNT(*) as count FROM push_subscriptions WHERE last_active_at >= ?')
      .bind(threeDaysAgo)
      .first<any>();

    const inactive3d = await c.env.DB.prepare('SELECT COUNT(*) as count FROM push_subscriptions WHERE last_active_at < ?')
      .bind(threeDaysAgo)
      .first<any>();

    const inactive7d = await c.env.DB.prepare('SELECT COUNT(*) as count FROM push_subscriptions WHERE last_active_at < ?')
      .bind(sevenDaysAgo)
      .first<any>();

    const { results: recentCampaigns } = await c.env.DB.prepare(`
      SELECT id, title, body, url, target_audience, sent_count, success_count, created_at
      FROM push_campaigns
      ORDER BY created_at DESC
      LIMIT 8
    `).all<any>();

    const { results: userRows } = await c.env.DB.prepare(`
      SELECT DISTINCT user_id FROM push_subscriptions WHERE user_id IS NOT NULL
    `).all<any>();
    const subscribedUserIds = (userRows || []).map((r: any) => r.user_id);

    return c.json({
      totalSubscribers: totalSubscribers?.count || 0,
      active3d: active3d?.count || 0,
      inactive3d: inactive3d?.count || 0,
      inactive7d: inactive7d?.count || 0,
      subscribedUserIds,
      recentCampaigns: recentCampaigns || [],
    });
  } catch (err: any) {
    console.error('Failed to fetch push stats:', err);
    return c.json({ error: 'Failed to fetch push statistics' }, 500);
  }
});

// 6. Admin Broadcast Dispatcher (Admins and Super Admins)
pushApp.post('/admin/broadcast', authMiddleware, async (c) => {
  const callerId = c.get('userId');
  const caller = await c.env.DB.prepare('SELECT is_admin, is_top_admin, username FROM users WHERE id = ?')
    .bind(callerId)
    .first<any>();

  if (!caller || (!caller.is_admin && !caller.is_top_admin)) {
    return c.json({ error: 'Unauthorized: Admin privileges required' }, 403);
  }

  const { title, body, url, targetAudience, targetUserIds } = await c.req.json();

  if (!body || body.trim() === '') {
    return c.json({ error: 'Notification message body is required' }, 400);
  }

  const finalTitle = title?.trim() || 'DataVerse';
  const finalBody = body.trim();
  const finalUrl = url?.trim() || 'https://dataverse.datalexcloud.tech';
  const now = Date.now();
  const threeDaysAgo = now - 3 * 86400 * 1000;
  const sevenDaysAgo = now - 7 * 86400 * 1000;

  try {
    // 1. Query target subscriptions based on chosen segment
    let subscriptions: any[] = [];

    if (targetAudience === 'inactive_3d') {
      const { results } = await c.env.DB.prepare(`
        SELECT endpoint, p256dh, auth, user_id
        FROM push_subscriptions
        WHERE last_active_at < ?
      `).bind(threeDaysAgo).all<any>();
      subscriptions = results || [];
    } else if (targetAudience === 'inactive_7d') {
      const { results } = await c.env.DB.prepare(`
        SELECT endpoint, p256dh, auth, user_id
        FROM push_subscriptions
        WHERE last_active_at < ?
      `).bind(sevenDaysAgo).all<any>();
      subscriptions = results || [];
    } else if (targetAudience === 'users' && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      const placeholders = targetUserIds.map(() => '?').join(',');
      const { results } = await c.env.DB.prepare(`
        SELECT endpoint, p256dh, auth, user_id
        FROM push_subscriptions
        WHERE user_id IN (${placeholders})
      `).bind(...targetUserIds).all<any>();
      subscriptions = results || [];
    } else {
      // 'all'
      const { results } = await c.env.DB.prepare(`
        SELECT endpoint, p256dh, auth, user_id
        FROM push_subscriptions
      `).all<any>();
      subscriptions = results || [];
    }

    const campaignId = crypto.randomUUID();
    let successCount = 0;
    const staleEndpoints: string[] = [];

    const { publicKey } = getVapidKeys(c.env);

    // 2. Dispatch push to all matching devices
    for (const sub of subscriptions) {
      try {
        const jwt = await createVapidJwt(sub.endpoint, c.env);
        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'TTL': '86400',
            'Urgency': 'high',
            'Authorization': `vapid t=${jwt}, k=${publicKey}`,
          },
        });

        if (res.status === 201 || res.status === 200 || res.status === 202) {
          successCount++;
        } else if (res.status === 410 || res.status === 404) {
          // Unsubscribed or expired subscription
          staleEndpoints.push(sub.endpoint);
        }
      } catch (pushErr) {
        console.warn('Individual push dispatch failed:', pushErr);
      }
    }

    // 3. Clean up stale/uninstalled browser endpoints
    if (staleEndpoints.length > 0) {
      const placeholders = staleEndpoints.map(() => '?').join(',');
      await c.env.DB.prepare(`
        DELETE FROM push_subscriptions 
        WHERE endpoint IN (${placeholders})
      `).bind(...staleEndpoints).run();
    }

    // 4. Save campaign record
    await c.env.DB.prepare(`
      INSERT INTO push_campaigns (id, sender_id, title, body, url, target_audience, sent_count, success_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      campaignId,
      callerId,
      finalTitle,
      finalBody,
      finalUrl,
      targetAudience || 'all',
      subscriptions.length,
      successCount,
      now
    ).run();

    // 5. Also insert in-app notification for registered users who match target audience
    try {
      let targetUserIdsToNotify: string[] = [];
      if (targetAudience === 'users' && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
        targetUserIdsToNotify = targetUserIds;
      } else {
        targetUserIdsToNotify = subscriptions
          .map(s => s.user_id)
          .filter((uid): uid is string => !!uid);
      }
      const uniqueUserIds = [...new Set(targetUserIdsToNotify)];

      if (uniqueUserIds.length > 0) {
        for (const uid of uniqueUserIds) {
          await c.env.DB.prepare(`
            INSERT INTO notifications (id, user_id, notifier_id, type, body, created_at, is_read)
            VALUES (?, ?, NULL, 'welcome', ?, ?, 0)
          `).bind(crypto.randomUUID(), uid, `${finalTitle}: ${finalBody}`, now).run();
        }
      }
    } catch {}

    let message = `Push notification dispatched to ${successCount} device(s).`;
    if (targetAudience === 'users' && subscriptions.length === 0) {
      message = `Notice: Selected user(s) have not enabled browser pop-up permissions yet. Alert was saved to their in-app notification center.`;
    }

    return c.json({
      success: true,
      campaignId,
      sentCount: subscriptions.length,
      successCount,
      prunedStale: staleEndpoints.length,
      message,
    });
  } catch (err: any) {
    console.error('Push broadcast error:', err);
    return c.json({ error: 'Failed to broadcast push notification', details: err.message }, 500);
  }
});
