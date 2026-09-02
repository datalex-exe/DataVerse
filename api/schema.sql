-- SQLite Database Schema for D1

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  is_verified INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  is_top_admin INTEGER DEFAULT 0,
  is_blocked INTEGER DEFAULT 0,
  is_private INTEGER DEFAULT 0,
  chat_restricted_until INTEGER DEFAULT 0,
  is_verification_paid INTEGER DEFAULT 0,
  verification_paid_at INTEGER DEFAULT 0,
  verification_category TEXT,
  verification_document_url TEXT,
  verification_reason TEXT,
  verification_status TEXT DEFAULT 'none',
  created_at INTEGER NOT NULL
);
-- Migration: add columns if upgrading existing DB
-- ALTER TABLE users ADD COLUMN is_private INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN chat_restricted_until INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN is_verification_paid INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN verification_paid_at INTEGER DEFAULT 0;
-- ALTER TABLE users ADD COLUMN verification_category TEXT;
-- ALTER TABLE users ADD COLUMN verification_document_url TEXT;
-- ALTER TABLE users ADD COLUMN verification_reason TEXT;
-- ALTER TABLE users ADD COLUMN verification_status TEXT DEFAULT 'none';

-- Follows Table
CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  is_accepted INTEGER DEFAULT 1,
  PRIMARY KEY (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

-- Posts Table
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  caption TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

-- Post Media Table (Support carousel/multiple images per post)
CREATE TABLE IF NOT EXISTS post_media (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  media_type TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_post_media_post ON post_media(post_id);

-- Likes Table
CREATE TABLE IF NOT EXISTS likes (
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  is_group INTEGER DEFAULT 0,
  group_name TEXT,
  creator_id TEXT,
  created_at INTEGER NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  is_admin_hidden INTEGER DEFAULT 0,
  admin_cleared_at INTEGER DEFAULT 0
);
-- Migration: add columns if upgrading existing DB
-- ALTER TABLE conversations ADD COLUMN group_name TEXT;
-- ALTER TABLE conversations ADD COLUMN creator_id TEXT;

-- Conversation Members Table
CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  nickname TEXT,
  last_read_at INTEGER DEFAULT 0,
  cleared_at INTEGER DEFAULT 0,
  PRIMARY KEY (conversation_id, user_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Migration: add columns if upgrading existing DB
-- ALTER TABLE conversation_members ADD COLUMN nickname TEXT;
CREATE INDEX IF NOT EXISTS idx_members_user ON conversation_members(user_id);

-- Messages Table
-- sender_id is intentionally NOT a FK to users(id) so system messages (sender_id='system') are allowed
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at ASC);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,          -- The receiver of the notification
  notifier_id TEXT,               -- The user who triggered the action (NULL for system welcome notifications)
  type TEXT NOT NULL,             -- 'welcome' | 'follow' | 'like' | 'comment'
  post_id TEXT,                   -- Reference to post if it's a like or comment (optional)
  body TEXT,                      -- Additional details (e.g. comment text) (optional)
  created_at INTEGER NOT NULL,
  is_read INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (notifier_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Media Files Table (D1-based R2 alternative)
CREATE TABLE IF NOT EXISTS media_files (
  key TEXT PRIMARY KEY,
  content BLOB NOT NULL,
  content_type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  description TEXT NOT NULL,
  reported_username TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Migration: add columns if upgrading existing DB
-- ALTER TABLE reports ADD COLUMN reported_username TEXT;

-- User-to-User Blocks Table
CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_id TEXT NOT NULL,
  blocked_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id),
  FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- User Chat Deletions Table (Action 1)
CREATE TABLE IF NOT EXISTS user_chat_deletions (
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, conversation_id)
);

-- Admin Text Redactions Table (Action 2)
CREATE TABLE IF NOT EXISTS admin_text_redactions (
  admin_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  redacted_at INTEGER NOT NULL,
  PRIMARY KEY (admin_id, message_id)
);

-- Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT,
  created_at INTEGER NOT NULL
);

-- Admin Conversation Hides Table (Action 2 Admin clear chat)
CREATE TABLE IF NOT EXISTS admin_convo_hides (
  admin_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  hidden_at INTEGER NOT NULL,
  PRIMARY KEY (admin_id, conversation_id)
);

