import { v4 as uuid } from "uuid";
import { getDb, withTx } from "../db/client";
import { publishNotification } from "../realtime/notificationBus";
import { publishChatLine } from "../realtime/chatBus";
import { deleteStoredUpload } from "../upload/files";
import type {
  AdminReport,
  AdminStats,
  AdminUser,
  Author,
  ReportStatus,
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
  ShortVisibility,
  SupportInquiry,
  UserRole,
} from "../types";

type UserRow = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  avatar: string | null;
  role: string;
};

function toRole(raw: string): UserRole {
  return raw === "admin" ? "admin" : "user";
}

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
  visibility: string;
  comments_enabled: number;
  handle: string;
  author_name: string;
  author_bio: string;
  author_avatar: string | null;
  author_role: string;
};

const SHORT_SELECT = `
  SELECT
    s.id, s.title, s.description, s.author_id, s.likes, s.comment_count,
    s.views, s.video_url, s.thumb, s.gradient, s.created_at,
    s.visibility, s.comments_enabled,
    u.handle, u.name AS author_name, u.bio AS author_bio,
    u.avatar AS author_avatar, u.role AS author_role
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
    role: toRole(row.role),
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
      role: toRole(row.author_role),
    },
    likes: row.likes,
    comments: row.comment_count,
    views: row.views,
    gradient: row.gradient,
    createdAt: row.created_at,
    visibility: row.visibility === "private" ? "private" : "public",
    commentsEnabled: Boolean(row.comments_enabled),
    ...(row.video_url ? { videoUrl: row.video_url } : {}),
    ...(row.thumb ? { thumb: row.thumb } : {}),
  };
}

/** 비공개 쇼츠는 작성자 본인에게만 보인다. */
function visibleClause(viewerId?: string): { sql: string; params: string[] } {
  return viewerId
    ? { sql: "(s.visibility = 'public' OR s.author_id = ?)", params: [viewerId] }
    : { sql: "s.visibility = 'public'", params: [] };
}

/** 내가 "비추천"한 쇼츠는 내 추천 피드에서 뺀다. */
const NOT_DISLIKED_CLAUSE =
  "s.id NOT IN (SELECT short_id FROM short_dislikes WHERE user_id = ?)";

export async function listAuthors(): Promise<Author[]> {
  const rows = await getDb().all<UserRow>(
    "SELECT id, handle, name, bio, avatar, role FROM users ORDER BY created_at, id"
  );
  return rows.map(toAuthor);
}

export async function findAuthor(idOrHandle: string): Promise<Author | undefined> {
  const key = idOrHandle.replace(/^@/, "").trim();
  const row = await getDb().get<UserRow>(
    `SELECT id, handle, name, bio, avatar, role FROM users
     WHERE id = ? OR lower(handle) = lower(?)`,
    key,
    key
  );
  return row ? toAuthor(row) : undefined;
}

export async function searchAuthors(q: string, limit = 20): Promise<Author[]> {
  const like = `%${q.trim().toLowerCase().replace(/^@/, "")}%`;
  const rows = await getDb().all<UserRow>(
    `SELECT id, handle, name, bio, avatar, role FROM users
     WHERE lower(handle) LIKE ? OR lower(name) LIKE ?
     ORDER BY created_at, id LIMIT ?`,
    like,
    like,
    limit
  );
  return rows.map(toAuthor);
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const row = await getDb().get<{ x: number }>(
    "SELECT 1 AS x FROM user_follows WHERE follower_id = ? AND following_id = ?",
    followerId,
    followingId
  );
  return Boolean(row);
}

export async function countFollowers(userId: string): Promise<number> {
  const row = await getDb().get<{ c: number }>(
    "SELECT COUNT(*) AS c FROM user_follows WHERE following_id = ?",
    userId
  );
  return row?.c ?? 0;
}

export async function countFollowing(userId: string): Promise<number> {
  const row = await getDb().get<{ c: number }>(
    "SELECT COUNT(*) AS c FROM user_follows WHERE follower_id = ?",
    userId
  );
  return row?.c ?? 0;
}

/** 이미 팔로우 중이면 아무것도 하지 않는다(멱등). */
export async function followUser(followerId: string, followingId: string): Promise<boolean> {
  await getDb().run(
    `INSERT INTO user_follows (follower_id, following_id, created_at)
     VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
    followerId,
    followingId,
    new Date().toISOString()
  );
  return true;
}

export async function unfollowUser(followerId: string, followingId: string): Promise<boolean> {
  await getDb().run(
    "DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?",
    followerId,
    followingId
  );
  return true;
}

export async function listFollowers(userId: string): Promise<Author[]> {
  const rows = await getDb().all<UserRow>(
    `SELECT u.id, u.handle, u.name, u.bio, u.avatar, u.role
     FROM user_follows f JOIN users u ON u.id = f.follower_id
     WHERE f.following_id = ? ORDER BY f.created_at DESC`,
    userId
  );
  return rows.map(toAuthor);
}

export async function listFollowing(userId: string): Promise<Author[]> {
  const rows = await getDb().all<UserRow>(
    `SELECT u.id, u.handle, u.name, u.bio, u.avatar, u.role
     FROM user_follows f JOIN users u ON u.id = f.following_id
     WHERE f.follower_id = ? ORDER BY f.created_at DESC`,
    userId
  );
  return rows.map(toAuthor);
}

/** 내가 팔로우한 사람들의 쇼츠 (팔로잉 피드) */
export async function listFollowingShorts(userId: string, limit = 50): Promise<Short[]> {
  const rows = await getDb().all<ShortJoinRow>(
    `${SHORT_SELECT}
     WHERE s.author_id IN (
       SELECT following_id FROM user_follows WHERE follower_id = ?
     )
     AND s.visibility = 'public'
     AND ${NOT_DISLIKED_CLAUSE}
     ORDER BY s.created_at DESC, s.id DESC LIMIT ?`,
    userId,
    userId,
    limit
  );
  return rows.map(toShort);
}

// ---------------------------------------------------------------------------
// Blocks & Reports
// ---------------------------------------------------------------------------

export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const row = await getDb().get<{ x: number }>(
    "SELECT 1 AS x FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?",
    blockerId,
    blockedId
  );
  return Boolean(row);
}

