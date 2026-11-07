import { Hono } from 'hono';
import { Bindings, Variables } from './types';

const seoApp = new Hono<{ Bindings: Bindings; Variables: Variables }>();

export const BASE_URL = 'https://dataverse-datalex.pages.dev';
export const INDEXNOW_KEY = 'c7b2e6a9f4d14e82b0593c8d1f7a24e6';

/**
 * Clean XML entities
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 1. ROBOTS.TXT
 */
seoApp.get('/robots.txt', (c) => {
  const robotsTxt = `# ==============================================================================
# DataVerse (Datalex) — Search Engine & AI Crawler Policy
# Website: ${BASE_URL}
# ==============================================================================

# Default Crawlers (Googlebot, Bingbot, DuckDuckBot, Applebot, etc.)
User-agent: *
Allow: /
Allow: /explore
Allow: /@*
Allow: /profile/*
Allow: /post/*
Allow: /terms
Allow: /privacy
Allow: /cookies
Allow: /refund
Allow: /contact
Allow: /favicon.svg
Allow: /logo.png
Allow: /arcade.js
Allow: /arcade-sw.js
Allow: /arcade-offline.html
Allow: /llms.txt
Allow: /llms-full.txt

# Prevent crawling of private/authenticated social network features
Disallow: /api/
Disallow: /chat
Disallow: /messages
Disallow: /activity
Disallow: /notifications
Disallow: /create
Disallow: /admin
Disallow: /settings
Disallow: /*?*token=*
Disallow: /*?*auth=*

# AI Search & Retrieval Crawlers (ChatGPT Search, Perplexity, Claude Search)
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: PerplexityBot
User-agent: ClaudeBot
User-agent: Google-Extended
Allow: /
Allow: /explore
Allow: /@*
Allow: /profile/*
Allow: /post/*
Allow: /terms
Allow: /privacy
Allow: /cookies
Allow: /refund
Allow: /contact
Allow: /llms.txt
Allow: /llms-full.txt
Disallow: /chat
Disallow: /messages
Disallow: /admin
Disallow: /settings

# Sitemaps
Sitemap: ${BASE_URL}/sitemap.xml
`;

  return c.text(robotsTxt, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    'X-Robots-Tag': 'all'
  });
});

/**
 * 2. DYNAMIC XML SITEMAP
 * Queries D1 database to index eligible public creator profiles and public posts.
 * Strictly excludes private accounts and restricted content.
 */
