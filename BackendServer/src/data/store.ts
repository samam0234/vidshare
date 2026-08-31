import { v4 as uuid } from "uuid";
import { getDb } from "../db/client";
import type {
  Author,
  ChatUser,
  ChatLine,
  ChatbotAttachment,
  ChatbotThread,
  ChatbotThreadMessage,
  ChatbotThreadModel,
  Comment,
  CommunityPost,
  Conversation,
  AppNotification,
  FaqItem,
  LongformVideo,
  Message,
  NotificationCategory,
  Short,
  SupportInquiry,
} from "../types";

type UserRow = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  avatar: string | null;
};

type ShortJoinRow = {
  id: string;
  title: string;
  description: string;
  author_id: string;
  likes: number;
  comment_count: number;
  views: string;
  video_url: string | null;
  thumb: string | null;
  gradient: string;
  created_at: string;
  handle: string;
  author_name: string;
  author_bio: string;
  author_avatar: string | null;
};

const SHORT_SELECT = `
  SELECT
    s.id, s.title, s.description, s.author_id, s.likes, s.comment_count,
    s.views, s.video_url, s.thumb, s.gradient, s.created_at,
    u.handle, u.name AS author_name, u.bio AS author_bio, u.avatar AS author_avatar
  FROM shorts s
  JOIN users u ON u.id = s.author_id
`;

function toAuthor(row: UserRow): Author {
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    bio: row.bio,
    ...(row.avatar ? { avatar: row.avatar } : {}),
  };
}

function toShort(row: ShortJoinRow): Short {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    author: {
      id: row.author_id,
      handle: row.handle,
      name: row.author_name,
      bio: row.author_bio,
      ...(row.author_avatar ? { avatar: row.author_avatar } : {}),
    },
    likes: row.likes,
    comments: row.comment_count,
    views: row.views,
    gradient: row.gradient,
    createdAt: row.created_at,
    ...(row.video_url ? { videoUrl: row.video_url } : {}),
    ...(row.thumb ? { thumb: row.thumb } : {}),
  };
}

export function listAuthors(): Author[] {
  const rows = getDb()
    .prepare(
      "SELECT id, handle, name, bio, avatar FROM users ORDER BY created_at, id"
    )
    .all() as UserRow[];
  return rows.map(toAuthor);
}

export function findAuthor(idOrHandle: string): Author | undefined {
  const key = idOrHandle.replace(/^@/, "").trim();
  const row = getDb()
    .prepare(
      `SELECT id, handle, name, bio, avatar FROM users
       WHERE id = ? OR lower(handle) = lower(?)`
    )
    .get(key, key) as UserRow | undefined;
  return row ? toAuthor(row) : undefined;
}

export function searchAuthors(q: string, limit = 20): Author[] {
  const like = `%${q.trim().toLowerCase().replace(/^@/, "")}%`;
  const rows = getDb()
    .prepare(
      `SELECT id, handle, name, bio, avatar FROM users
       WHERE lower(handle) LIKE ? OR lower(name) LIKE ?
       ORDER BY created_at, id LIMIT ?`
    )
    .all(like, like, limit) as UserRow[];
  return rows.map(toAuthor);
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

export function isFollowing(followerId: string, followingId: string): boolean {
  const row = getDb()
    .prepare(
      "SELECT 1 AS x FROM user_follows WHERE follower_id = ? AND following_id = ?"
    )
    .get(followerId, followingId) as { x: number } | undefined;
  return Boolean(row);
}

export function countFollowers(userId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS c FROM user_follows WHERE following_id = ?")
    .get(userId) as { c: number };
  return row.c;
}

export function countFollowing(userId: string): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS c FROM user_follows WHERE follower_id = ?")
    .get(userId) as { c: number };
  return row.c;
}

