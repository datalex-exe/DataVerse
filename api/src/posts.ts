import { Hono } from 'hono';
import { Bindings, Variables } from './types';
import { authMiddleware } from './auth';

const postsApp = new Hono<{ Bindings: Bindings; Variables: Variables }>();

postsApp.use('*', authMiddleware);

// CREATE POST
postsApp.post('/', async (c) => {
  const userId = c.get('userId');
  try {
    const { caption, media } = await c.req.json(); // media: array of { r2_key, media_type }

    if (!media || !Array.isArray(media) || media.length === 0) {
      return c.json({ error: 'At least one media file is required' }, 400);
    }

    const postId = crypto.randomUUID();
    const createdAt = Date.now();

    // 1. Insert into posts table
    await c.env.DB.prepare(
      'INSERT INTO posts (id, user_id, caption, created_at) VALUES (?, ?, ?, ?)'
    )
      .bind(postId, userId, caption || '', createdAt)
      .run();

    // 2. Insert media items
    const mediaStatements = media.map((item: { r2_key: string; media_type: string }, index: number) => {
      const mediaId = crypto.randomUUID();
      return c.env.DB.prepare(
        'INSERT INTO post_media (id, post_id, r2_key, media_type, position) VALUES (?, ?, ?, ?, ?)'
      ).bind(mediaId, postId, item.r2_key, item.media_type, index);
    });

    // Run batch inserts
    await c.env.DB.batch(mediaStatements);

    return c.json({ success: true, postId });
  } catch (err: any) {
    return c.json({ error: err.message || 'Post creation failed' }, 500);
  }
});