/** 서로 차단 관계인지 (양방향). 팔로우 요청 차단에 쓴다. */
export async function isBlockedEitherWay(aId: string, bId: string): Promise<boolean> {
  return (await isBlocked(aId, bId)) || (await isBlocked(bId, aId));
}

/** 차단하면 서로의 팔로우 관계도 함께 끊는다. */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  await withTx(async (tx) => {
    await tx.run(
      `INSERT INTO user_blocks (blocker_id, blocked_id, created_at)
       VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
      blockerId,
      blockedId,
      new Date().toISOString()
    );
    await tx.run(
      "DELETE FROM user_follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)",
      blockerId,
      blockedId,
      blockedId,
      blockerId
    );
  });
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await getDb().run(
    "DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?",
    blockerId,
    blockedId
  );
}

export async function listBlockedUsers(blockerId: string): Promise<Author[]> {
  const rows = await getDb().all<UserRow>(
    `SELECT u.id, u.handle, u.name, u.bio, u.avatar, u.role
     FROM user_blocks b JOIN users u ON u.id = b.blocked_id
     WHERE b.blocker_id = ? ORDER BY b.created_at DESC`,
    blockerId
  );
  return rows.map(toAuthor);
}

const REPORT_TARGET_TYPES = ["short", "comment", "community", "user"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export function isReportTargetType(v: unknown): v is ReportTargetType {
  return (
    typeof v === "string" &&
    (REPORT_TARGET_TYPES as readonly string[]).includes(v)
  );
}

export async function createReport(input: {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}): Promise<{ id: number }> {
  const info = await getDb().run<{ id: number }>(
    `INSERT INTO reports (reporter_id, target_type, target_id, reason, created_at)
     VALUES (?, ?, ?, ?, ?) RETURNING id`,
    input.reporterId,
    input.targetType,
    input.targetId,
    input.reason,
    new Date().toISOString()
  );
  return { id: info.rows[0].id };
}

// ---------------------------------------------------------------------------
// Playlists
// ---------------------------------------------------------------------------

export type Playlist = {
  id: number;
  ownerId: string;
  title: string;
  createdAt: string;
  itemCount: number;
};

type PlaylistRow = {
  id: number;
  owner_id: string;
  title: string;
  created_at: string;
  item_count: number;
};

function toPlaylist(row: PlaylistRow): Playlist {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    createdAt: row.created_at,
    itemCount: row.item_count,
  };
}

const PLAYLIST_SELECT = `
  SELECT p.id, p.owner_id, p.title, p.created_at,
         (SELECT COUNT(*) FROM playlist_items i WHERE i.playlist_id = p.id) AS item_count
  FROM playlists p
`;

export async function listPlaylistsByOwner(ownerId: string): Promise<Playlist[]> {
  const rows = await getDb().all<PlaylistRow>(
    `${PLAYLIST_SELECT} WHERE p.owner_id = ? ORDER BY p.id DESC`,
    ownerId
  );
  return rows.map(toPlaylist);
}

export async function getPlaylistById(id: number): Promise<Playlist | undefined> {
  const row = await getDb().get<PlaylistRow>(`${PLAYLIST_SELECT} WHERE p.id = ?`, id);
  return row ? toPlaylist(row) : undefined;
}

export async function createPlaylist(ownerId: string, title: string): Promise<Playlist> {
  const info = await getDb().run<{ id: number }>(
    "INSERT INTO playlists (owner_id, title, created_at) VALUES (?, ?, ?) RETURNING id",
    ownerId,
    title,
    new Date().toISOString()
  );
  return (await getPlaylistById(info.rows[0].id))!;
}

/** 본인 재생목록만 삭제 가능. */
export async function deletePlaylist(id: number, ownerId: string): Promise<boolean> {
  const info = await getDb().run(
    "DELETE FROM playlists WHERE id = ? AND owner_id = ?",
    id,
    ownerId
  );
  return info.changes > 0;
}

export async function listPlaylistItems(playlistId: number, viewerId?: string): Promise<Short[]> {
  const visible = visibleClause(viewerId);
  const rows = await getDb().all<ShortJoinRow>(
    `${SHORT_SELECT}
     JOIN playlist_items pi ON pi.short_id = s.id
     WHERE pi.playlist_id = ? AND ${visible.sql}
     ORDER BY pi.added_at DESC`,
    playlistId,
    ...visible.params
  );
  return rows.map(toShort);
}

/** 본인 재생목록에만 추가 가능. 이미 있으면 조용히 무시(멱등). */
export async function addPlaylistItem(
  playlistId: number,
  ownerId: string,
  shortId: string
): Promise<boolean> {
  const db = getDb();
  const playlist = await db.get(
    "SELECT id FROM playlists WHERE id = ? AND owner_id = ?",
    playlistId,
    ownerId
  );
  if (!playlist) return false;
  // 남의 비공개 쇼츠는 담을 수 없다 (없는 것과 같게 취급)
  const short = await db.get(
    "SELECT id FROM shorts WHERE id = ? AND (visibility = 'public' OR author_id = ?)",
    shortId,
    ownerId
  );
  if (!short) return false;

  await db.run(
    `INSERT INTO playlist_items (playlist_id, short_id, added_at)
     VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
    playlistId,
    shortId,
    new Date().toISOString()
  );
  return true;
}

export async function removePlaylistItem(
  playlistId: number,
  ownerId: string,
  shortId: string
): Promise<boolean> {
  const db = getDb();
  const playlist = await db.get(
    "SELECT id FROM playlists WHERE id = ? AND owner_id = ?",
    playlistId,
    ownerId
  );
  if (!playlist) return false;
  await db.run(
    "DELETE FROM playlist_items WHERE playlist_id = ? AND short_id = ?",
    playlistId,
    shortId
  );
  return true;
}

export type ListShortsOptions = {
  /** 로그인한 시청자가 "비추천"한 영상을 뺀다. 추천 피드에서만 켜고 검색에서는 끈다. */
  excludeDisliked?: boolean;
};

/**
 * 쇼츠 목록. 비공개는 작성자 본인에게만 보이고, 로그인한 경우 내가 차단한 유저의 영상은 제외된다.
 */
export async function listShorts(
  q?: string,
  viewerId?: string,
  options: ListShortsOptions = {}
): Promise<Short[]> {
  const query = q?.trim().toLowerCase() ?? "";
  const visible = visibleClause(viewerId);
  const clauses: string[] = [visible.sql];
  const params: (string | number)[] = [...visible.params];

  if (query) {
    const like = `%${query}%`;
    clauses.push("(lower(s.title) LIKE ? OR lower(u.handle) LIKE ? OR lower(s.description) LIKE ?)");
    params.push(like, like, like);
  }
  if (viewerId) {
    clauses.push("s.author_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)");
    params.push(viewerId);
    if (options.excludeDisliked) {
      clauses.push(NOT_DISLIKED_CLAUSE);
      params.push(viewerId);
    }
  }

  const rows = await getDb().all<ShortJoinRow>(
    `${SHORT_SELECT} WHERE ${clauses.join(" AND ")} ORDER BY s.created_at DESC, s.id DESC`,
    ...params
  );
  return rows.map(toShort);
}

/** 공개 범위를 따져 한 편을 돌려준다. 남의 비공개 쇼츠는 없는 것처럼 undefined. */
export async function getShort(id: string, viewerId?: string): Promise<Short | undefined> {
  const short = await getShortAny(id);
  if (!short) return undefined;
  if (short.visibility === "private" && short.author.id !== viewerId) return undefined;
  return short;
}

/** 공개 범위를 따지지 않는다. 소유권을 이미 확인한 호출(수정·삭제·생성)과 관리자용. */
async function getShortAny(id: string): Promise<Short | undefined> {
  const row = await getDb().get<ShortJoinRow>(`${SHORT_SELECT} WHERE s.id = ?`, id);
  return row ? toShort(row) : undefined;
}

export async function listShortsByAuthor(authorId: string, viewerId?: string): Promise<Short[]> {
  const visible = visibleClause(viewerId);
  const rows = await getDb().all<ShortJoinRow>(
    `${SHORT_SELECT} WHERE s.author_id = ? AND ${visible.sql} ORDER BY s.created_at DESC, s.id DESC`,
    authorId,
    ...visible.params
  );
  return rows.map(toShort);
}

export async function createShort(input: {
  title: string;
  description?: string;
  gradient?: string;
  videoUrl?: string;
  thumb?: string;
  authorId: string;
}): Promise<Short> {
  const author = await findAuthor(input.authorId);
  if (!author) throw new Error("작성자를 찾을 수 없습니다.");

  const id = `s-${uuid().slice(0, 8)}`;
  const createdAt = new Date().toISOString().slice(0, 10);
  const gradient =
    input.gradient || "linear-gradient(160deg, #7c3aed, #3ea6ff)";
  const description = input.description ?? "";

  await getDb().run(
    `INSERT INTO shorts
      (id, title, description, author_id, likes, comment_count, views, video_url, thumb, gradient, created_at)
     VALUES (?, ?, ?, ?, 0, 0, '0', ?, ?, ?, ?)`,
    id,
    input.title,
    description,
    author.id,
    input.videoUrl ?? null,
    input.thumb ?? null,
    gradient,
    createdAt
  );

  return (await getShortAny(id))!;
}

/** 댓글·좋아요가 공개 범위와 댓글 허용을 확인할 때 쓴다. */
export async function getShortAccess(
  id: string
): Promise<{ authorId: string; visibility: ShortVisibility; commentsEnabled: boolean } | undefined> {
  const row = await getDb().get<{ author_id: string; visibility: string; comments_enabled: number }>(
    "SELECT author_id, visibility, comments_enabled FROM shorts WHERE id = ?",
    id
  );
  if (!row) return undefined;
  return {
    authorId: row.author_id,
    visibility: row.visibility === "private" ? "private" : "public",
    commentsEnabled: Boolean(row.comments_enabled),
  };
}

export type ShortPatch = {
  title?: string;
  description?: string;
  /** 문자열이면 교체, null 이면 썸네일을 지우고 그라데이션으로 돌린다 */
  thumb?: string | null;
  visibility?: ShortVisibility;
  commentsEnabled?: boolean;
};

export type OwnerResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "not_found" | "forbidden" };