/** 이미 팔로우 중이면 아무것도 하지 않는다(멱등). */
export function followUser(followerId: string, followingId: string): boolean {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO user_follows (follower_id, following_id, created_at)
       VALUES (?, ?, ?)`
    )
    .run(followerId, followingId, new Date().toISOString());
  return true;
}

export function unfollowUser(followerId: string, followingId: string): boolean {
  getDb()
    .prepare(
      "DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?"
    )
    .run(followerId, followingId);
  return true;
}

export function listFollowers(userId: string): Author[] {
  const rows = getDb()
    .prepare(
      `SELECT u.id, u.handle, u.name, u.bio, u.avatar
       FROM user_follows f JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = ? ORDER BY f.created_at DESC`
    )
    .all(userId) as UserRow[];
  return rows.map(toAuthor);
}

export function listFollowing(userId: string): Author[] {
  const rows = getDb()
    .prepare(
      `SELECT u.id, u.handle, u.name, u.bio, u.avatar
       FROM user_follows f JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = ? ORDER BY f.created_at DESC`
    )
    .all(userId) as UserRow[];
  return rows.map(toAuthor);
}

/** 내가 팔로우한 사람들의 쇼츠 (팔로잉 피드) */
export function listFollowingShorts(userId: string, limit = 50): Short[] {
  const rows = getDb()
    .prepare(
      `${SHORT_SELECT}
       WHERE s.author_id IN (
         SELECT following_id FROM user_follows WHERE follower_id = ?
       )
       ORDER BY s.created_at DESC, s.id DESC LIMIT ?`
    )
    .all(userId, limit) as ShortJoinRow[];
  return rows.map(toShort);
}

export function listShorts(q?: string): Short[] {
  const query = q?.trim().toLowerCase() ?? "";
  if (!query) {
    const rows = getDb()
      .prepare(`${SHORT_SELECT} ORDER BY s.created_at DESC, s.id DESC`)
      .all() as ShortJoinRow[];
    return rows.map(toShort);
  }
  const like = `%${query}%`;
  const rows = getDb()
    .prepare(
      `${SHORT_SELECT}
       WHERE lower(s.title) LIKE ? OR lower(u.handle) LIKE ? OR lower(s.description) LIKE ?
       ORDER BY s.created_at DESC, s.id DESC`
    )
    .all(like, like, like) as ShortJoinRow[];
  return rows.map(toShort);
}

export function getShort(id: string): Short | undefined {
  const row = getDb()
    .prepare(`${SHORT_SELECT} WHERE s.id = ?`)
    .get(id) as ShortJoinRow | undefined;
  return row ? toShort(row) : undefined;
}

export function listShortsByAuthor(authorId: string): Short[] {
  const rows = getDb()
    .prepare(
      `${SHORT_SELECT} WHERE s.author_id = ? ORDER BY s.created_at DESC, s.id DESC`
    )
    .all(authorId) as ShortJoinRow[];
  return rows.map(toShort);
}

export function createShort(input: {
  title: string;
  description?: string;
  gradient?: string;
  videoUrl?: string;
  thumb?: string;
  authorId: string;
}): Short {
  const author = findAuthor(input.authorId);
  if (!author) throw new Error("작성자를 찾을 수 없습니다.");

  const id = `s-${uuid().slice(0, 8)}`;
  const createdAt = new Date().toISOString().slice(0, 10);
  const gradient =
    input.gradient || "linear-gradient(160deg, #7c3aed, #3ea6ff)";
  const description = input.description ?? "";

  getDb()
    .prepare(
      `INSERT INTO shorts
        (id, title, description, author_id, likes, comment_count, views, video_url, thumb, gradient, created_at)
       VALUES (?, ?, ?, ?, 0, 0, '0', ?, ?, ?, ?)`
    )
    .run(
      id,
      input.title,
      description,
      author.id,
      input.videoUrl ?? null,
      input.thumb ?? null,
      gradient,
      createdAt
    );

  return getShort(id)!;
}

export function likeShort(id: string, unlike: boolean) {
  const db = getDb();
  const row = db.prepare("SELECT likes FROM shorts WHERE id = ?").get(id) as
    | { likes: number }
    | undefined;
  if (!row) return undefined;
  const likes = unlike ? Math.max(0, row.likes - 1) : row.likes + 1;
  db.prepare("UPDATE shorts SET likes = ? WHERE id = ?").run(likes, id);
  return { id, likes };
}

export function listComments(shortId: string): Comment[] {
  const rows = getDb()
    .prepare(
      "SELECT id, short_id, author, text, time FROM comments WHERE short_id = ? ORDER BY rowid"
    )
    .all(shortId) as Array<{
    id: string;
    short_id: string;
    author: string;
    text: string;
    time: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    shortId: r.short_id,
    author: r.author,
    text: r.text,
    time: r.time,
  }));
}

export function addComment(input: {
  shortId: string;
  text: string;
  author: string;
}): Comment | undefined {
  const db = getDb();
  const short = db
    .prepare("SELECT id FROM shorts WHERE id = ?")
    .get(input.shortId) as { id: string } | undefined;
  if (!short) return undefined;

  const comment: Comment = {
    id: `c-${uuid().slice(0, 8)}`,
    shortId: input.shortId,
    author: input.author,
    text: input.text,
    time: "방금 전",
  };

  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO comments (id, short_id, author, text, time) VALUES (?, ?, ?, ?, ?)"
    ).run(comment.id, comment.shortId, comment.author, comment.text, comment.time);
    db.prepare(
      "UPDATE shorts SET comment_count = comment_count + 1 WHERE id = ?"
    ).run(input.shortId);
  });
  tx();
  return comment;
}

export function listFaqs(): FaqItem[] {
  const rows = getDb()
    .prepare("SELECT id, question, answers FROM faqs ORDER BY rowid")
    .all() as Array<{ id: string; question: string; answers: string }>;
  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    answers: JSON.parse(r.answers) as string[],
  }));
}

export function listChatUsers(): ChatUser[] {
  const rows = getDb()
    .prepare(
      "SELECT id, name, handle, avatar, last_message, online FROM chat_users ORDER BY rowid"
    )
    .all() as Array<{
    id: string;
    name: string;
    handle: string;
    avatar: string | null;
    last_message: string;
    online: number;
  }>;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    handle: r.handle,
    ...(r.avatar ? { avatar: r.avatar } : {}),
    lastMessage: r.last_message,
    online: Boolean(r.online),
  }));
}

export function getChatUser(userId: string): ChatUser | undefined {
  return listChatUsers().find((u) => u.id === userId);
}

export function listMessages(peerId: string): Message[] {
  const rows = getDb()
    .prepare(
      "SELECT id, peer_id, type, content, is_image, time FROM messages WHERE peer_id = ? ORDER BY rowid"
    )
    .all(peerId) as Array<{
    id: string;
    peer_id: string;
    type: "me" | "other";
    content: string;
    is_image: number;
    time: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    userId: r.peer_id,
    type: r.type,
    content: r.content,
    ...(r.is_image ? { isImage: true } : {}),
    time: r.time,
  }));
}

export function sendMessage(input: {
  peerId: string;
  content: string;
  isImage: boolean;
  time: string;
}): Message | undefined {
  const db = getDb();
  const user = db
    .prepare("SELECT id FROM chat_users WHERE id = ?")
    .get(input.peerId) as { id: string } | undefined;
  if (!user) return undefined;

  const msg: Message = {
    id: `m-${uuid().slice(0, 8)}`,
    userId: input.peerId,
    type: "me",
    content: input.content,
    ...(input.isImage ? { isImage: true } : {}),
    time: input.time,
  };

  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO messages (id, peer_id, type, content, is_image, time) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      msg.id,
      input.peerId,
      msg.type,
      msg.content,
      input.isImage ? 1 : 0,
      msg.time
    );
    db.prepare("UPDATE chat_users SET last_message = ? WHERE id = ?").run(
      input.isImage ? "(이미지)" : input.content,
      input.peerId
    );
  });
  tx();
  return msg;
}

// ---------------------------------------------------------------------------
// Longform
// ---------------------------------------------------------------------------

type LongformRow = {
  id: number;
  title: string;
  description: string;
  video_url: string;
  thumb: string | null;
  gradient: string;
  author_id: string;
  created_at: string;
  author_name: string;
};

const LONGFORM_SELECT = `
  SELECT l.id, l.title, l.description, l.video_url, l.thumb, l.gradient,
         l.author_id, l.created_at, u.name AS author_name
  FROM longform l
  JOIN users u ON u.id = l.author_id
`;

function toLongform(row: LongformRow): LongformVideo {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    videoUrl: row.video_url,
    ...(row.thumb ? { thumb: row.thumb } : {}),
    gradient: row.gradient,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

export function listLongform(): LongformVideo[] {
  const rows = getDb()
    .prepare(`${LONGFORM_SELECT} ORDER BY l.id DESC`)
    .all() as LongformRow[];
  return rows.map(toLongform);
}

export function getLongformById(id: number): LongformVideo | undefined {
  const row = getDb()
    .prepare(`${LONGFORM_SELECT} WHERE l.id = ?`)
    .get(id) as LongformRow | undefined;
  return row ? toLongform(row) : undefined;
}

export function searchLongform(q: string, limit = 20): LongformVideo[] {
  const like = `%${q.trim().toLowerCase()}%`;
  const rows = getDb()
    .prepare(
      `${LONGFORM_SELECT}
       WHERE lower(l.title) LIKE ? OR lower(l.description) LIKE ? OR lower(u.name) LIKE ?
       ORDER BY l.id DESC LIMIT ?`
    )
    .all(like, like, like, limit) as LongformRow[];
  return rows.map(toLongform);
}

export function createLongform(input: {
  title: string;
  description?: string;
  videoUrl?: string;
  thumb?: string;
  gradient?: string;
  authorId: string;
}): LongformVideo {
  const createdAt = new Date().toISOString();
  const info = getDb()
    .prepare(
      `INSERT INTO longform (title, description, video_url, thumb, gradient, author_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.title,
      input.description ?? "",
      input.videoUrl ?? "",
      input.thumb ?? null,
      input.gradient || "linear-gradient(160deg, #7c3aed, #3ea6ff)",
      input.authorId,
      createdAt
    );
  return getLongformById(Number(info.lastInsertRowid))!;
}

