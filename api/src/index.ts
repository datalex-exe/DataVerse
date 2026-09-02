import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings, Variables } from './types';
import authApp, { authMiddleware } from './auth';
import usersApp from './users';
import postsApp from './posts';
import conversationsApp from './conversations';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Enable CORS
app.use('*', cors({
  origin: '*', // We can restrict this in production
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}));

// API Routes
app.route('/api/auth', authApp);
app.route('/api/users', usersApp);
app.route('/api/posts', postsApp);
app.route('/api/conversations', conversationsApp);

// WebSocket upgrade endpoint routed to Durable Object
app.get('/api/chat/ws/:id', async (c) => {
  const conversationId = c.req.param('id');
  const userId = c.req.query('userId');

  if (!userId) {
    return c.text('Missing userId query parameter', 400);
  }

  // Check if user is blocked in DB
  const user = await c.env.DB.prepare('SELECT is_blocked FROM users WHERE id = ?')
    .bind(userId)
    .first<any>();

  if (!user || user.is_blocked === 1) {
    return c.text('Unauthorized: Account is blocked', 403);
  }

  // Ensure public rooms exist in D1
  if (conversationId.startsWith('room_')) {
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
  const key = c.req.query('key');
  if (!key) {
    return c.json({ error: 'Missing key parameter' }, 400);
  }

  const contentType = c.req.header('Content-Type') || 'application/octet-stream';
  
  try {
    const body = await c.req.arrayBuffer();
    const totalSize = body.byteLength;
    const CHUNK_SIZE = 20 * 1024 * 1024; // Slice into 20MB chunks to stay under KV's 25MB limit

    if (totalSize <= CHUNK_SIZE) {
      // Direct single upload
      await c.env.SESSION_KV.put(`media:${key}`, body);
    } else {
      // Chunked upload
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

    // 2. Put metadata into D1 database as placeholder for backwards-compatibility
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO media_files (key, content, content_type, created_at) VALUES (?, ?, ?, ?)'
    )
      .bind(key, new Uint8Array([0]), contentType, Date.now())
      .run();

    return c.json({ success: true, key });
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

      // Retrieve all chunks in parallel
      const chunkPromises = [];
      for (let i = 0; i < numChunks; i++) {
        chunkPromises.push(c.env.SESSION_KV.get(`media:${key}:chunk:${i}`, { type: 'arrayBuffer' }));
      }
      const chunks = await Promise.all(chunkPromises);

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
      headers.set('Content-Range', `bytes ${start}-${end}/${finalContent.byteLength}`);
      headers.set('Content-Length', chunk.byteLength.toString());

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
      headers.set('Content-Length', finalContent.byteLength.toString());

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