/** 작성자 본인만 고칠 수 있다. 바뀐 썸네일의 옛 파일은 다른 곳이 안 쓰면 지운다. */
export async function updateShort(
  id: string,
  ownerId: string,
  patch: ShortPatch
): Promise<OwnerResult<Short>> {
  const db = getDb();
  const current = await db.get<{ author_id: string; thumb: string | null }>(
    "SELECT author_id, thumb FROM shorts WHERE id = ?",
    id
  );
  if (!current) return { ok: false, reason: "not_found" };
  if (current.author_id !== ownerId) return { ok: false, reason: "forbidden" };

  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (patch.title !== undefined) {
    sets.push("title = ?");
    params.push(patch.title);
  }
  if (patch.description !== undefined) {
    sets.push("description = ?");
    params.push(patch.description);
  }
  if (patch.thumb !== undefined) {
    sets.push("thumb = ?");
    params.push(patch.thumb);
  }
  if (patch.visibility !== undefined) {
    sets.push("visibility = ?");
    params.push(patch.visibility);
  }
  if (patch.commentsEnabled !== undefined) {
    sets.push("comments_enabled = ?");
    params.push(patch.commentsEnabled ? 1 : 0);
  }
  if (sets.length) {
    await db.run(`UPDATE shorts SET ${sets.join(", ")} WHERE id = ? AND author_id = ?`, ...params, id, ownerId);
  }

  if (patch.thumb !== undefined && current.thumb && current.thumb !== patch.thumb) {
    await removeUploadIfUnreferenced(current.thumb);
  }
  return { ok: true, value: (await getShortAny(id))! };
}

/** 작성자 본인만 지울 수 있다. 댓글·재생목록 항목·비추천은 FK CASCADE 로 함께 사라진다. */
export async function deleteShort(id: string, ownerId: string): Promise<OwnerResult<true>> {
  const db = getDb();
  const row = await db.get<{ author_id: string; video_url: string | null; thumb: string | null }>(
    "SELECT author_id, video_url, thumb FROM shorts WHERE id = ?",
    id
  );
  if (!row) return { ok: false, reason: "not_found" };
  if (row.author_id !== ownerId) return { ok: false, reason: "forbidden" };

  await db.run("DELETE FROM shorts WHERE id = ? AND author_id = ?", id, ownerId);
  await removeUploadIfUnreferenced(row.video_url);
  await removeUploadIfUnreferenced(row.thumb);
  return { ok: true, value: true };
}