// ---------------------------------------------------------------------------
// Community
// ---------------------------------------------------------------------------

type CommunityRow = {
  id: number;
  title: string;
  body: string;
  author_id: string;
  created_at: string;
  author_name: string;
};

const COMMUNITY_SELECT = `
  SELECT c.id, c.title, c.body, c.author_id, c.created_at, u.name AS author_name
  FROM community_posts c
  JOIN users u ON u.id = c.author_id
`;

function toCommunity(row: CommunityRow): CommunityPost {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

export function listCommunity(): CommunityPost[] {
  const rows = getDb()
    .prepare(`${COMMUNITY_SELECT} ORDER BY c.id DESC`)
    .all() as CommunityRow[];
  return rows.map(toCommunity);
}

export function getCommunityById(id: number): CommunityPost | undefined {
  const row = getDb()
    .prepare(`${COMMUNITY_SELECT} WHERE c.id = ?`)
    .get(id) as CommunityRow | undefined;
  return row ? toCommunity(row) : undefined;
}

export function searchCommunity(q: string, limit = 20): CommunityPost[] {
  const like = `%${q.trim().toLowerCase()}%`;
  const rows = getDb()
    .prepare(
      `${COMMUNITY_SELECT}
       WHERE lower(c.title) LIKE ? OR lower(c.body) LIKE ? OR lower(u.name) LIKE ?
       ORDER BY c.id DESC LIMIT ?`
    )
    .all(like, like, like, limit) as CommunityRow[];
  return rows.map(toCommunity);
}

export function createCommunity(input: {
  title: string;
  body: string;
  authorId: string;
}): CommunityPost {
  const createdAt = new Date().toISOString();
  const info = getDb()
    .prepare(
      `INSERT INTO community_posts (title, body, author_id, created_at) VALUES (?, ?, ?, ?)`
    )
    .run(input.title, input.body, input.authorId, createdAt);
  return getCommunityById(Number(info.lastInsertRowid))!;
}

// ---------------------------------------------------------------------------
// Chatbot threads / messages
// ---------------------------------------------------------------------------

type ChatbotThreadRow = {
  id: number;
  owner_id: string;
  title: string;
  model: ChatbotThreadModel;
  created_at: string;
  updated_at: string;
};

function toChatbotThread(row: ChatbotThreadRow): ChatbotThread {
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listChatbotThreads(ownerId: string): ChatbotThread[] {
  const rows = getDb()
    .prepare(
      `SELECT id, owner_id, title, model, created_at, updated_at
       FROM chatbot_threads WHERE owner_id = ? ORDER BY updated_at DESC, id DESC`
    )
    .all(ownerId) as ChatbotThreadRow[];
  return rows.map(toChatbotThread);
}

export function getChatbotThread(
  id: number,
  ownerId: string
): ChatbotThread | undefined {
  const row = getDb()
    .prepare(
      `SELECT id, owner_id, title, model, created_at, updated_at
       FROM chatbot_threads WHERE id = ? AND owner_id = ?`
    )
    .get(id, ownerId) as ChatbotThreadRow | undefined;
  return row ? toChatbotThread(row) : undefined;
}

export function createChatbotThread(
  ownerId: string,
  input: { title?: string; model?: ChatbotThreadModel }
): ChatbotThread {
  const now = new Date().toISOString();
  const model = input.model ?? "locals";
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO chatbot_threads (owner_id, title, model, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(ownerId, "", model, now, now);
  const id = Number(info.lastInsertRowid);
  const title = input.title?.trim() || `챗봇 대화 #${String(id).padStart(3, "0")}`;
  db.prepare("UPDATE chatbot_threads SET title = ? WHERE id = ?").run(title, id);
  return getChatbotThread(id, ownerId)!;
}

export function renameChatbotThread(
  id: number,
  ownerId: string,
  title: string
): ChatbotThread | undefined {
  const db = getDb();
  const info = db
    .prepare(
      "UPDATE chatbot_threads SET title = ?, updated_at = ? WHERE id = ? AND owner_id = ?"
    )
    .run(title, new Date().toISOString(), id, ownerId);
  if (info.changes === 0) return undefined;
  return getChatbotThread(id, ownerId);
}

export function setChatbotThreadModel(
  id: number,
  ownerId: string,
  model: ChatbotThreadModel
): ChatbotThread | undefined {
  const db = getDb();
  const info = db
    .prepare(
      "UPDATE chatbot_threads SET model = ?, updated_at = ? WHERE id = ? AND owner_id = ?"
    )
    .run(model, new Date().toISOString(), id, ownerId);
  if (info.changes === 0) return undefined;
  return getChatbotThread(id, ownerId);
}

export function deleteChatbotThread(id: number, ownerId: string): boolean {
  const info = getDb()
    .prepare("DELETE FROM chatbot_threads WHERE id = ? AND owner_id = ?")
    .run(id, ownerId);
  return info.changes > 0;
}

type ChatbotMessageRow = {
  id: number;
  thread_id: number;
  role: "user" | "bot";
  content: string;
  attachments: string | null;
  created_at: string;
};

function toChatbotMessage(row: ChatbotMessageRow): ChatbotThreadMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    ...(row.attachments
      ? { attachments: JSON.parse(row.attachments) as ChatbotAttachment[] }
      : {}),
    createdAt: row.created_at,
  };
}

export function listChatbotMessages(threadId: number): ChatbotThreadMessage[] {
  const rows = getDb()
    .prepare(
      `SELECT id, thread_id, role, content, attachments, created_at
       FROM chatbot_messages WHERE thread_id = ? ORDER BY id`
    )
    .all(threadId) as ChatbotMessageRow[];
  return rows.map(toChatbotMessage);
}

export function addChatbotThreadMessage(
  threadId: number,
  ownerId: string,
  input: {
    role: "user" | "bot";
    content: string;
    attachments?: ChatbotAttachment[];
  }
): ChatbotThreadMessage | undefined {
  const db = getDb();
  const thread = getChatbotThread(threadId, ownerId);
  if (!thread) return undefined;

  const createdAt = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO chatbot_messages (thread_id, role, content, attachments, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      threadId,
      input.role,
      input.content,
      input.attachments?.length ? JSON.stringify(input.attachments) : null,
      createdAt
    );

  const autoTitle =
    input.role === "user" && thread.title.startsWith("챗봇 대화")
      ? input.content.trim().slice(0, 28) || thread.title
      : thread.title;
  db.prepare(
    "UPDATE chatbot_threads SET title = ?, updated_at = ? WHERE id = ?"
  ).run(autoTitle, createdAt, threadId);

  const row = db
    .prepare(
      `SELECT id, thread_id, role, content, attachments, created_at
       FROM chatbot_messages WHERE id = ?`
    )
    .get(Number(info.lastInsertRowid)) as ChatbotMessageRow;
  return toChatbotMessage(row);
}

// ---------------------------------------------------------------------------
// Conversations / chat lines
// ---------------------------------------------------------------------------

type ConversationRow = {
  id: number;
  owner_id: string;
  target_name: string;
  target_handle: string;
  last_message: string;
  created_at: string;
};

function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    targetName: row.target_name,
    targetHandle: row.target_handle,
    lastMessage: row.last_message,
    createdAt: row.created_at,
  };
}