// GET FEED (following + own posts)
postsApp.get('/feed', async (c) => {
  const userId = c.get('userId');
  const limit = Math.min(parseInt(c.req.query('limit') || '10'), 30);
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    // 1. Fetch posts
    const { results: posts } = await c.env.DB.prepare(`
      SELECT p.id, p.caption, p.created_at, u.id AS user_id, u.username, u.display_name, u.avatar_url, u.is_verified,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE (u.is_private = 0 OR p.user_id = ? OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ? AND is_accepted = 1))
        AND p.user_id NOT IN (
          SELECT blocker_id FROM user_blocks WHERE blocked_id = ?
          UNION
          SELECT blocked_id FROM user_blocks WHERE blocker_id = ?
        )
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `)
      .bind(userId, userId, userId, userId, userId, limit, offset)
      .all<any>();

    if (!posts || posts.length === 0) {
      return c.json({ posts: [] });
    }

    // 2. Fetch media keys for these posts in one query
    const postIds = posts.map(p => p.id);
    const placeholders = postIds.map(() => '?').join(',');
    const { results: mediaResults } = await c.env.DB.prepare(`
      SELECT * FROM post_media WHERE post_id IN (${placeholders}) ORDER BY position ASC
    `)
      .bind(...postIds)
      .all<any>();

    // 3. Map media keys to posts
    const feed = posts.map(post => {
      const postMedia = mediaResults
        .filter(m => m.post_id === post.id)
        .map(m => ({
          id: m.id,
          r2_key: m.r2_key,
          media_type: m.media_type,
          position: m.position
        }));

      return {
        ...post,
        is_liked: post.is_liked > 0,
        is_verified: !!post.is_verified,
        media: postMedia
      };
    });

    return c.json({ posts: feed });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET REELS (Global discover feed - excludes private accounts the viewer doesn't follow)
postsApp.get('/reels', async (c) => {
  const userId = c.get('userId');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
  const offset = parseInt(c.req.query('offset') || '0');

  try {
    // Check if viewer is admin (admins see all)
    const viewer = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
      .bind(userId).first<any>();
    const isAdmin = viewer && (viewer.is_admin === 1 || viewer.is_top_admin === 1);

    const { results: posts } = await c.env.DB.prepare(`
      SELECT p.id, p.caption, p.created_at, u.id AS user_id, u.username, u.display_name, u.avatar_url, u.is_verified,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE (
        u.is_private = 0
        OR p.user_id = ?
        OR ${isAdmin ? '1=1' : 'p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ? AND is_accepted = 1)'}
      )
      AND p.user_id NOT IN (
        SELECT blocker_id FROM user_blocks WHERE blocked_id = ?
        UNION
        SELECT blocked_id FROM user_blocks WHERE blocker_id = ?
      )
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `)
      .bind(userId, userId, ...(isAdmin ? [] : [userId]), userId, userId, limit, offset)
      .all<any>();

    if (!posts || posts.length === 0) {
      return c.json({ posts: [] });
    }

    const postIds = posts.map(p => p.id);
    const placeholders = postIds.map(() => '?').join(',');
    const { results: mediaResults } = await c.env.DB.prepare(`
      SELECT * FROM post_media WHERE post_id IN (${placeholders}) ORDER BY position ASC
    `)
      .bind(...postIds)
      .all<any>();

    const feed = posts.map(post => {
      const postMedia = mediaResults
        .filter(m => m.post_id === post.id)
        .map(m => ({
          id: m.id,
          r2_key: m.r2_key,
          media_type: m.media_type,
          position: m.position
        }));

      return {
        ...post,
        is_liked: post.is_liked > 0,
        is_verified: !!post.is_verified,
        media: postMedia
      };
    });

    return c.json({ posts: feed });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET USER'S GRID POSTS (Profile page)
postsApp.get('/user/:username', async (c) => {
  const username = c.req.param('username').trim().toLowerCase();
  const currentUserId = c.get('userId');

  try {
    const targetUser = await c.env.DB.prepare(
      'SELECT id, is_private FROM users WHERE LOWER(username) = ?'
    )
      .bind(username)
      .first<any>();

    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    const isOwn = targetUser.id === currentUserId;

    // Check if viewer is admin
    const viewer = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
      .bind(currentUserId).first<any>();
    const isAdmin = viewer && (viewer.is_admin === 1 || viewer.is_top_admin === 1);

    // If private and not own profile and not admin, check follow status
    if (targetUser.is_private && !isOwn && !isAdmin) {
      const followRow = await c.env.DB.prepare(
        'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? AND is_accepted = 1'
      )
        .bind(currentUserId, targetUser.id)
        .first<any>();

      if (!followRow) {
        return c.json({ posts: [], is_private: true, is_following: false });
      }
    }

    const { results: posts } = await c.env.DB.prepare(`
      SELECT p.id, p.caption, p.created_at,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
      FROM posts p
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `)
      .bind(currentUserId, targetUser.id)
      .all<any>();

    if (!posts || posts.length === 0) {
      return c.json({ posts: [], is_private: !!targetUser.is_private, is_following: true });
    }

    // Fetch media for posts
    const postIds = posts.map(p => p.id);
    const placeholders = postIds.map(() => '?').join(',');
    const { results: mediaResults } = await c.env.DB.prepare(`
      SELECT * FROM post_media WHERE post_id IN (${placeholders}) ORDER BY position ASC
    `)
      .bind(...postIds)
      .all<any>();

    const mappedPosts = posts.map(post => {
      const postMedia = mediaResults
        .filter(m => m.post_id === post.id)
        .map(m => ({
          id: m.id,
          r2_key: m.r2_key,
          media_type: m.media_type,
          position: m.position
        }));

      return {
        ...post,
        is_liked: post.is_liked > 0,
        media: postMedia
      };
    });

    return c.json({ posts: mappedPosts, is_private: !!targetUser.is_private, is_following: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// LIKE POST
postsApp.post('/:id/like', async (c) => {
  const userId = c.get('userId');
  const postId = c.req.param('id');
  const createdAt = Date.now();

  try {
    const post = await c.env.DB.prepare(
      'SELECT p.user_id, u.is_private FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?'
    ).bind(postId).first<any>();

    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    // Check blocking relationship
    const isBlocked = await c.env.DB.prepare(`
      SELECT 1 FROM user_blocks 
      WHERE (blocker_id = ? AND blocked_id = ?) 
         OR (blocker_id = ? AND blocked_id = ?)
    `)
      .bind(userId, post.user_id, post.user_id, userId)
      .first();

    if (isBlocked) {
      return c.json({ error: 'Action not allowed. Block active between users.' }, 403);
    }

    if (post.is_private && post.user_id !== userId) {
      const viewer = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
        .bind(userId).first<any>();
      const isAdmin = viewer && (viewer.is_admin === 1 || viewer.is_top_admin === 1);

      if (!isAdmin) {
        const followRow = await c.env.DB.prepare(
          'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? AND is_accepted = 1'
        ).bind(userId, post.user_id).first<any>();

        if (!followRow) {
          return c.json({ error: 'This account is private' }, 403);
        }
      }
    }

    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO likes (post_id, user_id, created_at) VALUES (?, ?, ?)'
    )
      .bind(postId, userId, createdAt)
      .run();

    // Insert notification (if not self-like)
    if (post.user_id !== userId) {
      const notificationId = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO notifications (id, user_id, notifier_id, type, post_id, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?, 0)'
      )
        .bind(notificationId, post.user_id, userId, 'like', postId, createdAt)
        .run();
    }

    return c.json({ success: true, message: 'Post liked' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// UNLIKE POST
postsApp.delete('/:id/like', async (c) => {
  const userId = c.get('userId');
  const postId = c.req.param('id');

  try {
    const post = await c.env.DB.prepare(
      'SELECT p.user_id, u.is_private FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?'
    ).bind(postId).first<any>();

    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    if (post.is_private && post.user_id !== userId) {
      const viewer = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
        .bind(userId).first<any>();
      const isAdmin = viewer && (viewer.is_admin === 1 || viewer.is_top_admin === 1);

      if (!isAdmin) {
        const followRow = await c.env.DB.prepare(
          'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? AND is_accepted = 1'
        ).bind(userId, post.user_id).first<any>();

        if (!followRow) {
          return c.json({ error: 'This account is private' }, 403);
        }
      }
    }

    await c.env.DB.prepare(
      'DELETE FROM likes WHERE post_id = ? AND user_id = ?'
    )
      .bind(postId, userId)
      .run();

    return c.json({ success: true, message: 'Post unliked' });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// CREATE COMMENT
postsApp.post('/:id/comment', async (c) => {
  const userId = c.get('userId');
  const postId = c.req.param('id');
  const { body } = await c.req.json();

  if (!body || body.trim() === '') {
    return c.json({ error: 'Comment body is required' }, 400);
  }

  const commentId = crypto.randomUUID();
  const createdAt = Date.now();

  try {
    const post = await c.env.DB.prepare(
      'SELECT p.user_id, u.is_private FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?'
    ).bind(postId).first<any>();

    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    // Check blocking relationship
    const isBlocked = await c.env.DB.prepare(`
      SELECT 1 FROM user_blocks 
      WHERE (blocker_id = ? AND blocked_id = ?) 
         OR (blocker_id = ? AND blocked_id = ?)
    `)
      .bind(userId, post.user_id, post.user_id, userId)
      .first();

    if (isBlocked) {
      return c.json({ error: 'Action not allowed. Block active between users.' }, 403);
    }

    if (post.is_private && post.user_id !== userId) {
      const viewer = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
        .bind(userId).first<any>();
      const isAdmin = viewer && (viewer.is_admin === 1 || viewer.is_top_admin === 1);

      if (!isAdmin) {
        const followRow = await c.env.DB.prepare(
          'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? AND is_accepted = 1'
        ).bind(userId, post.user_id).first<any>();

        if (!followRow) {
          return c.json({ error: 'This account is private' }, 403);
        }
      }
    }

    await c.env.DB.prepare(
      'INSERT INTO comments (id, post_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(commentId, postId, userId, body.trim(), createdAt)
      .run();

    // Insert notification (if not self-comment)
    if (post.user_id !== userId) {
      const notificationId = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO notifications (id, user_id, notifier_id, type, post_id, body, created_at, is_read) VALUES (?, ?, ?, ?, ?, ?, ?, 0)'
      )
        .bind(notificationId, post.user_id, userId, 'comment', postId, body.trim(), createdAt)
        .run();
    }

    // Fetch user details for comment response
    const commentUser = await c.env.DB.prepare(
      'SELECT id, username, display_name, avatar_url, is_verified FROM users WHERE id = ?'
    )
      .bind(userId)
      .first<any>();

    return c.json({
      success: true,
      comment: {
        id: commentId,
        body: body.trim(),
        created_at: createdAt,
        user_id: userId,
        username: commentUser.username,
        display_name: commentUser.display_name,
        avatar_url: commentUser.avatar_url,
        is_verified: !!commentUser.is_verified
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET POST COMMENTS
postsApp.get('/:id/comments', async (c) => {
  const postId = c.req.param('id');
  const currentUserId = c.get('userId');

  try {
    // Check if the post belongs to a private account
    const post = await c.env.DB.prepare(
      'SELECT p.user_id, u.is_private FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?'
    ).bind(postId).first<any>();

    if (post && post.is_private && post.user_id !== currentUserId) {
      // Check viewer is admin
      const viewer = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
        .bind(currentUserId).first<any>();
      const isAdmin = viewer && (viewer.is_admin === 1 || viewer.is_top_admin === 1);

      if (!isAdmin) {
        const followRow = await c.env.DB.prepare(
          'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? AND is_accepted = 1'
        ).bind(currentUserId, post.user_id).first<any>();

        if (!followRow) {
          return c.json({ error: 'This account is private' }, 403);
        }
      }
    }

    const { results: comments } = await c.env.DB.prepare(`
      SELECT c.id, c.body, c.created_at, u.id AS user_id, u.username, u.display_name, u.avatar_url, u.is_verified
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `)
      .bind(postId)
      .all<any>();

    return c.json({ comments: comments || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET SINGLE POST BY ID
postsApp.get('/:id', async (c) => {
  const userId = c.get('userId');
  const postId = c.req.param('id');

  try {
    const post = await c.env.DB.prepare(`
      SELECT p.id, p.caption, p.created_at, u.id AS user_id, u.username, u.display_name, u.avatar_url, u.is_verified, u.is_private,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `)
      .bind(userId, postId)
      .first<any>();

    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    // Check blocking relationship
    const isBlocked = await c.env.DB.prepare(`
      SELECT 1 FROM user_blocks 
      WHERE (blocker_id = ? AND blocked_id = ?) 
         OR (blocker_id = ? AND blocked_id = ?)
    `)
      .bind(userId, post.user_id, post.user_id, userId)
      .first();

    if (isBlocked) {
      return c.json({ error: 'Post is not accessible due to blocking' }, 403);
    }

    // Check privacy
    if (post.is_private && post.user_id !== userId) {
      const viewer = await c.env.DB.prepare('SELECT is_admin, is_top_admin FROM users WHERE id = ?')
        .bind(userId).first<any>();
      const isAdmin = viewer && (viewer.is_admin === 1 || viewer.is_top_admin === 1);

      if (!isAdmin) {
        const followRow = await c.env.DB.prepare(
          'SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? AND is_accepted = 1'
        ).bind(userId, post.user_id).first<any>();

        if (!followRow) {
          return c.json({ error: 'This account is private' }, 403);
        }
      }
    }

    // Fetch media files
    const { results: media } = await c.env.DB.prepare(
      'SELECT r2_key, media_type FROM post_media WHERE post_id = ? ORDER BY position ASC'
    )
      .bind(postId)
      .all<any>();

    return c.json({
      post: {
        id: post.id,
        caption: post.caption,
        created_at: post.created_at,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        is_liked: post.is_liked > 0,
        user_id: post.user_id,
        username: post.username,
        display_name: post.display_name,
        avatar_url: post.avatar_url,
        is_verified: !!post.is_verified,
        media: media || []
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// DELETE POST
postsApp.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const postId = c.req.param('id');

  try {
    // 1. Check if post exists and who owns it
    const post = await c.env.DB.prepare(
      'SELECT user_id FROM posts WHERE id = ?'
    )
      .bind(postId)
      .first<any>();

    if (!post) {
      return c.json({ error: 'Post not found' }, 404);
    }

    // Check if the caller is an admin
    const userRow = await c.env.DB.prepare(
      'SELECT is_admin, is_top_admin FROM users WHERE id = ?'
    )
      .bind(userId)
      .first<any>();
    
    const isAdmin = userRow && (userRow.is_admin === 1 || userRow.is_top_admin === 1);

    if (post.user_id !== userId && !isAdmin) {
      return c.json({ error: 'Unauthorized to delete this post' }, 403);
    }

    // 2. Fetch associated post media keys to delete from media_files table
    const { results: mediaItems } = await c.env.DB.prepare(
      'SELECT r2_key FROM post_media WHERE post_id = ?'
    )
      .bind(postId)
      .all<any>();

    if (mediaItems && mediaItems.length > 0) {
      const deleteMediaStatements = mediaItems.map(m => {
        return c.env.DB.prepare('DELETE FROM media_files WHERE key = ?').bind(m.r2_key);
      });
      await c.env.DB.batch(deleteMediaStatements);
    }

    // 3. Delete from posts table (cascades will delete likes, comments, post_media records)
    await c.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(postId).run();

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to delete post' }, 500);
  }
});

export default postsApp;
