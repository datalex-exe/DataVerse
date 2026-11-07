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
  suspended_until INTEGER DEFAULT 0,
  is_verification_paid INTEGER DEFAULT 0,
  verification_paid_at INTEGER DEFAULT 0,
  verification_category TEXT,
  verification_document_url TEXT,
  verification_reason TEXT,
  verification_status TEXT DEFAULT 'none',
  cover_url TEXT,
  cover_pos_y INTEGER DEFAULT 50,
  last_active_at INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);
-- Migration: add columns if upgrading existing DB
-- ALTER TABLE users ADD COLUMN cover_url TEXT;
-- ALTER TABLE users ADD COLUMN cover_pos_y INTEGER DEFAULT 50;
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
  is_sensitive INTEGER DEFAULT 0,
  sensitive_reason TEXT,
  is_pinned INTEGER DEFAULT 0,
  pinned_at INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_pinned ON posts(user_id, is_pinned);

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
  parent_id TEXT DEFAULT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- Saved Collections / Bookmark Folders
CREATE TABLE IF NOT EXISTS saved_collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_saved_collections_user ON saved_collections(user_id);

CREATE TABLE IF NOT EXISTS saved_collection_items (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(collection_id, post_id),
  FOREIGN KEY (collection_id) REFERENCES saved_collections(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_collection_items_col ON saved_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_user ON saved_collection_items(user_id);

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
CREATE INDEX IF NOT EXISTS idx_messages_convo_created ON messages(conversation_id, created_at DESC);

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

-- Two-Factor Authentication (TOTP, RFC 6238)
CREATE TABLE IF NOT EXISTS user_2fa (
  user_id TEXT PRIMARY KEY,
  secret_encrypted TEXT NOT NULL,
  enabled INTEGER DEFAULT 0,
  enabled_at INTEGER,
  last_used_step INTEGER DEFAULT 0,
  failed_attempts INTEGER DEFAULT 0,
  locked_until INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS backup_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  used_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_backup_codes_user ON backup_codes(user_id);

CREATE TABLE IF NOT EXISTS trusted_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);

CREATE TABLE IF NOT EXISTS auth_audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  details TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created ON auth_audit_log(created_at DESC);

-- Message Reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(message_id, user_id, emoji),
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);

-- Interactive Polls
CREATE TABLE IF NOT EXISTS post_polls (
  id TEXT PRIMARY KEY,
  post_id TEXT UNIQUE NOT NULL,
  question TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS poll_options (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  option_text TEXT NOT NULL,
  position INTEGER NOT NULL,
  FOREIGN KEY (poll_id) REFERENCES post_polls(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(poll_id, user_id),
  FOREIGN KEY (poll_id) REFERENCES post_polls(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);

-- User Muting (Soft Block)
CREATE TABLE IF NOT EXISTS user_mutes (
  muter_id TEXT NOT NULL,
  muted_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (muter_id, muted_id),
  FOREIGN KEY (muter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (muted_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_mutes_muter ON user_mutes(muter_id);

-- Trending Hashtags
CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id TEXT NOT NULL,
  hashtag TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, hashtag),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON post_hashtags(hashtag);
CREATE INDEX IF NOT EXISTS idx_hashtags_created ON post_hashtags(created_at DESC);



