import { Context } from 'hono';
import { Bindings, Variables } from './types';

export interface RateLimitOptions {
  prefix: string;
  limit: number;
  windowSeconds: number;
  keyGenerator?: (c: Context<{ Bindings: Bindings; Variables: Variables }>) => string | Promise<string>;
}

export function getClientIp(c: Context<{ Bindings: Bindings; Variables: Variables }>): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-real-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

/**
 * KV-backed rate limiter for Cloudflare Workers.
 */
export async function checkRateLimit(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  try {
    const key = options.keyGenerator
      ? await options.keyGenerator(c)
      : getClientIp(c);

    const kvKey = `ratelimit:${options.prefix}:${key}`;
    const raw = await c.env.SESSION_KV.get(kvKey);
    const now = Math.floor(Date.now() / 1000);

    let data: { count: number; resetAt: number };
    if (raw) {
      try {
        data = JSON.parse(raw);
        if (now >= data.resetAt) {
          data = { count: 0, resetAt: now + options.windowSeconds };
        }
      } catch {
        data = { count: 0, resetAt: now + options.windowSeconds };
      }
    } else {
      data = { count: 0, resetAt: now + options.windowSeconds };
    }

    data.count += 1;
    const remaining = Math.max(0, options.limit - data.count);
    const ttl = Math.max(60, data.resetAt - now); // KV expirationTtl must be at least 60s

    await c.env.SESSION_KV.put(kvKey, JSON.stringify(data), { expirationTtl: ttl });

    const retryAfter = Math.max(1, data.resetAt - now);
    const allowed = data.count <= options.limit;

    return { allowed, remaining, retryAfter };
  } catch (err) {
    // If KV fails temporarily, fail open so legitimate users aren't locked out, but log error
    console.error('Rate limit KV check error:', err);
    return { allowed: true, remaining: options.limit, retryAfter: 0 };
  }
}

/**
 * Failed login tracker for brute-force protection and lockout.
 */
export async function checkLoginLockout(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  identifier: string
): Promise<{ isLocked: boolean; retryAfter: number }> {
  try {
    const ip = getClientIp(c);
    const cleanId = identifier.trim().toLowerCase();
    const kvKey = `lockout:${ip}:${cleanId}`;

    const raw = await c.env.SESSION_KV.get(kvKey);
    if (!raw) return { isLocked: false, retryAfter: 0 };

    const now = Math.floor(Date.now() / 1000);
    const data: { attempts: number; lockUntil: number } = JSON.parse(raw);

    if (data.lockUntil && now < data.lockUntil) {
      return { isLocked: true, retryAfter: data.lockUntil - now };
    }

    return { isLocked: false, retryAfter: 0 };
  } catch (err) {
    console.error('Login lockout check error:', err);
    return { isLocked: false, retryAfter: 0 };
  }
}

export async function recordFailedLogin(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  identifier: string
): Promise<{ attempts: number; locked: boolean; retryAfter: number }> {
  try {
    const ip = getClientIp(c);
    const cleanId = identifier.trim().toLowerCase();
    const kvKey = `lockout:${ip}:${cleanId}`;

    const raw = await c.env.SESSION_KV.get(kvKey);
    const now = Math.floor(Date.now() / 1000);
    let attempts = 0;

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        attempts = parsed.attempts || 0;
      } catch {
        attempts = 0;
      }
    }

    attempts += 1;
    const isLocked = attempts >= 5;
    // Lock out for 15 minutes (900 seconds) on 5+ failed attempts
    const lockUntil = isLocked ? now + 900 : 0;
    const ttl = Math.max(900, isLocked ? 900 : 900);

    await c.env.SESSION_KV.put(
      kvKey,
      JSON.stringify({ attempts, lockUntil }),
      { expirationTtl: ttl }
    );

    return { attempts, locked: isLocked, retryAfter: isLocked ? 900 : 0 };
  } catch (err) {
    console.error('Record failed login error:', err);
    return { attempts: 1, locked: false, retryAfter: 0 };
  }
}

export async function resetFailedLogin(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  identifier: string
): Promise<void> {
  try {
    const ip = getClientIp(c);
    const cleanId = identifier.trim().toLowerCase();
    await c.env.SESSION_KV.delete(`lockout:${ip}:${cleanId}`);
  } catch (err) {
    console.error('Reset failed login error:', err);
  }
}