/**
 * 서버에 올린 파일(/uploads/<uuid>.<ext>)을 다른 쇼츠·롱폼이 안 쓰면 디스크에서 지운다.
 * 외부 URL 이나 다른 경로는 건드리지 않는다. 실패해도 삭제 자체를 막지 않는다.
 */
async function removeUploadIfUnreferenced(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    const used = await getDb().get(
      `SELECT 1 AS x FROM shorts WHERE video_url = ? OR thumb = ?
       UNION ALL
       SELECT 1 AS x FROM longform WHERE video_url = ? OR thumb = ?
       LIMIT 1`,
      url,
      url,
      url,
      url
    );
    if (used) return;
    await deleteStoredUpload(url);
  } catch (err) {
    console.error("업로드 파일 정리 실패:", err);
  }
}

/** 로그인한 시청자의 "비추천". 그 유저의 추천 피드에서만 빠지고 영상 자체는 그대로다. */
export async function dislikeShort(userId: string, shortId: string): Promise<void> {
  await getDb().run(
    `INSERT INTO short_dislikes (user_id, short_id, created_at)
     VALUES (?, ?, ?) ON CONFLICT DO NOTHING`,
    userId,
    shortId,
    new Date().toISOString()
  );
}

export async function undislikeShort(userId: string, shortId: string): Promise<void> {
  await getDb().run(
    "DELETE FROM short_dislikes WHERE user_id = ? AND short_id = ?",
    userId,
    shortId
  );
}

export async function likeShort(id: string, unlike: boolean) {
  const db = getDb();
  const row = await db.get<{ likes: number }>("SELECT likes FROM shorts WHERE id = ?", id);
  if (!row) return undefined;
  const likes = unlike ? Math.max(0, row.likes - 1) : row.likes + 1;
  await db.run("UPDATE shorts SET likes = ? WHERE id = ?", likes, id);
  return { id, likes };
}

type CommentRow = {
  id: string;
  short_id: string;
  author: string;
  text: string;
  time: string;
  parent_id: string | null;
  author_id: string | null;
};

function toComment(r: CommentRow): Comment {
  return {
    id: r.id,
    shortId: r.short_id,
    author: r.author,
    text: r.text,
    time: r.time,
    ...(r.parent_id ? { parentId: r.parent_id } : {}),
    ...(r.author_id ? { authorId: r.author_id } : {}),
  };
}

export async function listComments(shortId: string): Promise<Comment[]> {
  const rows = await getDb().all<CommentRow>(
    "SELECT id, short_id, author, text, time, parent_id, author_id FROM comments WHERE short_id = ? ORDER BY seq",
    shortId
  );
  return rows.map(toComment);
}

export async function addComment(input: {
  shortId: string;
  text: string;
  author: string;
  authorId?: string;
  parentId?: string;
}): Promise<Comment | undefined> {
  const db = getDb();
  const short = await db.get<{ id: string }>(
    "SELECT id FROM shorts WHERE id = ?",
    input.shortId
  );
  if (!short) return undefined;

  let parentId: string | undefined;
  if (input.parentId) {
    const parent = await db.get<{ id: string; short_id: string; parent_id: string | null }>(
      "SELECT id, short_id, parent_id FROM comments WHERE id = ?",
      input.parentId
    );
    if (!parent || parent.short_id !== input.shortId) return undefined;
    // 1단계까지만 허용. 대대댓글은 최상위 부모에 붙인다.
    parentId = parent.parent_id ?? parent.id;
  }

  const comment: Comment = {
    id: `c-${uuid().slice(0, 8)}`,
    shortId: input.shortId,
    author: input.author,
    text: input.text,
    time: "방금 전",
    ...(parentId ? { parentId } : {}),
    ...(input.authorId ? { authorId: input.authorId } : {}),
  };

  await withTx(async (tx) => {
    await tx.run(
      "INSERT INTO comments (id, short_id, author, text, time, parent_id, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      comment.id,
      comment.shortId,
      comment.author,
      comment.text,
      comment.time,
      parentId ?? null,
      input.authorId ?? null
    );
    await tx.run(
      "UPDATE shorts SET comment_count = comment_count + 1 WHERE id = ?",
      input.shortId
    );
  });
  return comment;
}

/** 본인 댓글만 수정할 수 있다. 있는지/소유인지를 구분하지 않고 undefined 로 통일. */
export async function updateComment(
  id: string,
  userId: string,
  text: string
): Promise<Comment | undefined> {
  const db = getDb();
  const row = await db.get<{ author_id: string | null }>(
    "SELECT author_id FROM comments WHERE id = ?",
    id
  );
  if (!row || row.author_id !== userId) return undefined;

  const updated = await db.run<CommentRow>(
    `UPDATE comments SET text = ? WHERE id = ?
     RETURNING id, short_id, author, text, time, parent_id, author_id`,
    text,
    id
  );
  return toComment(updated.rows[0]);
}

/**
 * 소유권 확인 없이 댓글을 지운다. 답글이 있으면 함께 지우고 그 개수만큼
 * comment_count 를 줄인다. 소유권 검사는 호출자가 한다
 * (`deleteComment` = 본인 확인, `adminDeleteComment` = 관리자 권한).
 */
async function deleteCommentRow(id: string, shortId: string) {
  await withTx(async (tx) => {
    const replies = await tx.get<{ c: number }>(
      "SELECT COUNT(*) AS c FROM comments WHERE parent_id = ?",
      id
    );
    await tx.run("DELETE FROM comments WHERE parent_id = ?", id);
    await tx.run("DELETE FROM comments WHERE id = ?", id);
    await tx.run(
      "UPDATE shorts SET comment_count = GREATEST(0, comment_count - ?) WHERE id = ?",
      1 + (replies?.c ?? 0),
      shortId
    );
  });
}

/** 본인 댓글만 삭제. */
export async function deleteComment(id: string, userId: string): Promise<boolean> {
  const row = await getDb().get<{ short_id: string; author_id: string | null }>(
    "SELECT short_id, author_id FROM comments WHERE id = ?",
    id
  );
  if (!row || row.author_id !== userId) return false;
  await deleteCommentRow(id, row.short_id);
  return true;
}

export async function listFaqs(): Promise<FaqItem[]> {
  const rows = await getDb().all<{ id: string; question: string; answers: string }>(
    "SELECT id, question, answers FROM faqs ORDER BY seq"
  );
  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    answers: JSON.parse(r.answers) as string[],
  }));
}

