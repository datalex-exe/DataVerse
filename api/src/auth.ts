import { Hono, Context } from 'hono';
import { SignJWT, jwtVerify } from 'jose';
import { Bindings, Variables, User } from './types';
import { generateSalt, hashPassword, verifyPassword } from './crypto';

const authApp = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const getSecret = (secret?: string) => {
  return new TextEncoder().encode(secret || 'dataverse-fallback-secret-key-123456');
};

/**
 * Signs a JWT token for the user.
 */
export async function signToken(userId: string, secret?: string): Promise<string> {
  return await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret(secret));
}

/**
 * Verifies a JWT token.
 */
export async function verifyToken(token: string, secret?: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(secret));
    if (payload && payload.sub) {
      return { userId: payload.sub };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Middleware to protect routes and verify the session in KV cache.
 */
export async function authMiddleware(c: Context<{ Bindings: Bindings; Variables: Variables }>, next: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing token' }, 401);
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }

  // Check session cache in KV
  const kvKey = `session:${token}`;
  const cachedUserId = await c.env.SESSION_KV.get(kvKey);
  if (!cachedUserId || cachedUserId !== payload.userId) {
    return c.json({ error: 'Unauthorized: Session expired or revoked' }, 401);
  }

  c.set('userId', payload.userId);
  c.set('token', token);

  // Check if user is blocked in DB
  const user = await c.env.DB.prepare('SELECT is_blocked FROM users WHERE id = ?')
    .bind(payload.userId)
    .first<any>();

  if (!user || user.is_blocked === 1) {
    await c.env.SESSION_KV.delete(kvKey);
    return c.json({ error: 'This account has been blocked' }, 403);
  }

  await next();
}

// SIGNUP
authApp.post('/signup', async (c) => {
  try {
    const { username, email, password, display_name } = await c.req.json();

    if (!username || !email || !password) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    )
      .bind(cleanUsername, cleanEmail)
      .first();

    if (existing) {
      return c.json({ error: 'Username or email already in use' }, 400);
    }

    const id = crypto.randomUUID();
    const salt = await generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const createdAt = Date.now();

    const userCountResult = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM users').first<any>();
    const isFirstUser = !userCountResult || userCountResult.count === 0;
    const isDatalexEmail = cleanEmail.toLowerCase() === 'datalex.exe@gmail.com';
    const isAdmin = (isFirstUser || isDatalexEmail) ? 1 : 0;
    const isTopAdmin = (isFirstUser || isDatalexEmail) ? 1 : 0;

    await c.env.DB.prepare(
      'INSERT INTO users (id, username, email, password_hash, password_salt, display_name, bio, avatar_url, is_admin, is_top_admin, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        id,
        cleanUsername,
        cleanEmail,
        passwordHash,
        salt,
        display_name || cleanUsername,
        '',
        '',
        isAdmin,
        isTopAdmin,
        createdAt
      )
      .run();

    // 2. Insert welcome notification in SQLite DB
    const welcomeNotificationId = crypto.randomUUID();
    await c.env.DB.prepare(
      "INSERT INTO notifications (id, user_id, notifier_id, type, created_at, is_read) VALUES (?, ?, NULL, 'welcome', ?, 0)"
    ).bind(welcomeNotificationId, id, createdAt).run();

    const token = await signToken(id, c.env.JWT_SECRET);
    // Cache session in KV for 30 days (2592000 seconds)
    await c.env.SESSION_KV.put(`session:${token}`, id, { expirationTtl: 2592000 });

    const userObj: User = {
      id,
      username: cleanUsername,
      email: cleanEmail,
      display_name: display_name || cleanUsername,
      bio: '',
      avatar_url: '',
      is_verified: false,
      is_admin: !!isAdmin,
      is_top_admin: !!isTopAdmin,
      is_blocked: false,
      is_private: false,
      created_at: createdAt
    };

    return c.json({ token, user: userObj }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Signup failed' }, 500);
  }
});

// LOGIN
authApp.post('/login', async (c) => {
  try {
    const { login_id, password } = await c.req.json(); // login_id can be email or username

    if (!login_id || !password) {
      return c.json({ error: 'Missing credentials' }, 400);
    }

    const cleanLoginId = login_id.trim().toLowerCase();

    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE username = ? OR email = ?'
    )
      .bind(cleanLoginId, cleanLoginId)
      .first<any>();

    if (!user) {
      return c.json({ error: 'No User Found' }, 400);
    }

    if (user.is_blocked) {
      return c.json({ error: 'Account blocked by administrator' }, 403);
    }

    const isMatch = await verifyPassword(password, user.password_salt, user.password_hash);
    if (!isMatch) {
      return c.json({ error: 'Invalid credentials' }, 400);
    }

    const token = await signToken(user.id, c.env.JWT_SECRET);
    // Cache session in KV for 30 days
    await c.env.SESSION_KV.put(`session:${token}`, user.id, { expirationTtl: 2592000 });

    const userObj: User = {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      is_verified: !!user.is_verified,
      is_admin: !!user.is_admin,
      is_top_admin: !!user.is_top_admin,
      is_blocked: !!user.is_blocked,
      is_private: !!user.is_private,
      created_at: user.created_at
    };

    return c.json({ token, user: userObj });
  } catch (err: any) {
    return c.json({ error: err.message || 'Login failed' }, 500);
  }
});

// LOGOUT
authApp.post('/logout', authMiddleware, async (c) => {
  const token = c.get('token');
  if (token) {
    await c.env.SESSION_KV.delete(`session:${token}`);
  }
  return c.json({ success: true, message: 'Logged out successfully' });
});

// GET CURRENT USER PROFILE
authApp.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId');
  const user = await c.env.DB.prepare('SELECT id, username, email, display_name, bio, avatar_url, is_verified, is_admin, is_top_admin, is_blocked, is_private, is_verification_paid, verification_paid_at, verification_category, verification_document_url, verification_reason, verification_status, created_at FROM users WHERE id = ?')
    .bind(userId)
    .first<any>();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const userObj: User = {
    ...user,
    is_verified: !!user.is_verified,
    is_admin: !!user.is_admin,
    is_top_admin: !!user.is_top_admin,
    is_blocked: !!user.is_blocked,
    is_private: !!user.is_private,
    is_verification_paid: !!user.is_verification_paid,
    verification_paid_at: user.verification_paid_at || 0,
    verification_category: user.verification_category || null,
    verification_document_url: user.verification_document_url || null,
    verification_reason: user.verification_reason || null,
    verification_status: user.verification_status || 'none'
  };

  return c.json({ user: userObj });
});

export default authApp;
