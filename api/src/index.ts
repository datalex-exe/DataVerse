import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings, Variables } from './types';
import authApp, { authMiddleware, verifyToken } from './auth';
import usersApp from './users';
import postsApp from './posts';
import conversationsApp from './conversations';
import contactApp from './contact';
import { checkRateLimit } from './rateLimit';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Global Security Headers Middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  c.header('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
});

// General API Rate Limiting Middleware (120 req/min per IP, excluding static file streams and websockets)
app.use('/api/*', async (c, next) => {
  if (c.req.path.startsWith('/api/media/file') || c.req.path.startsWith('/api/chat/ws')) {
    return next();
  }
  const rl = await checkRateLimit(c, { prefix: 'api_general', limit: 120, windowSeconds: 60 });
  if (!rl.allowed) {
    c.header('Retry-After', rl.retryAfter.toString());
    return c.json({ error: 'Too many requests. Please slow down.' }, 429);
  }
  await next();
});

// Enable CORS with Origin Validation
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '*';
    if (
      origin === 'https://dataverse-datalex.pages.dev' ||
      origin.endsWith('.dataverse-datalex.pages.dev') ||
      origin.endsWith('.pages.dev') ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      return origin;
    }
    return 'https://dataverse-datalex.pages.dev';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'Retry-After'],
  maxAge: 600,
  credentials: true,
}));

// API Routes
app.route('/api/auth', authApp);
app.route('/api/users', usersApp);
app.route('/api/posts', postsApp);
app.route('/api/conversations', conversationsApp);
app.route('/api/contact', contactApp);

// WebSocket upgrade endpoint routed to Durable Object
app.get('/api/chat/ws/:id', async (c) => {
  const conversationId = c.req.param('id');
  const userId = c.req.query('userId');
  const token = c.req.query('token') || c.req.header('Authorization')?.replace('Bearer ', '');

  if (!userId) {
    return c.text('Missing userId query parameter', 400);
  }

  // Verify authentication token
  if (token) {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (!payload || payload.userId !== userId) {
      return c.text('Unauthorized: Invalid session token', 401);
    }
    const cachedUserId = await c.env.SESSION_KV.get(`session:${token}`);
    if (!cachedUserId || cachedUserId !== userId) {
      return c.text('Unauthorized: Session expired or revoked', 401);
    }
  }

  // Check if user is blocked in DB
  const user = await c.env.DB.prepare('SELECT is_blocked FROM users WHERE id = ?')
    .bind(userId)
    .first<any>();

  if (!user || user.is_blocked === 1) {
    return c.text('Unauthorized: Account is blocked', 403);
  }

  // Verify membership for private chats
  if (!conversationId.startsWith('room_')) {
    const membership = await c.env.DB.prepare(
      'SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?'
    )
      .bind(conversationId, userId)
      .first();

    if (!membership) {
      return c.text('Forbidden: You are not a participant in this conversation', 403);
    }
  } else {
    // Ensure public rooms exist in D1
    try {
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO conversations (id, is_group, created_at) VALUES (?, 1, ?)'
      )
        .bind(conversationId, Date.now())
        .run();
    } catch (err) {
      console.error('Failed to auto-insert room conversation:', err);
    }
  }

  // Retrieve Durable Object stub
  const doId = c.env.CHAT_ROOM.idFromName(conversationId);
  const stub = c.env.CHAT_ROOM.get(doId);

  // Construct target Request URL to forward to DO
  const newUrl = new URL(c.req.url);
  newUrl.searchParams.set('userId', userId);
  newUrl.searchParams.set('conversationId', conversationId);

  const forwardRequest = new Request(newUrl.toString(), {
    headers: c.req.raw.headers,
    method: c.req.method,
    body: c.req.raw.body,
    redirect: 'manual'
  });

  return stub.fetch(forwardRequest);
});

