// Cloudflare Pages Edge Worker — Dynamic SEO Pre-rendering, Sitemaps, Robots, & API Proxy
// Deployed directly to Cloudflare Pages edge for https://dataverse-datalex.pages.dev

const WORKER_URL = 'https://dataverse-api.24216287.workers.dev';
const BASE_URL = 'https://dataverse-datalex.pages.dev';
const INDEXNOW_KEY = 'c7b2e6a9f4d14e82b0593c8d1f7a24e6';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
};

const CSP_HEADER = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' blob: data: https:; connect-src 'self' https://dataverse-api.24216287.workers.dev wss://dataverse-api.24216287.workers.dev https://*.workers.dev wss://*.workers.dev; worker-src 'self'; frame-ancestors 'none';";

// Crawler and AI assistant user-agent matcher
const BOT_UA_REGEX = /googlebot|bingbot|yandexbot|duckduckbot|baiduspider|slurp|applebot|facebot|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|ia_archiver|gptbot|chatgpt-user|oai-searchbot|claudebot|perplexitybot|google-extended/i;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = BOT_UA_REGEX.test(userAgent);

    // ──────────────────────────────────────────────────────────────────────────
    // 0. OFFLINE ARCADE STATIC PAGES & SCRIPTS
    // ──────────────────────────────────────────────────────────────────────────
    if (
      url.pathname === '/arcade-offline.html' || 
      url.pathname === '/arcade-register.html' ||
      url.pathname === '/arcade.js' ||
      url.pathname === '/arcade-sw.js'
    ) {
      // Strip query parameters so env.ASSETS.fetch correctly matches the file in static assets
      const cleanAssetUrl = new URL(url.pathname, url.origin);
      const asset = await env.ASSETS.fetch(new Request(cleanAssetUrl.toString(), {
        method: request.method,
        headers: request.headers,
      }));
      const newHeaders = new Headers(asset.headers);
      if (url.pathname.endsWith('.html')) {
        newHeaders.set('Content-Type', 'text/html; charset=utf-8');
        newHeaders.set('Cache-Control', 'public, max-age=86400');
        newHeaders.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'self'");
      } else if (url.pathname.endsWith('.js')) {
        newHeaders.set('Content-Type', 'application/javascript; charset=utf-8');
        newHeaders.set('Cache-Control', 'public, max-age=0, must-revalidate');
      }
      return new Response(asset.body, {
        status: asset.status,
        headers: newHeaders,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. INDEXNOW KEY FILE
    // ──────────────────────────────────────────────────────────────────────────
    if (url.pathname === `/${INDEXNOW_KEY}.txt`) {
      return new Response(INDEXNOW_KEY, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=604800, s-maxage=604800',
        },
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. ROBOTS.TXT
    // ──────────────────────────────────────────────────────────────────────────
    if (url.pathname === '/robots.txt') {
      try {
        const upstream = await fetch(`${WORKER_URL}/api/seo/robots.txt`);
        if (upstream.ok) {
          const body = await upstream.text();
          return new Response(body, {
            status: 200,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'public, max-age=86400, s-maxage=86400',
              'X-Robots-Tag': 'all',
            },
          });
        }
      } catch (_) {}
      // Fallback to static asset if upstream unreachable
      return env.ASSETS.fetch(request);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. SITEMAP.XML
    // ──────────────────────────────────────────────────────────────────────────
    if (url.pathname === '/sitemap.xml' || url.pathname === '/sitemap-index.xml') {
      try {
        const upstream = await fetch(`${WORKER_URL}/api/seo/sitemap.xml`);
        if (upstream.ok) {
          const body = await upstream.text();
          return new Response(body, {
            status: 200,
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
              'Cache-Control': 'public, max-age=3600, s-maxage=3600',
              'X-Robots-Tag': 'all',
            },
          });
        }
      } catch (_) {}
      // Fallback to static asset
      return env.ASSETS.fetch(request);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. API PROXY (/api/*)
    // ──────────────────────────────────────────────────────────────────────────
    if (url.pathname.startsWith('/api/')) {
      const targetUrl = WORKER_URL + url.pathname + url.search;

      // Handle WebSocket upgrades
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
        return fetch(targetUrl, request);
      }

      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: (request.method === 'GET' || request.method === 'HEAD') ? undefined : request.body,
        redirect: 'manual',
      });

      const response = await fetch(proxyRequest);
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        if (!newHeaders.has(key)) {
          newHeaders.set(key, value);
        }
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. STATIC ASSET REQUESTS (images, fonts, scripts, css)
    // ──────────────────────────────────────────────────────────────────────────
    const isStaticFile = /\.(js|css|svg|png|jpg|jpeg|webp|ico|json|woff2?|txt|map)$/i.test(url.pathname);
    if (isStaticFile) {
      const response = await env.ASSETS.fetch(request);
      const newHeaders = new Headers(response.headers);
      for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        newHeaders.set(key, value);
      }
      // Cache static assets aggressively
      if (response.status === 200) {
        newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. DYNAMIC HTML PRE-RENDERING & METADATA INJECTION
    // ──────────────────────────────────────────────────────────────────────────
    // Fetch the base SPA index.html
    const indexResponse = await env.ASSETS.fetch(new Request(`${BASE_URL}/index.html`));
    let html = await indexResponse.text();
    let status = 200;

    let pageTitle = 'DataVerse — Social Network by Datalex';
    let pageDescription = 'Connect, share photos and videos, chat in real time, and explore vibrant creators on DataVerse.';
    let canonicalUrl = `${BASE_URL}${url.pathname === '/' ? '' : url.pathname}`;
    let ogImage = `${BASE_URL}/og-image.png?v=8`;
    let ogType = 'website';
    let robotsDirective = 'index, follow';
    let jsonLd = null;
    let semanticBody = '';

    const path = url.pathname;
    const cleanPath = path.replace(/^\/+|\/+$/g, '');

    const RESERVED_PATHS = new Set([
      'direct',
      'explore',
      'search',
      'notifications',
      'settings',
      'create',
      'admin',
      'p',
      'post',
      'reel',
      'reels',
      'terms',
      'privacy',
      'cookies',
      'refund',
      'contact',
      'api',
      'login',
      'logout',
      'signup',
      'auth',
      'feed',
      'messages',
      'chat',
      '404',
    ]);

    // A. DIRECT MESSAGES (/direct/ or /direct/t/:id/ or /messages/* or /chat/*)
    if (path.startsWith('/direct') || path.startsWith('/messages') || path.startsWith('/chat')) {
      robotsDirective = 'noindex, nofollow';
      pageTitle = 'Direct Messages — DataVerse';
      pageDescription = 'Private direct messaging on DataVerse.';
      canonicalUrl = `${BASE_URL}/direct/`;
    }

    // B. PUBLIC POST OR REEL (/p/:id, /post/:id, /reel/:id, /reels/:id)
    else if (path.match(/^\/(?:post|p|reel|reels)\/([a-zA-Z0-9_-]+)\/?$/i)) {
      const match = path.match(/^\/(?:post|p|reel|reels)\/([a-zA-Z0-9_-]+)\/?$/i);
      const postId = match[1];
      const isReel = path.startsWith('/reel');
      try {
        const postRes = await fetch(`${WORKER_URL}/api/posts/public/${postId}`);
        if (postRes.ok) {
          const data = await postRes.json();
          const post = data.post;
          const author = post.display_name || post.username;
          const captionSnippet = post.caption ? post.caption.substring(0, 120).trim() : (isReel ? 'Video reel' : 'Media post');

          pageTitle = `${isReel ? 'Reel' : 'Post'} by ${author} (@${post.username}): "${captionSnippet}" — DataVerse`;
          pageDescription = post.caption 
            ? `${post.caption.substring(0, 160)} — Published by @${post.username} on DataVerse.`
            : `Shared by @${post.username} on DataVerse. Discover photos, video reels, and creator updates.`;
          canonicalUrl = `${BASE_URL}/${isReel ? 'reel' : 'p'}/${post.id}/`;
          ogType = isReel ? 'video.other' : 'article';

          if (post.media && post.media.length > 0) {
            const firstKey = post.media[0].r2_key;
            ogImage = `${WORKER_URL}/api/media/file/${encodeURIComponent(firstKey)}`;
          }

          const dateIso = post.created_at ? new Date(post.created_at).toISOString() : new Date().toISOString();

          jsonLd = {
            '@context': 'https://schema.org',
            '@type': isReel ? 'VideoObject' : 'SocialMediaPosting',
            'headline': captionSnippet,
            'name': captionSnippet,
            'description': pageDescription,
            'articleBody': post.caption || '',
            'datePublished': dateIso,
            'url': canonicalUrl,
            'author': {
              '@type': 'Person',
              'name': author,
              'alternateName': `@${post.username}`,
              'url': `${BASE_URL}/${post.username}/`,
            },
            'image': ogImage,
            'interactionStatistic': [
              {
                '@type': 'InteractionCounter',
                'interactionType': 'https://schema.org/LikeAction',
                'userInteractionCount': post.likes_count || 0,
              },
              {
                '@type': 'InteractionCounter',
                'interactionType': 'https://schema.org/CommentAction',
                'userInteractionCount': post.comments_count || 0,
              },
            ],
          };

          semanticBody = `
            <article class="sr-only">
              <h1>${isReel ? 'Reel' : 'Post'} by ${escapeHtml(author)} (@${escapeHtml(post.username)})</h1>
              <p>${escapeHtml(post.caption || '')}</p>
              <time datetime="${dateIso}">${new Date(post.created_at).toLocaleDateString()}</time>
            </article>
          `;
        } else if (postRes.status === 404 || postRes.status === 403) {
          status = postRes.status === 403 ? 403 : 404;
          robotsDirective = 'noindex, nofollow';
          pageTitle = postRes.status === 403 ? 'Private Post — DataVerse' : 'Post Not Found — DataVerse';
          pageDescription = 'This post is private or unavailable.';
        }
      } catch (_) {}
    }

    // C. CREATOR PROFILE (/:username, /@username, /profile/:username)
    else if (
      (path.match(/^\/(?:@|profile\/|u\/)([a-zA-Z0-9_.\-@]{2,64})\/?$/i) ||
       (!RESERVED_PATHS.has(cleanPath.toLowerCase()) && /^[a-zA-Z0-9_.\-@]{2,64}$/.test(cleanPath)))
    ) {
      const match = path.match(/^\/(?:@|profile\/|u\/)([a-zA-Z0-9_.\-@]{2,64})\/?$/i);
      const username = (match ? match[1] : cleanPath).toLowerCase();
      try {
        const userRes = await fetch(`${WORKER_URL}/api/users/${username}`);
        if (userRes.ok) {
          const data = await userRes.json();
          const user = data.user;

          if (user.is_private) {
            // Private Profile: Protect privacy, do not index
            robotsDirective = 'noindex, nofollow';
            pageTitle = `@${user.username} (Private Account) — DataVerse`;
            pageDescription = `This account is private. Log in to DataVerse and follow @${user.username} to view their posts.`;
            canonicalUrl = `${BASE_URL}/${user.username}/`;
          } else {
            // Public Profile: Rich indexing & GEO
            const displayName = user.display_name || user.username;
            pageTitle = `${displayName} (@${user.username}) — DataVerse Creator Profile`;
            pageDescription = user.bio 
              ? `${displayName} (@${user.username}): ${user.bio.substring(0, 150)}`
              : `Explore ${displayName}'s (@${user.username}) public profile, photos, video reels, and updates on DataVerse.`;
            canonicalUrl = `${BASE_URL}/${user.username}/`;
            ogType = 'profile';
            if (user.avatar_url) {
              ogImage = user.avatar_url.startsWith('http') ? user.avatar_url : `${WORKER_URL}/api/media/file/${encodeURIComponent(user.avatar_url)}`;
            }

            jsonLd = {
              '@context': 'https://schema.org',
              '@type': 'ProfilePage',
              'mainEntity': {
                '@type': 'Person',
                'name': displayName,
                'alternateName': `@${user.username}`,
                'description': user.bio || `Creator on DataVerse`,
                'image': ogImage,
                'url': canonicalUrl,
                'interactionStatistic': [
                  {
                    '@type': 'InteractionCounter',
                    'interactionType': 'https://schema.org/FollowAction',
                    'userInteractionCount': user.followers_count || 0,
                  },
                ],
              },
            };

            // Inject semantic HTML for crawlers and answer engines
            semanticBody = `
              <header class="sr-only">
                <h1>${escapeHtml(displayName)} (@${escapeHtml(user.username)})</h1>
                <p>${escapeHtml(pageDescription)}</p>
                <dl>
                  <dt>Followers</dt><dd>${user.followers_count || 0}</dd>
                  <dt>Following</dt><dd>${user.following_count || 0}</dd>
                  <dt>Posts</dt><dd>${user.posts_count || 0}</dd>
                </dl>
              </header>
            `;
          }
        } else if (userRes.status === 404) {
          status = 404;
          robotsDirective = 'noindex, nofollow';
          pageTitle = 'User Not Found — DataVerse';
          pageDescription = 'The requested creator profile does not exist or has been removed from DataVerse.';
        }
      } catch (_) {}
    }

    // D. EXPLORE & TOPIC DISCOVERY (/explore or /search)
    else if (path === '/explore' || path === '/explore/' || path === '/search' || path === '/search/') {
      pageTitle = 'Explore Creators, Photos & Trending Posts — DataVerse';
      pageDescription = 'Discover public creators, trending photos, video reels, and conversations on DataVerse. Explore community content and connect with creators.';
      canonicalUrl = `${BASE_URL}/explore/`;
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        'name': 'Explore DataVerse Creators & Content',
        'description': pageDescription,
        'url': canonicalUrl,
      };
      semanticBody = `
        <section class="sr-only">
          <h1>Explore Creators & Trending Public Content</h1>
          <p>${escapeHtml(pageDescription)}</p>
        </section>
      `;
    }

    // E. LEGAL & POLICY PAGES (/terms, /privacy, /cookies, /refund, /contact)
    else if (path === '/terms' || path === '/terms/') {
      pageTitle = 'Terms and Conditions — DataVerse';
      pageDescription = 'Review the official terms of service, platform conduct policies, and user agreements for the DataVerse social network.';
      canonicalUrl = `${BASE_URL}/terms/`;
    } else if (path === '/privacy' || path === '/privacy/') {
      pageTitle = 'Privacy Policy — DataVerse';
      pageDescription = 'Learn how DataVerse protects your personal data, enforces account privacy, and adheres to GDPR and data protection standards.';
      canonicalUrl = `${BASE_URL}/privacy/`;
    } else if (path === '/cookies' || path === '/cookies/') {
      pageTitle = 'Cookies & Storage Policy — DataVerse';
      pageDescription = 'Details on how DataVerse utilizes essential cookies and browser storage for authentication and platform security.';
      canonicalUrl = `${BASE_URL}/cookies/`;
    } else if (path === '/refund' || path === '/refund/') {
      pageTitle = 'Refund & Cancellation Policy — DataVerse';
      pageDescription = 'Information regarding creator subscriptions, verification badge fees, and refund processing on DataVerse.';
      canonicalUrl = `${BASE_URL}/refund/`;
    } else if (path === '/contact' || path === '/contact/') {
      pageTitle = 'Contact Support & Safety Team — DataVerse';
      pageDescription = 'Reach out to the DataVerse safety and platform support team for inquiries, account assistance, or security reports.';
      canonicalUrl = `${BASE_URL}/contact/`;
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        'name': 'Contact DataVerse Support',
        'description': pageDescription,
        'url': canonicalUrl,
      };
    }

    // F. HOMEPAGE (/)
    else if (path === '/' || path === '') {
      pageTitle = 'DataVerse — Social Network & Creator Community by Datalex';
      pageDescription = 'Discover public posts, creators, and conversations on DataVerse. Connect with friends, share high-resolution photos and video reels, and chat in real time.';
      canonicalUrl = `${BASE_URL}/`;
      jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${BASE_URL}/#website`,
            'url': `${BASE_URL}/`,
            'name': 'DataVerse',
            'description': pageDescription,
            'publisher': {
              '@type': 'Organization',
              'name': 'Datalex Cloud Technologies',
              'url': 'https://datalexcloud.tech',
              'logo': `${BASE_URL}/logo.png?v=8`,
            },
            'potentialAction': {
              '@type': 'SearchAction',
              'target': `${BASE_URL}/explore/?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
          {
            '@type': 'Organization',
            '@id': `${BASE_URL}/#organization`,
            'name': 'DataVerse',
            'url': `${BASE_URL}/`,
            'logo': `${BASE_URL}/logo.png?v=8`,
            'sameAs': [
              'https://github.com/datalex-exe/DataVerse',
            ],
          },
        ],
      };
      semanticBody = `
        <div class="sr-only">
          <h1>DataVerse — The Next-Generation Social Network</h1>
          <p>${escapeHtml(pageDescription)}</p>
          <h2>Key Features</h2>
          <ul>
            <li>Photo & Video Sharing with custom camera filters</li>
            <li>Creator Profiles with Verified badges</li>
            <li>Real-time private and group messaging</li>
            <li>Two-Factor Authentication (TOTP, RFC 6238) security</li>
          </ul>
        </div>
      `;
    }

    // G. PRIVATE APPLICATION ROUTES (Protect with noindex)
    else if (
      path.startsWith('/admin') ||
      path.startsWith('/activity') ||
      path.startsWith('/notifications') ||
      path.startsWith('/create') ||
      path.startsWith('/settings')
    ) {
      robotsDirective = 'noindex, nofollow';
      pageTitle = 'DataVerse App';
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. INJECT METADATA INTO HTML
    // ──────────────────────────────────────────────────────────────────────────
    // Replace <title>
    html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(pageTitle)}</title>`);

    // Replace or insert meta description
    if (html.includes('<meta name="description"')) {
      html = html.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeHtml(pageDescription)}" />`);
    } else {
      html = html.replace('</head>', `  <meta name="description" content="${escapeHtml(pageDescription)}" />\n</head>`);
    }

    // Replace or insert canonical link
    if (html.includes('<link rel="canonical"')) {
      html = html.replace(/<link rel="canonical" href=".*?" \/>/i, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
    } else {
      html = html.replace('</head>', `  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />\n</head>`);
    }

    // Replace or insert robots meta tag
    if (html.includes('<meta name="robots"')) {
      html = html.replace(/<meta name="robots" content=".*?" \/>/i, `<meta name="robots" content="${robotsDirective}" />`);
    } else {
      html = html.replace('</head>', `  <meta name="robots" content="${robotsDirective}" />\n</head>`);
    }

    // Replace Open Graph metadata
    html = html.replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeHtml(pageTitle)}" />`);
    html = html.replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeHtml(pageDescription)}" />`);
    html = html.replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);
    html = html.replace(/<meta property="og:type" content=".*?" \/>/i, `<meta property="og:type" content="${ogType}" />`);
    html = html.replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${escapeHtml(ogImage)}" />`);

    // Replace Twitter Card metadata
    html = html.replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${escapeHtml(pageTitle)}" />`);
    html = html.replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${escapeHtml(pageDescription)}" />`);
    html = html.replace(/<meta name="twitter:image" content=".*?" \/>/i, `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`);
    html = html.replace(/<meta name="twitter:card" content=".*?" \/>/i, `<meta name="twitter:card" content="${ogType === 'article' ? 'summary_large_image' : 'summary'}" />`);

    // Inject JSON-LD Schema if present
    if (jsonLd) {
      const jsonLdScript = `\n  <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n  </script>\n`;
      html = html.replace('</head>', `${jsonLdScript}</head>`);
    }

    // Inject semantic body preview inside #root for search engine crawlers and answer engines
    if (isBot && semanticBody) {
      html = html.replace('<div id="root"></div>', `<div id="root">${semanticBody}</div>`);
    }

    // Headers
    const headers = new Headers();
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('X-Robots-Tag', robotsDirective);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      headers.set(key, value);
    }
    headers.set('Content-Security-Policy', CSP_HEADER);
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    return new Response(html, {
      status,
      headers,
    });
  },
};
