-- Migration: 7 Features Support
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
