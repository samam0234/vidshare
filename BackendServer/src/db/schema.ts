export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar TEXT,
  password_hash TEXT,
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS shorts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  author_id TEXT NOT NULL REFERENCES users(id),
  likes INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  views TEXT NOT NULL DEFAULT '0',
  video_url TEXT,
  thumb TEXT,
  gradient TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  short_id TEXT NOT NULL REFERENCES shorts(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  time TEXT NOT NULL,
  parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  author_id TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS chat_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  handle TEXT NOT NULL,
  avatar TEXT,
  last_message TEXT NOT NULL DEFAULT '',
  online INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  peer_id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_image INTEGER NOT NULL DEFAULT 0,
  time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS faqs (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answers TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shorts_author ON shorts(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_short ON comments(short_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_peer ON messages(peer_id);

CREATE TABLE IF NOT EXISTS chatbot_docs (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  thread_key TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chatbot_docs_owner ON chatbot_docs(owner);
CREATE INDEX IF NOT EXISTS idx_chatbot_docs_thread ON chatbot_docs(owner, thread_key);

CREATE TABLE IF NOT EXISTS chatbot_summaries (
  owner TEXT NOT NULL,
  thread_key TEXT NOT NULL,
  summary TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner, thread_key)
);

CREATE TABLE IF NOT EXISTS longform (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  thumb TEXT,
  gradient TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_longform_author ON longform(author_id);

CREATE TABLE IF NOT EXISTS community_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_community_author ON community_posts(author_id);

CREATE TABLE IF NOT EXISTS chatbot_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'locals',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chatbot_threads_owner ON chatbot_threads(owner_id);

CREATE TABLE IF NOT EXISTS chatbot_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL REFERENCES chatbot_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_thread ON chatbot_messages(thread_id);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  target_name TEXT NOT NULL,
  target_handle TEXT NOT NULL,
  last_message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conversations_owner ON conversations(owner_id);

CREATE TABLE IF NOT EXISTS chat_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  is_image INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_lines_conversation ON chat_lines(conversation_id);

CREATE TABLE IF NOT EXISTS support_inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_support_inquiries_owner ON support_inquiries(owner_id);

CREATE TABLE IF NOT EXISTS activity_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  href TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_notifications_owner ON activity_notifications(owner_id);

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
`;