// DATABASE & KV MEDIA UPLOAD ROUTE (Protected)
app.post('/api/media/upload', authMiddleware, async (c) => {
  const userId = c.get('userId');

  // Rate limit: 60 uploads per hour per user
  const rl = await checkRateLimit(c, { prefix: `upload:${userId}`, limit: 60, windowSeconds: 3600 });
  if (!rl.allowed) {
    c.header('Retry-After', rl.retryAfter.toString());
    return c.json({ error: 'Upload rate limit exceeded. Please wait before uploading more files.' }, 429);
  }

  const key = c.req.query('key');
  if (!key || !/^[a-zA-Z0-9_\-\.]{1,120}$/.test(key) || key.includes('..')) {
    return c.json({ error: 'Invalid file key parameter' }, 400);
  }

  const chunkIndexParam = c.req.query('chunkIndex');
  const totalChunksParam = c.req.query('totalChunks');
  const totalSizeParam = c.req.query('totalSize');
  const rawContentType = c.req.header('Content-Type') || 'application/octet-stream';
  const contentType = rawContentType.split(';')[0].trim().toLowerCase();

  const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm', 'audio/wav',
    'application/pdf', 'application/octet-stream'
  ];

  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    return c.json({ error: 'Unsupported media file type.' }, 400);
  }
  
  try {
    const body = await c.req.arrayBuffer();

    if (chunkIndexParam !== undefined && totalChunksParam !== undefined && totalSizeParam !== undefined) {
      // Direct chunked upload from client (for files up to 2 GB)
      const chunkIndex = parseInt(chunkIndexParam, 10);
      const totalChunks = parseInt(totalChunksParam, 10);
      const totalSize = parseInt(totalSizeParam, 10);

      await c.env.SESSION_KV.put(`media:${key}:chunk:${chunkIndex}`, body);

      // If this is the final chunk, store manifest and database record
      if (chunkIndex === totalChunks - 1) {
        await c.env.SESSION_KV.put(
          `media:${key}:manifest`,
          JSON.stringify({ numChunks: totalChunks, totalSize })
        );
        await c.env.DB.prepare(
          'INSERT OR REPLACE INTO media_files (key, content, content_type, created_at) VALUES (?, ?, ?, ?)'
        )
          .bind(key, new Uint8Array([0]), contentType, Date.now())
          .run();
      }

      return c.json({ success: true, key, chunkIndex, totalChunks });
    } else {
      // Single request payload upload
      const totalSize = body.byteLength;
      const CHUNK_SIZE = 20 * 1024 * 1024; // Slice into 20MB chunks to stay under KV limit

      if (totalSize <= CHUNK_SIZE) {
        // Direct single upload
        await c.env.SESSION_KV.put(`media:${key}`, body);
      } else {
        // Server-side chunked upload
        const numChunks = Math.ceil(totalSize / CHUNK_SIZE);
        const chunkPromises = [];
        for (let i = 0; i < numChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, totalSize);
          const chunk = body.slice(start, end);
          chunkPromises.push(c.env.SESSION_KV.put(`media:${key}:chunk:${i}`, chunk));
        }
        await Promise.all(chunkPromises);
        // Save manifest file in KV
        await c.env.SESSION_KV.put(`media:${key}:manifest`, JSON.stringify({ numChunks, totalSize }));
      }

      // Put metadata into D1 database for backwards-compatibility
      await c.env.DB.prepare(
        'INSERT OR REPLACE INTO media_files (key, content, content_type, created_at) VALUES (?, ?, ?, ?)'
      )
        .bind(key, new Uint8Array([0]), contentType, Date.now())
        .run();

      return c.json({ success: true, key });
    }
  } catch (err: any) {
    return c.json({ error: err.message || 'Media upload to KV/D1 failed' }, 500);
  }
});