export function listConversations(ownerId: string): Conversation[] {
  const rows = getDb()
    .prepare(
      `SELECT id, owner_id, target_name, target_handle, last_message, created_at
       FROM conversations WHERE owner_id = ? ORDER BY id DESC`
    )
    .all(ownerId) as ConversationRow[];
  return rows.map(toConversation);
}

export function getConversationById(
  id: number,
  ownerId: string
): Conversation | undefined {
  const row = getDb()
    .prepare(
      `SELECT id, owner_id, target_name, target_handle, last_message, created_at
       FROM conversations WHERE id = ? AND owner_id = ?`
    )
    .get(id, ownerId) as ConversationRow | undefined;
  return row ? toConversation(row) : undefined;
}

export function createConversation(
  ownerId: string,
  input: { targetName: string; targetHandle?: string }
): Conversation {
  const name = input.targetName.trim();
  const handle = (input.targetHandle ?? name).replace(/^@/, "").trim() || name;
  const createdAt = new Date().toISOString();
  const info = getDb()
    .prepare(
      `INSERT INTO conversations (owner_id, target_name, target_handle, last_message, created_at)
       VALUES (?, ?, ?, '', ?)`
    )
    .run(ownerId, name, handle, createdAt);
  return getConversationById(Number(info.lastInsertRowid), ownerId)!;
}