seoApp.get('/sitemap.xml', async (c) => {
  try {
    const nowIso = new Date().toISOString().split('T')[0];

    // Core static landing pages
    const staticPages = [
      { loc: `${BASE_URL}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${BASE_URL}/explore`, priority: '0.9', changefreq: 'hourly' },
      { loc: `${BASE_URL}/terms`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${BASE_URL}/privacy`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${BASE_URL}/cookies`, priority: '0.4', changefreq: 'monthly' },
      { loc: `${BASE_URL}/refund`, priority: '0.4', changefreq: 'monthly' },
      { loc: `${BASE_URL}/contact`, priority: '0.6', changefreq: 'monthly' },
    ];

    // Query non-private creator profiles
    const { results: publicUsers } = await c.env.DB.prepare(`
      SELECT username, created_at
      FROM users
      WHERE (is_private = 0 OR is_private IS NULL)
        AND (is_blocked = 0 OR is_blocked IS NULL)
      ORDER BY created_at DESC
      LIMIT 5000
    `).all<any>();

    // Query public posts from non-private accounts
    const { results: publicPosts } = await c.env.DB.prepare(`
      SELECT p.id, p.created_at
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE (u.is_private = 0 OR u.is_private IS NULL)
        AND (u.is_blocked = 0 OR u.is_blocked IS NULL)
      ORDER BY p.created_at DESC
      LIMIT 5000
    `).all<any>();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static pages
    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${escapeXml(page.loc)}</loc>\n`;
      xml += `    <lastmod>${nowIso}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // Public creator profiles
    if (publicUsers && Array.isArray(publicUsers)) {
      for (const u of publicUsers) {
        const dateIso = u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : nowIso;
        xml += `  <url>\n`;
        xml += `    <loc>${escapeXml(`${BASE_URL}/@${u.username}`)}</loc>\n`;
        xml += `    <lastmod>${dateIso}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    // Public posts
    if (publicPosts && Array.isArray(publicPosts)) {
      for (const p of publicPosts) {
        const dateIso = p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : nowIso;
        xml += `  <url>\n`;
        xml += `    <loc>${escapeXml(`${BASE_URL}/post/${p.id}`)}</loc>\n`;
        xml += `    <lastmod>${dateIso}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    xml += `</urlset>`;

    return c.text(xml, 200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Content-Type-Options': 'nosniff'
    });
  } catch (err: any) {
    return c.text(`<!-- Error generating sitemap: ${err.message} -->`, 500, {
      'Content-Type': 'application/xml; charset=utf-8'
    });
  }
});

/**
 * 3. INDEXNOW SUBMISSION ENDPOINT
 * Allows the platform to notify Bing and other search engines of new or updated public URLs.
 */
seoApp.post('/indexnow', async (c) => {
  try {
    const { urls } = await c.req.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return c.json({ error: 'Array of URLs is required' }, 400);
    }

    // Filter to ensure only canonical public URLs are submitted (never private URLs)
    const validUrls = urls.filter((u: string) => {
      return (
        typeof u === 'string' &&
        u.startsWith(BASE_URL) &&
        !u.includes('/chat') &&
        !u.includes('/messages') &&
        !u.includes('/admin') &&
        !u.includes('/settings') &&
        !u.includes('/api')
      );
    });

    if (validUrls.length === 0) {
      return c.json({ error: 'No eligible public URLs to submit' }, 400);
    }

    const payload = {
      host: 'dataverse-datalex.pages.dev',
      key: INDEXNOW_KEY,
      keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
      urlList: validUrls.slice(0, 1000)
    };

    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    return c.json({
      success: true,
      submitted_count: validUrls.length,
      indexnow_status: res.status,
      message: res.ok ? 'IndexNow ping submitted successfully' : 'IndexNow ping sent'
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to submit to IndexNow' }, 500);
  }
});

/**
 * 4. INDEXNOW KEY FILE
 */
seoApp.get(`/${INDEXNOW_KEY}.txt`, (c) => {
  return c.text(INDEXNOW_KEY, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=604800, s-maxage=604800'
  });
});

const LLMS_TXT = `# DataVerse

> DataVerse is a modern, real-time social networking platform, creator community hub, and interactive web arcade crafted by Datalex.

DataVerse provides users with seamless real-time messaging, encrypted chat sessions, rich multimedia post sharing, creator discovery, responsive dark-themed UI, offline-capable retro arcade gaming, and admin moderation tools.

## Core Features
- [Explore Feed](https://dataverse-datalex.pages.dev/explore): Browse trending public posts, photos, reels, and creators across the network.
- [Arcade & Games](https://dataverse-datalex.pages.dev/arcade): 100% offline-capable retro arcade suites, mini-games, and 1v1 multiplayer friend battles.
- [Public Profiles](https://dataverse-datalex.pages.dev/@datalex): Discover verified creators, follow user feeds, and view activity portfolios.
- [Real-Time Messaging](https://dataverse-datalex.pages.dev/chat): Direct and group messaging with media sharing, voice recordings, and end-to-end user privacy.

## Legal & Compliance
- [Terms of Service](https://dataverse-datalex.pages.dev/terms): User agreement, rights, community standards, and platform usage terms.
- [Privacy Policy](https://dataverse-datalex.pages.dev/privacy): Data protection practices, encryption standards, and user privacy guarantees.
- [Cookie Policy](https://dataverse-datalex.pages.dev/cookies): Transparent disclosure of local storage, sessions, and cookie utilization.
- [Refund Policy](https://dataverse-datalex.pages.dev/refund): Verification subscriptions and transaction policy.
- [Contact Support](https://dataverse-datalex.pages.dev/contact): Official support channels, abuse reporting, and security contacts.

## Technical Architecture
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Cloudflare Pages Edge network.
- **Backend**: Cloudflare Workers, Hono framework, Cloudflare D1 SQL database, Cloudflare KV, Durable Objects for WebSocket coordination.
- **Security**: Content Security Policy, strict session tokens, input validation, role-based access control (RBAC).

## Optional
- [Sitemap](https://dataverse-datalex.pages.dev/sitemap.xml): Machine-readable XML index of public platform endpoints.
- [Robots Policy](https://dataverse-datalex.pages.dev/robots.txt): Crawler indexing and retrieval instructions for search engines and AI assistants.
`;

const LLMS_FULL_TXT = `# DataVerse — Full Technical & Platform Overview

> Comprehensive system documentation, features, user guides, and architecture for DataVerse by Datalex.

## Platform Summary
DataVerse is a full-featured real-time web application combining modern social networking, secure peer communications, and lightweight 1v1 multiplayer retro arcade gaming.

## Core Capabilities
- **Multimedia Sharing**: Upload and view photos, videos, and reels with adaptive client-side optimization and responsive streaming.
- **Direct & Group Conversations**: Instant messaging powered by Cloudflare Durable Objects and WebSockets with encrypted payload storage.
- **Arcade & Mini-Games**: Offline-first Retro Canvas Suite (Runner, Snake, Flappy, Breakout) and 1v1 Multiplayer Battles (Tic-Tac-Toe, Chess, Rock-Paper-Scissors, Memory Match, Spin Wheel, Closest Guess, Dots and Boxes, Connect Four, Word Duel, Number Guess, Reaction Race, Checkers).
- **Super Admin Vault**: Comprehensive moderation queue, abuse report triage, user management, and real-time live and purged asset audit sync.

## Endpoints & URLs
- Homepage: https://dataverse-datalex.pages.dev/
- Explore: https://dataverse-datalex.pages.dev/explore
- Arcade: https://dataverse-datalex.pages.dev/arcade
- Terms: https://dataverse-datalex.pages.dev/terms
- Privacy: https://dataverse-datalex.pages.dev/privacy
- Support: https://dataverse-datalex.pages.dev/contact
- Sitemap: https://dataverse-datalex.pages.dev/sitemap.xml
- Robots: https://dataverse-datalex.pages.dev/robots.txt
`;

/**
 * 5. LLMS.TXT & LLMS-FULL.TXT (Standard AI & Large Language Model Specification)
 */
seoApp.get('/llms.txt', (c) => {
  return c.text(LLMS_TXT, 200, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    'X-Robots-Tag': 'all'
  });
});

seoApp.get('/.well-known/llms.txt', (c) => {
  return c.text(LLMS_TXT, 200, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    'X-Robots-Tag': 'all'
  });
});

seoApp.get('/llms-full.txt', (c) => {
  return c.text(LLMS_FULL_TXT, 200, {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    'X-Robots-Tag': 'all'
  });
});

export default seoApp;
