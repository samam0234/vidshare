import { v4 as uuid } from "uuid";
import { getDb } from "../db/client";
import type {
  Author,
  ChatUser,
  Comment,
  FaqItem,
  Message,
  Notification,
  NotificationCategory,
  Short,
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
    s.views, s.video_url, s.gradient, s.created_at,
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
  authorId: string;
}): Short {
  const author = findAuthor(input.authorId);
  if (!author) throw new Error("작성자를 찾을 수 없습니다.");

  const id = `s-${uuid().slice(0, 8)}`;
  const createdAt = new Date().toISOString().slice(0, 10);
  const gradient =
    input.gradient || "linear-gradient(160deg, #7c3aed, #3ea6ff)";
  const description = input.description ?? "";
  const videoUrl = input.videoUrl;

  getDb()
    .prepare(
      `INSERT INTO shorts
        (id, title, description, author_id, likes, comment_count, views, video_url, gradient, created_at)
       VALUES (?, ?, ?, ?, 0, 0, '0', ?, ?, ?)`
    )
    .run(id, input.title, description, author.id, videoUrl ?? null, gradient, createdAt);

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

export function listNotifications(category?: string): Notification[] {
  const rows = (
    category && category !== "all"
      ? getDb()
          .prepare(
            "SELECT id, category, message, read, icon FROM notifications WHERE category = ? ORDER BY rowid"
          )
          .all(category)
      : getDb()
          .prepare(
            "SELECT id, category, message, read, icon FROM notifications ORDER BY rowid"
          )
          .all()
  ) as Array<{
    id: string;
    category: NotificationCategory;
    message: string;
    read: number;
    icon: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    message: r.message,
    read: Boolean(r.read),
    icon: r.icon,
  }));
}

export function deleteNotification(id: string): Notification | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT id, category, message, read, icon FROM notifications WHERE id = ?")
    .get(id) as
    | {
        id: string;
        category: NotificationCategory;
        message: string;
        read: number;
        icon: string;
      }
    | undefined;
  if (!row) return undefined;
  db.prepare("DELETE FROM notifications WHERE id = ?").run(id);
  return {
    id: row.id,
    category: row.category,
    message: row.message,
    read: Boolean(row.read),
    icon: row.icon,
  };
}

export function patchNotification(
  id: string,
  read?: boolean
): Notification | undefined {
  const db = getDb();
  if (typeof read === "boolean") {
    const info = db
      .prepare("UPDATE notifications SET read = ? WHERE id = ?")
      .run(read ? 1 : 0, id);
    if (info.changes === 0) return undefined;
  }
  const row = db
    .prepare("SELECT id, category, message, read, icon FROM notifications WHERE id = ?")
    .get(id) as
    | {
        id: string;
        category: NotificationCategory;
        message: string;
        read: number;
        icon: string;
      }
    | undefined;
  if (!row) return undefined;
  return {
    id: row.id,
    category: row.category,
    message: row.message,
    read: Boolean(row.read),
    icon: row.icon,
  };
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