type ChatLineRow = {
  id: number;
  conversation_id: number;
  type: "me" | "other";
  content: string;
  is_image: number;
  created_at: string;
};

function toChatLine(row: ChatLineRow): ChatLine {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    type: row.type,
    content: row.content,
    ...(row.is_image ? { isImage: true } : {}),
    createdAt: row.created_at,
  };
}

export function listChatLines(conversationId: number): ChatLine[] {
  const rows = getDb()
    .prepare(
      `SELECT id, conversation_id, type, content, is_image, created_at
       FROM chat_lines WHERE conversation_id = ? ORDER BY id`
    )
    .all(conversationId) as ChatLineRow[];
  return rows.map(toChatLine);
}

export function addChatLine(
  conversationId: number,
  ownerId: string,
  input: { type: "me" | "other"; content: string; isImage?: boolean }
): ChatLine | undefined {
  const db = getDb();
  const conv = getConversationById(conversationId, ownerId);
  if (!conv) return undefined;

  const createdAt = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO chat_lines (conversation_id, type, content, is_image, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(conversationId, input.type, input.content, input.isImage ? 1 : 0, createdAt);

  const preview = input.isImage ? "(이미지)" : input.content.slice(0, 40);
  db.prepare("UPDATE conversations SET last_message = ? WHERE id = ?").run(
    preview,
    conversationId
  );

  const row = db
    .prepare(
      `SELECT id, conversation_id, type, content, is_image, created_at
       FROM chat_lines WHERE id = ?`
    )
    .get(Number(info.lastInsertRowid)) as ChatLineRow;
  return toChatLine(row);
}

// ---------------------------------------------------------------------------
// Support inquiries
// ---------------------------------------------------------------------------

type InquiryRow = {
  id: number;
  subject: string;
  body: string;
  owner_id: string;
  created_at: string;
  author_name: string;
};

const INQUIRY_SELECT = `
  SELECT i.id, i.subject, i.body, i.owner_id, i.created_at, u.name AS author_name
  FROM support_inquiries i
  JOIN users u ON u.id = i.owner_id
`;

function toInquiry(row: InquiryRow): SupportInquiry {
  return {
    id: row.id,
    subject: row.subject,
    body: row.body,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

export function listInquiries(ownerId: string): SupportInquiry[] {
  const rows = getDb()
    .prepare(`${INQUIRY_SELECT} WHERE i.owner_id = ? ORDER BY i.id DESC`)
    .all(ownerId) as InquiryRow[];
  return rows.map(toInquiry);
}

export function getInquiryById(
  id: number,
  ownerId: string
): SupportInquiry | undefined {
  const row = getDb()
    .prepare(`${INQUIRY_SELECT} WHERE i.id = ? AND i.owner_id = ?`)
    .get(id, ownerId) as InquiryRow | undefined;
  return row ? toInquiry(row) : undefined;
}

export function createInquiry(
  ownerId: string,
  input: { subject: string; body: string }
): SupportInquiry {
  const createdAt = new Date().toISOString();
  const info = getDb()
    .prepare(
      `INSERT INTO support_inquiries (owner_id, subject, body, created_at)
       VALUES (?, ?, ?, ?)`
    )
    .run(ownerId, input.subject, input.body, createdAt);
  return getInquiryById(Number(info.lastInsertRowid), ownerId)!;
}

// ---------------------------------------------------------------------------
// Activity notifications (longform/community/conversation/inquiry side effects)
// ---------------------------------------------------------------------------

type ActivityNotificationRow = {
  id: number;
  owner_id: string;
  category: NotificationCategory;
  message: string;
  href: string | null;
  read: number;
  created_at: string;
};

function toActivityNotification(
  row: ActivityNotificationRow
): AppNotification {
  return {
    id: row.id,
    category: row.category,
    message: row.message,
    read: Boolean(row.read),
    ...(row.href ? { href: row.href } : {}),
    createdAt: row.created_at,
  };
}

export function listActivityNotifications(
  ownerId: string,
  category?: string
): AppNotification[] {
  const rows = (
    category && category !== "all"
      ? getDb()
          .prepare(
            `SELECT id, owner_id, category, message, href, read, created_at
             FROM activity_notifications WHERE owner_id = ? AND category = ?
             ORDER BY id DESC`
          )
          .all(ownerId, category)
      : getDb()
          .prepare(
            `SELECT id, owner_id, category, message, href, read, created_at
             FROM activity_notifications WHERE owner_id = ? ORDER BY id DESC`
          )
          .all(ownerId)
  ) as ActivityNotificationRow[];
  return rows.map(toActivityNotification);
}

export function getActivityNotification(
  id: number,
  ownerId: string
): AppNotification | undefined {
  const row = getDb()
    .prepare(
      `SELECT id, owner_id, category, message, href, read, created_at
       FROM activity_notifications WHERE id = ? AND owner_id = ?`
    )
    .get(id, ownerId) as ActivityNotificationRow | undefined;
  return row ? toActivityNotification(row) : undefined;
}

/** 사용자가 알림을 받는지 여부. 행이 없으면 기본값 true. */
export function getNotificationsEnabled(userId: string): boolean {
  const row = getDb()
    .prepare("SELECT notifications_enabled FROM users WHERE id = ?")
    .get(userId) as { notifications_enabled: number } | undefined;
  return row ? Boolean(row.notifications_enabled) : true;
}

export function setNotificationsEnabled(
  userId: string,
  enabled: boolean
): boolean {
  getDb()
    .prepare("UPDATE users SET notifications_enabled = ? WHERE id = ?")
    .run(enabled ? 1 : 0, userId);
  return enabled;
}

/** 수신을 꺼 둔 사용자는 저장하지 않고 undefined 를 돌려준다. */
export function createActivityNotification(
  ownerId: string,
  input: { category: NotificationCategory; message: string; href?: string }
): AppNotification | undefined {
  if (!getNotificationsEnabled(ownerId)) return undefined;
  const createdAt = new Date().toISOString();
  const info = getDb()
    .prepare(
      `INSERT INTO activity_notifications (owner_id, category, message, href, read, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`
    )
    .run(ownerId, input.category, input.message, input.href ?? null, createdAt);
  return getActivityNotification(Number(info.lastInsertRowid), ownerId)!;
}

export function patchActivityNotification(
  id: number,
  ownerId: string,
  read?: boolean
): AppNotification | undefined {
  const db = getDb();
  if (typeof read === "boolean") {
    const info = db
      .prepare(
        "UPDATE activity_notifications SET read = ? WHERE id = ? AND owner_id = ?"
      )
      .run(read ? 1 : 0, id, ownerId);
    if (info.changes === 0) return undefined;
  }
  return getActivityNotification(id, ownerId);
}

export function deleteActivityNotification(
  id: number,
  ownerId: string
): AppNotification | undefined {
  const existing = getActivityNotification(id, ownerId);
  if (!existing) return undefined;
  getDb()
    .prepare("DELETE FROM activity_notifications WHERE id = ? AND owner_id = ?")
    .run(id, ownerId);
  return existing;
}

export function markAllActivityNotificationsRead(ownerId: string): number {
  const info = getDb()
    .prepare(
      "UPDATE activity_notifications SET read = 1 WHERE owner_id = ? AND read = 0"
    )
    .run(ownerId);
  return info.changes;
}

export function deleteAllActivityNotifications(ownerId: string): number {
  const info = getDb()
    .prepare("DELETE FROM activity_notifications WHERE owner_id = ?")
    .run(ownerId);
  return info.changes;
}
