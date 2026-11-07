-- 0003_advanced_features.sql
-- 1. Pinned Posts support
ALTER TABLE posts ADD COLUMN is_pinned INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN pinned_at INTEGER DEFAULT 0;

-- 2. Threaded Comments support
ALTER TABLE comments ADD COLUMN parent_id TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- 3. Saved Collections / Bookmark Folders
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