export async function listChatUsers(): Promise<ChatUser[]> {
  const rows = await getDb().all<{
    id: string;
    name: string;
    handle: string;
    avatar: string | null;
    last_message: string;
    online: number;
  }>("SELECT id, name, handle, avatar, last_message, online FROM chat_users ORDER BY seq");
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    handle: r.handle,
    ...(r.avatar ? { avatar: r.avatar } : {}),
    lastMessage: r.last_message,
    online: Boolean(r.online),
  }));
}

export async function getChatUser(userId: string): Promise<ChatUser | undefined> {
  return (await listChatUsers()).find((u) => u.id === userId);
}

export async function listMessages(peerId: string): Promise<Message[]> {
  const rows = await getDb().all<{
    id: string;
    peer_id: string;
    type: "me" | "other";
    content: string;
    is_image: number;
    time: string;
  }>(
    "SELECT id, peer_id, type, content, is_image, time FROM messages WHERE peer_id = ? ORDER BY seq",
    peerId
  );
  return rows.map((r) => ({
    id: r.id,
    userId: r.peer_id,
    type: r.type,
    content: r.content,
    ...(r.is_image ? { isImage: true } : {}),
    time: r.time,
  }));
}

export async function sendMessage(input: {
  peerId: string;
  content: string;
  isImage: boolean;
  time: string;
}): Promise<Message | undefined> {
  const user = await getDb().get<{ id: string }>(
    "SELECT id FROM chat_users WHERE id = ?",
    input.peerId
  );
  if (!user) return undefined;

  const msg: Message = {
    id: `m-${uuid().slice(0, 8)}`,
    userId: input.peerId,
    type: "me",
    content: input.content,
    ...(input.isImage ? { isImage: true } : {}),
    time: input.time,
  };

  await withTx(async (tx) => {
    await tx.run(
      "INSERT INTO messages (id, peer_id, type, content, is_image, time) VALUES (?, ?, ?, ?, ?, ?)",
      msg.id,
      input.peerId,
      msg.type,
      msg.content,
      input.isImage ? 1 : 0,
      msg.time
    );
    await tx.run(
      "UPDATE chat_users SET last_message = ? WHERE id = ?",
      input.isImage ? "(이미지)" : input.content,
      input.peerId
    );
  });
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

export async function listLongform(): Promise<LongformVideo[]> {
  const rows = await getDb().all<LongformRow>(`${LONGFORM_SELECT} ORDER BY l.id DESC`);
  return rows.map(toLongform);
}

export async function getLongformById(id: number): Promise<LongformVideo | undefined> {
  const row = await getDb().get<LongformRow>(`${LONGFORM_SELECT} WHERE l.id = ?`, id);
  return row ? toLongform(row) : undefined;
}

export async function searchLongform(q: string, limit = 20): Promise<LongformVideo[]> {
  const like = `%${q.trim().toLowerCase()}%`;
  const rows = await getDb().all<LongformRow>(
    `${LONGFORM_SELECT}
     WHERE lower(l.title) LIKE ? OR lower(l.description) LIKE ? OR lower(u.name) LIKE ?
     ORDER BY l.id DESC LIMIT ?`,
    like,
    like,
    like,
    limit
  );
  return rows.map(toLongform);
}

export async function createLongform(input: {
  title: string;
  description?: string;
  videoUrl?: string;
  thumb?: string;
  gradient?: string;
  authorId: string;
}): Promise<LongformVideo> {
  const createdAt = new Date().toISOString();
  const info = await getDb().run<{ id: number }>(
    `INSERT INTO longform (title, description, video_url, thumb, gradient, author_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    input.title,
    input.description ?? "",
    input.videoUrl ?? "",
    input.thumb ?? null,
    input.gradient || "linear-gradient(160deg, #7c3aed, #3ea6ff)",
    input.authorId,
    createdAt
  );
  return (await getLongformById(info.rows[0].id))!;
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

export async function listCommunity(): Promise<CommunityPost[]> {
  const rows = await getDb().all<CommunityRow>(`${COMMUNITY_SELECT} ORDER BY c.id DESC`);
  return rows.map(toCommunity);
}

export async function getCommunityById(id: number): Promise<CommunityPost | undefined> {
  const row = await getDb().get<CommunityRow>(`${COMMUNITY_SELECT} WHERE c.id = ?`, id);
  return row ? toCommunity(row) : undefined;
}

export async function searchCommunity(q: string, limit = 20): Promise<CommunityPost[]> {
  const like = `%${q.trim().toLowerCase()}%`;
  const rows = await getDb().all<CommunityRow>(
    `${COMMUNITY_SELECT}
     WHERE lower(c.title) LIKE ? OR lower(c.body) LIKE ? OR lower(u.name) LIKE ?
     ORDER BY c.id DESC LIMIT ?`,
    like,
    like,
    like,
    limit
  );
  return rows.map(toCommunity);
}

export async function createCommunity(input: {
  title: string;
  body: string;
  authorId: string;
}): Promise<CommunityPost> {
  const createdAt = new Date().toISOString();
  const info = await getDb().run<{ id: number }>(
    `INSERT INTO community_posts (title, body, author_id, created_at)
     VALUES (?, ?, ?, ?) RETURNING id`,
    input.title,
    input.body,
    input.authorId,
    createdAt
  );
  return (await getCommunityById(info.rows[0].id))!;
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

export async function listChatbotThreads(ownerId: string): Promise<ChatbotThread[]> {
  const rows = await getDb().all<ChatbotThreadRow>(
    `SELECT id, owner_id, title, model, created_at, updated_at
     FROM chatbot_threads WHERE owner_id = ? ORDER BY updated_at DESC, id DESC`,
    ownerId
  );
  return rows.map(toChatbotThread);
}

export async function getChatbotThread(
  id: number,
  ownerId: string
): Promise<ChatbotThread | undefined> {
  const row = await getDb().get<ChatbotThreadRow>(
    `SELECT id, owner_id, title, model, created_at, updated_at
     FROM chatbot_threads WHERE id = ? AND owner_id = ?`,
    id,
    ownerId
  );
  return row ? toChatbotThread(row) : undefined;
}

export async function createChatbotThread(
  ownerId: string,
  input: { title?: string; model?: ChatbotThreadModel }
): Promise<ChatbotThread> {
  const now = new Date().toISOString();
  const model = input.model ?? "locals";
  const db = getDb();
  const info = await db.run<{ id: number }>(
    `INSERT INTO chatbot_threads (owner_id, title, model, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?) RETURNING id`,
    ownerId,
    "",
    model,
    now,
    now
  );
  const id = info.rows[0].id;
  const title = input.title?.trim() || `챗봇 대화 #${String(id).padStart(3, "0")}`;
  await db.run("UPDATE chatbot_threads SET title = ? WHERE id = ?", title, id);
  return (await getChatbotThread(id, ownerId))!;
}

export async function renameChatbotThread(
  id: number,
  ownerId: string,
  title: string
): Promise<ChatbotThread | undefined> {
  const info = await getDb().run(
    "UPDATE chatbot_threads SET title = ?, updated_at = ? WHERE id = ? AND owner_id = ?",
    title,
    new Date().toISOString(),
    id,
    ownerId
  );
  if (info.changes === 0) return undefined;
  return getChatbotThread(id, ownerId);
}

export async function setChatbotThreadModel(
  id: number,
  ownerId: string,
  model: ChatbotThreadModel
): Promise<ChatbotThread | undefined> {
  const info = await getDb().run(
    "UPDATE chatbot_threads SET model = ?, updated_at = ? WHERE id = ? AND owner_id = ?",
    model,
    new Date().toISOString(),
    id,
    ownerId
  );
  if (info.changes === 0) return undefined;
  return getChatbotThread(id, ownerId);
}

export async function deleteChatbotThread(id: number, ownerId: string): Promise<boolean> {
  const info = await getDb().run(
    "DELETE FROM chatbot_threads WHERE id = ? AND owner_id = ?",
    id,
    ownerId
  );
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

export async function listChatbotMessages(threadId: number): Promise<ChatbotThreadMessage[]> {
  const rows = await getDb().all<ChatbotMessageRow>(
    `SELECT id, thread_id, role, content, attachments, created_at
     FROM chatbot_messages WHERE thread_id = ? ORDER BY id`,
    threadId
  );
  return rows.map(toChatbotMessage);
}

export async function addChatbotThreadMessage(
  threadId: number,
  ownerId: string,
  input: {
    role: "user" | "bot";
    content: string;
    attachments?: ChatbotAttachment[];
  }
): Promise<ChatbotThreadMessage | undefined> {
  const db = getDb();
  const thread = await getChatbotThread(threadId, ownerId);
  if (!thread) return undefined;

  const createdAt = new Date().toISOString();
  const info = await db.run<ChatbotMessageRow>(
    `INSERT INTO chatbot_messages (thread_id, role, content, attachments, created_at)
     VALUES (?, ?, ?, ?, ?)
     RETURNING id, thread_id, role, content, attachments, created_at`,
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
  await db.run(
    "UPDATE chatbot_threads SET title = ?, updated_at = ? WHERE id = ?",
    autoTitle,
    createdAt,
    threadId
  );

  return toChatbotMessage(info.rows[0]);
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

export async function listConversations(ownerId: string): Promise<Conversation[]> {
  const rows = await getDb().all<ConversationRow>(
    `SELECT id, owner_id, target_name, target_handle, last_message, created_at
     FROM conversations WHERE owner_id = ? ORDER BY id DESC`,
    ownerId
  );
  return rows.map(toConversation);
}

export async function getConversationById(
  id: number,
  ownerId: string
): Promise<Conversation | undefined> {
  const row = await getDb().get<ConversationRow>(
    `SELECT id, owner_id, target_name, target_handle, last_message, created_at
     FROM conversations WHERE id = ? AND owner_id = ?`,
    id,
    ownerId
  );
  return row ? toConversation(row) : undefined;
}

export async function createConversation(
  ownerId: string,
  input: { targetName: string; targetHandle?: string }
): Promise<Conversation> {
  const name = input.targetName.trim();
  const handle = (input.targetHandle ?? name).replace(/^@/, "").trim() || name;
  const createdAt = new Date().toISOString();
  const info = await getDb().run<{ id: number }>(
    `INSERT INTO conversations (owner_id, target_name, target_handle, last_message, created_at)
     VALUES (?, ?, ?, '', ?) RETURNING id`,
    ownerId,
    name,
    handle,
    createdAt
  );
  return (await getConversationById(info.rows[0].id, ownerId))!;
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

export async function listChatLines(conversationId: number): Promise<ChatLine[]> {
  const rows = await getDb().all<ChatLineRow>(
    `SELECT id, conversation_id, type, content, is_image, created_at
     FROM chat_lines WHERE conversation_id = ? ORDER BY id`,
    conversationId
  );
  return rows.map(toChatLine);
}

export async function addChatLine(
  conversationId: number,
  ownerId: string,
  input: { type: "me" | "other"; content: string; isImage?: boolean }
): Promise<ChatLine | undefined> {
  const db = getDb();
  const conv = await getConversationById(conversationId, ownerId);
  if (!conv) return undefined;

  const createdAt = new Date().toISOString();
  const info = await db.run<ChatLineRow>(
    `INSERT INTO chat_lines (conversation_id, type, content, is_image, created_at)
     VALUES (?, ?, ?, ?, ?)
     RETURNING id, conversation_id, type, content, is_image, created_at`,
    conversationId,
    input.type,
    input.content,
    input.isImage ? 1 : 0,
    createdAt
  );

  const preview = input.isImage ? "(이미지)" : input.content.slice(0, 40);
  await db.run(
    "UPDATE conversations SET last_message = ? WHERE id = ?",
    preview,
    conversationId
  );

  const line = toChatLine(info.rows[0]);
  publishChatLine(ownerId, line);
  return line;
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
  author_handle: string;
  admin_reply: string | null;
  replied_at: string | null;
};

const INQUIRY_SELECT = `
  SELECT i.id, i.subject, i.body, i.owner_id, i.created_at,
         i.admin_reply, i.replied_at,
         u.name AS author_name, u.handle AS author_handle
  FROM support_inquiries i
  JOIN users u ON u.id = i.owner_id
`;

function toInquiry(row: InquiryRow): SupportInquiry {
  return {
    id: row.id,
    subject: row.subject,
    body: row.body,
    authorName: row.author_name,
    ...(row.admin_reply ? { adminReply: row.admin_reply } : {}),
    ...(row.replied_at ? { repliedAt: row.replied_at } : {}),
    createdAt: row.created_at,
  };
}

export async function listInquiries(ownerId: string): Promise<SupportInquiry[]> {
  const rows = await getDb().all<InquiryRow>(
    `${INQUIRY_SELECT} WHERE i.owner_id = ? ORDER BY i.id DESC`,
    ownerId
  );
  return rows.map(toInquiry);
}

export async function getInquiryById(
  id: number,
  ownerId: string
): Promise<SupportInquiry | undefined> {
  const row = await getDb().get<InquiryRow>(
    `${INQUIRY_SELECT} WHERE i.id = ? AND i.owner_id = ?`,
    id,
    ownerId
  );
  return row ? toInquiry(row) : undefined;
}

export async function createInquiry(
  ownerId: string,
  input: { subject: string; body: string }
): Promise<SupportInquiry> {
  const createdAt = new Date().toISOString();
  const info = await getDb().run<{ id: number }>(
    `INSERT INTO support_inquiries (owner_id, subject, body, created_at)
     VALUES (?, ?, ?, ?) RETURNING id`,
    ownerId,
    input.subject,
    input.body,
    createdAt
  );
  return (await getInquiryById(info.rows[0].id, ownerId))!;
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

const NOTIFICATION_COLUMNS = "id, owner_id, category, message, href, read, created_at";

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

export async function listActivityNotifications(
  ownerId: string,
  category?: string
): Promise<AppNotification[]> {
  const rows =
    category && category !== "all"
      ? await getDb().all<ActivityNotificationRow>(
          `SELECT ${NOTIFICATION_COLUMNS}
           FROM activity_notifications WHERE owner_id = ? AND category = ?
           ORDER BY id DESC`,
          ownerId,
          category
        )
      : await getDb().all<ActivityNotificationRow>(
          `SELECT ${NOTIFICATION_COLUMNS}
           FROM activity_notifications WHERE owner_id = ? ORDER BY id DESC`,
          ownerId
        );
  return rows.map(toActivityNotification);
}

export async function getActivityNotification(
  id: number,
  ownerId: string
): Promise<AppNotification | undefined> {
  const row = await getDb().get<ActivityNotificationRow>(
    `SELECT ${NOTIFICATION_COLUMNS}
     FROM activity_notifications WHERE id = ? AND owner_id = ?`,
    id,
    ownerId
  );
  return row ? toActivityNotification(row) : undefined;
}

/** 사용자가 알림을 받는지 여부. 행이 없으면 기본값 true. */
export async function getNotificationsEnabled(userId: string): Promise<boolean> {
  const row = await getDb().get<{ notifications_enabled: number }>(
    "SELECT notifications_enabled FROM users WHERE id = ?",
    userId
  );
  return row ? Boolean(row.notifications_enabled) : true;
}

export async function setNotificationsEnabled(
  userId: string,
  enabled: boolean
): Promise<boolean> {
  await getDb().run(
    "UPDATE users SET notifications_enabled = ? WHERE id = ?",
    enabled ? 1 : 0,
    userId
  );
  return enabled;
}

/** 수신을 꺼 둔 사용자는 저장하지 않고 undefined 를 돌려준다. */
export async function createActivityNotification(
  ownerId: string,
  input: { category: NotificationCategory; message: string; href?: string }
): Promise<AppNotification | undefined> {
  if (!(await getNotificationsEnabled(ownerId))) return undefined;
  const createdAt = new Date().toISOString();
  const info = await getDb().run<ActivityNotificationRow>(
    `INSERT INTO activity_notifications (owner_id, category, message, href, read, created_at)
     VALUES (?, ?, ?, ?, 0, ?)
     RETURNING ${NOTIFICATION_COLUMNS}`,
    ownerId,
    input.category,
    input.message,
    input.href ?? null,
    createdAt
  );
  const notification = toActivityNotification(info.rows[0]);
  publishNotification(ownerId, notification);
  return notification;
}

export async function patchActivityNotification(
  id: number,
  ownerId: string,
  read?: boolean
): Promise<AppNotification | undefined> {
  if (typeof read === "boolean") {
    const info = await getDb().run(
      "UPDATE activity_notifications SET read = ? WHERE id = ? AND owner_id = ?",
      read ? 1 : 0,
      id,
      ownerId
    );
    if (info.changes === 0) return undefined;
  }
  return getActivityNotification(id, ownerId);
}

export async function deleteActivityNotification(
  id: number,
  ownerId: string
): Promise<AppNotification | undefined> {
  const existing = await getActivityNotification(id, ownerId);
  if (!existing) return undefined;
  await getDb().run(
    "DELETE FROM activity_notifications WHERE id = ? AND owner_id = ?",
    id,
    ownerId
  );
  return existing;
}

export async function markAllActivityNotificationsRead(ownerId: string): Promise<number> {
  const info = await getDb().run(
    "UPDATE activity_notifications SET read = 1 WHERE owner_id = ? AND read = 0",
    ownerId
  );
  return info.changes;
}

export async function deleteAllActivityNotifications(ownerId: string): Promise<number> {
  const info = await getDb().run(
    "DELETE FROM activity_notifications WHERE owner_id = ?",
    ownerId
  );
  return info.changes;
}

// ---------------------------------------------------------------------------
// Admin (관리자 콘솔 전용)
// ---------------------------------------------------------------------------

const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;

export function isReportStatus(v: unknown): v is ReportStatus {
  return (
    typeof v === "string" && (REPORT_STATUSES as readonly string[]).includes(v)
  );
}

type AdminReportRow = {
  id: number;
  reporter_id: string;
  reporter_handle: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
};

export async function listAllReports(status?: ReportStatus): Promise<AdminReport[]> {
  const where = status ? "WHERE r.status = ?" : "";
  const rows = await getDb().all<AdminReportRow>(
    `SELECT r.id, r.reporter_id, r.target_type, r.target_id, r.reason,
            r.status, r.created_at, u.handle AS reporter_handle
     FROM reports r
     JOIN users u ON u.id = r.reporter_id
     ${where}
     ORDER BY r.id DESC`,
    ...(status ? [status] : [])
  );

  return rows.map((row) => ({
    id: row.id,
    reporterId: row.reporter_id,
    reporterHandle: row.reporter_handle,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    status: (REPORT_STATUSES as readonly string[]).includes(row.status)
      ? (row.status as ReportStatus)
      : "open",
    createdAt: row.created_at,
  }));
}

export async function setReportStatus(id: number, status: ReportStatus): Promise<boolean> {
  const info = await getDb().run("UPDATE reports SET status = ? WHERE id = ?", status, id);
  return info.changes > 0;
}

type AdminUserRow = UserRow & {
  suspended: number;
  created_at: string;
};

export async function listAllUsersForAdmin(q?: string): Promise<AdminUser[]> {
  const like = q?.trim() ? `%${q.trim().toLowerCase().replace(/^@/, "")}%` : null;
  const rows = await getDb().all<AdminUserRow>(
    `SELECT id, handle, name, bio, avatar, role, suspended, created_at
     FROM users
     ${like ? "WHERE lower(handle) LIKE ? OR lower(name) LIKE ?" : ""}
     ORDER BY created_at DESC, id`,
    ...(like ? [like, like] : [])
  );

  return rows.map((row) => ({
    ...toAuthor(row),
    suspended: Boolean(row.suspended),
    createdAt: row.created_at,
  }));
}

/**
 * 유저를 정지/해제한다. 정지 시 해당 유저의 세션을 전부 지워 이미 로그인해
 * 있던 브라우저도 즉시 끊는다 — 매 요청마다 suspended 를 다시 확인하는 대신
 * "정지 시점에 한 번" 정리하는 쪽을 택했다.
 */
export async function setUserSuspended(userId: string, suspended: boolean): Promise<boolean> {
  return withTx(async (tx) => {
    const info = await tx.run(
      "UPDATE users SET suspended = ? WHERE id = ?",
      suspended ? 1 : 0,
      userId
    );
    if (info.changes > 0 && suspended) {
      await tx.run("DELETE FROM sessions WHERE user_id = ?", userId);
    }
    return info.changes > 0;
  });
}

/** 관리자 콘솔용 — 비공개를 포함한 전체 쇼츠. 신고된 영상을 비공개로 돌려 운영자 눈을 피할 수 없게 한다. */
export async function adminListShorts(): Promise<Short[]> {
  const rows = await getDb().all<ShortJoinRow>(
    `${SHORT_SELECT} ORDER BY s.created_at DESC, s.id DESC`
  );
  return rows.map(toShort);
}

/** 쇼츠 삭제. comments/playlist_items 는 FK ON DELETE CASCADE 로 함께 사라진다. */
export async function adminDeleteShort(id: string): Promise<boolean> {
  const db = getDb();
  const row = await db.get<{ video_url: string | null; thumb: string | null }>(
    "SELECT video_url, thumb FROM shorts WHERE id = ?",
    id
  );
  const info = await db.run("DELETE FROM shorts WHERE id = ?", id);
  if (info.changes > 0 && row) {
    await removeUploadIfUnreferenced(row.video_url);
    await removeUploadIfUnreferenced(row.thumb);
  }
  return info.changes > 0;
}

export async function adminDeleteLongform(id: number): Promise<boolean> {
  const info = await getDb().run("DELETE FROM longform WHERE id = ?", id);
  return info.changes > 0;
}

export async function adminDeleteCommunityPost(id: number): Promise<boolean> {
  const info = await getDb().run("DELETE FROM community_posts WHERE id = ?", id);
  return info.changes > 0;
}

/** 소유자와 무관하게 댓글 삭제. 답글 정리·카운트 감소는 본인 삭제와 동일. */
export async function adminDeleteComment(id: string): Promise<boolean> {
  const row = await getDb().get<{ short_id: string }>(
    "SELECT short_id FROM comments WHERE id = ?",
    id
  );
  if (!row) return false;
  await deleteCommentRow(id, row.short_id);
  return true;
}

export type AdminInquiry = SupportInquiry & {
  ownerId: string;
  authorHandle: string;
};

function toAdminInquiry(row: InquiryRow): AdminInquiry {
  return {
    ...toInquiry(row),
    ownerId: row.owner_id,
    authorHandle: row.author_handle,
  };
}

/** 소유자 필터 없이 전체 문의. `unreplied` 면 아직 답변 없는 것만. */
export async function listAllInquiries(unreplied = false): Promise<AdminInquiry[]> {
  const rows = await getDb().all<InquiryRow>(
    `${INQUIRY_SELECT}
     ${unreplied ? "WHERE i.admin_reply IS NULL" : ""}
     ORDER BY i.id DESC`
  );
  return rows.map(toAdminInquiry);
}

export async function getInquiryByIdAdmin(id: number): Promise<AdminInquiry | undefined> {
  const row = await getDb().get<InquiryRow>(`${INQUIRY_SELECT} WHERE i.id = ?`, id);
  return row ? toAdminInquiry(row) : undefined;
}

export async function replyToInquiry(
  id: number,
  reply: string
): Promise<AdminInquiry | undefined> {
  const info = await getDb().run(
    "UPDATE support_inquiries SET admin_reply = ?, replied_at = ? WHERE id = ?",
    reply,
    new Date().toISOString(),
    id
  );
  if (info.changes === 0) return undefined;
  return getInquiryByIdAdmin(id);
}

export async function adminStats(): Promise<AdminStats> {
  const db = getDb();
  const count = async (sql: string) => (await db.get<{ c: number }>(sql))?.c ?? 0;
  const [
    userCount,
    suspendedCount,
    openReportCount,
    inquiryCount,
    unrepliedInquiryCount,
    shortCount,
    longformCount,
    communityCount,
  ] = await Promise.all([
    count("SELECT COUNT(*) AS c FROM users"),
    count("SELECT COUNT(*) AS c FROM users WHERE suspended = 1"),
    count("SELECT COUNT(*) AS c FROM reports WHERE status = 'open'"),
    count("SELECT COUNT(*) AS c FROM support_inquiries"),
    count("SELECT COUNT(*) AS c FROM support_inquiries WHERE admin_reply IS NULL"),
    count("SELECT COUNT(*) AS c FROM shorts"),
    count("SELECT COUNT(*) AS c FROM longform"),
    count("SELECT COUNT(*) AS c FROM community_posts"),
  ]);
  return {
    userCount,
    suspendedCount,
    openReportCount,
    inquiryCount,
    unrepliedInquiryCount,
    shortCount,
    longformCount,
    communityCount,
  };
}