// DATABASE & KV MEDIA DOWNLOAD ROUTE (Public proxy)
app.get('/api/media/file/*', async (c) => {
  const pathPrefix = '/api/media/file/';
  const key = decodeURIComponent(c.req.path.substring(pathPrefix.length));

  if (!key) {
    return c.json({ error: 'Missing file key' }, 400);
  }

  try {
    let content: any = null;
    let contentType = 'application/octet-stream';

    // 1. Try to get metadata from D1 first to fetch content_type
    const file = await c.env.DB.prepare(
      'SELECT content, content_type FROM media_files WHERE key = ?'
    )
      .bind(key)
      .first<any>();

    if (file) {
      contentType = file.content_type;
    }

    // 2. Try fetching manifest from KV
    const manifestStr = await c.env.SESSION_KV.get(`media:${key}:manifest`);
    if (manifestStr) {
      const manifest = JSON.parse(manifestStr);
      const numChunks = manifest.numChunks;
      const totalSize = manifest.totalSize;

      // Retrieve chunks in batches of 10 to avoid subrequest rate/memory limits
      const BATCH_SIZE = 10;
      const chunks: (ArrayBuffer | null)[] = new Array(numChunks);
      for (let i = 0; i < numChunks; i += BATCH_SIZE) {
        const batchPromises = [];
        for (let j = i; j < Math.min(i + BATCH_SIZE, numChunks); j++) {
          batchPromises.push(
            c.env.SESSION_KV.get(`media:${key}:chunk:${j}`, { type: 'arrayBuffer' })
              .then(res => { chunks[j] = res; })
          );
        }
        await Promise.all(batchPromises);
      }

      // Reassemble chunks
      const merged = new Uint8Array(totalSize);
      let offset = 0;
      for (const chunk of chunks) {
        if (!chunk) {
          throw new Error(`Missing chunk at offset ${offset}`);
        }
        merged.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }
      content = merged.buffer;
    } else {
      // 3. Try to get single KV content
      const kvContent = await c.env.SESSION_KV.get(`media:${key}`, { type: 'arrayBuffer' });
      if (kvContent) {
        content = kvContent;
      } else if (file) {
        // Fallback to legacy D1 blob storage
        content = file.content;
        
        // Normalize content to Uint8Array (D1 returns BLOBs as number[] arrays)
        if (Array.isArray(content)) {
          content = new Uint8Array(content);
        } else if (content instanceof ArrayBuffer) {
          content = new Uint8Array(content);
        }

        if (content instanceof Uint8Array) {
          try {
            const text = new TextDecoder().decode(content);
            if (text.startsWith('255,') || (text.length > 0 && text.substring(0, 20).includes(',') && /^\d+$/.test(text.split(',')[0]))) {
              const byteStrings = text.split(',');
              const bytes = new Uint8Array(byteStrings.length);
              for (let i = 0; i < byteStrings.length; i++) {
                bytes[i] = parseInt(byteStrings[i], 10);
              }
              content = bytes;
            }
          } catch (err) {
            console.error('Failed to parse legacy string blob:', err);
          }
        } else if (typeof content === 'string' && content.includes(',')) {
          try {
            const byteStrings = content.split(',');
            const bytes = new Uint8Array(byteStrings.length);
            for (let i = 0; i < byteStrings.length; i++) {
              bytes[i] = parseInt(byteStrings[i], 10);
            }
            content = bytes;
          } catch (err) {
            console.error('Failed to parse legacy string blob from string:', err);
          }
        }
      }
    }

    if (!content) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Normalize content to Uint8Array for slicing
    let finalContent: Uint8Array;
    if (content instanceof ArrayBuffer) {
      finalContent = new Uint8Array(content);
    } else if (content instanceof Uint8Array) {
      finalContent = content;
    } else {
      finalContent = new Uint8Array(content as any);
    }

    const rangeHeader = c.req.header('Range');
    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      let start = 0;
      let end = finalContent.byteLength - 1;

      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const partialstart = parts[0];
      const partialend = parts[1];

      if (partialstart) {
        start = parseInt(partialstart, 10);
      }
      if (partialend) {
        end = parseInt(partialend, 10);
      }

      if (end >= finalContent.byteLength) {
        end = finalContent.byteLength - 1;
      }

      if (start > end || start < 0 || end < 0) {
        const headers = new Headers();
        headers.set('Content-Range', `bytes */${finalContent.byteLength}`);
        headers.set('Access-Control-Allow-Origin', '*');
        return new Response(null, {
          status: 416,
          headers,
        });
      }

      const chunk = finalContent.slice(start, end + 1);

      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cache-Control', 'public, max-age=31536000');
      headers.set('Accept-Ranges', 'bytes');
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Content-Range', `bytes ${start}-${end}/${finalContent.byteLength}`);
      headers.set('Content-Length', chunk.byteLength.toString());
      if (contentType.startsWith('image/') || contentType.startsWith('video/') || contentType.startsWith('audio/')) {
        headers.set('Content-Disposition', 'inline');
      } else {
        headers.set('Content-Disposition', 'attachment');
      }

      return new Response(chunk, {
        status: 206,
        headers,
      });
    } else {
      const headers = new Headers();
      headers.set('Content-Type', contentType);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Cache-Control', 'public, max-age=31536000');
      headers.set('Accept-Ranges', 'bytes');
      headers.set('X-Content-Type-Options', 'nosniff');
      headers.set('Content-Length', finalContent.byteLength.toString());
      if (contentType.startsWith('image/') || contentType.startsWith('video/') || contentType.startsWith('audio/')) {
        headers.set('Content-Disposition', 'inline');
      } else {
        headers.set('Content-Disposition', 'attachment');
      }

      return new Response(finalContent, {
        headers,
      });
    }
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to retrieve media file' }, 500);
  }
});

app.get('/', (c) => {
  return c.text('DataVerse Backend API running on Cloudflare Workers!');
});

// Export Hono app as default
export default app;

// Export Durable Object class
export { ChatRoom } from './chat';

