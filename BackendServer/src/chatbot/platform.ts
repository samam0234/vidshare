/** VidShare 플랫폼 실데이터(쇼츠·댓글·FAQ) 검색. SQLite에서 매 호출마다 조회하므로 항상 최신이다. */

import { getDb } from "../db/client";
import { tokens } from "./store";

export type PlatformHit = {
  kind: "short" | "comment" | "faq" | "longform" | "community";
  label: string;
  content: string;
  score: number;
};

/** 프론트 localStorage에서만 사는 커뮤니티·롱폼 글. 요청마다 클라이언트가 실어 보낸다. */
export type ClientPlatformDoc = {
  kind: "longform" | "community";
  title: string;
  content: string;
};

function scoreText(qTokens: Set<string>, text: string) {
  let score = 0;
  for (const t of tokens(text)) if (qTokens.has(t)) score += 1;
  return score;
}

/** 쇼츠 제목/설명, 쇼츠 댓글, FAQ, (있으면) 클라이언트가 보낸 커뮤니티·롱폼을 사용자 질문 토큰과 매칭해 관련도 순으로 반환한다. */
export function retrievePlatformInfo(
  query: string,
  limit = 12,
  clientDocs: ClientPlatformDoc[] = []
): PlatformHit[] {
  const qTokens = new Set(tokens(query));
  if (qTokens.size === 0) return [];

  const db = getDb();
  const hits: PlatformHit[] = [];

  const shorts = db
    .prepare(
      `SELECT s.id, s.title, s.description, s.likes, s.comment_count, u.handle
       FROM shorts s JOIN users u ON u.id = s.author_id
       ORDER BY s.created_at DESC LIMIT 300`
    )
    .all() as Array<{
    id: string;
    title: string;
    description: string;
    likes: number;
    comment_count: number;
    handle: string;
  }>;
  for (const s of shorts) {
    const score = scoreText(qTokens, `${s.title} ${s.description}`);
    if (score <= 0) continue;
    hits.push({
      kind: "short",
      label: `쇼츠 @${s.handle}`,
      content: `${s.title} — ${s.description} (좋아요 ${s.likes}, 댓글 ${s.comment_count})`,
      score,
    });
  }

  const comments = db
    .prepare(
      `SELECT c.text, s.title
       FROM comments c JOIN shorts s ON s.id = c.short_id
       ORDER BY c.id DESC LIMIT 300`
    )
    .all() as Array<{ text: string; title: string }>;
  for (const c of comments) {
    const score = scoreText(qTokens, c.text);
    if (score <= 0) continue;
    hits.push({
      kind: "comment",
      label: `댓글 (쇼츠 "${c.title}")`,
      content: c.text,
      score,
    });
  }

  const faqs = db.prepare(`SELECT question, answers FROM faqs`).all() as Array<{
    question: string;
    answers: string;
  }>;
  for (const f of faqs) {
    let answerText = f.answers;
    try {
      const parsed = JSON.parse(f.answers) as string[];
      if (Array.isArray(parsed)) answerText = parsed.join(" ");
    } catch {
      // 이미 평문이면 그대로 둔다
    }
    const score = scoreText(qTokens, `${f.question} ${answerText}`);
    if (score <= 0) continue;
    hits.push({
      kind: "faq",
      label: "고객센터 FAQ",
      content: `Q: ${f.question}\nA: ${answerText}`,
      score,
    });
  }

  for (const d of clientDocs) {
    const score = scoreText(qTokens, `${d.title} ${d.content}`);
    if (score <= 0) continue;
    hits.push({
      kind: d.kind,
      label: d.kind === "longform" ? "롱폼" : "커뮤니티",
      content: d.title ? `${d.title} — ${d.content}` : d.content,
      score,
    });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

export function formatPlatformHits(hits: PlatformHit[]) {
  return hits.map((h) => `[${h.label}] ${h.content.slice(0, 320)}`);
}

export type PlatformSnapshot = {
  generatedAt: string;
  shorts: { count: number; top: Array<{ title: string; likes: number; comments: number; author: string }> };
  comments: { count: number };
  users: { count: number };
  faq: { count: number };
  community: { count: number; note: string };
  longform: { count: number; note: string };
};

/** 질문 키워드 매칭과 무관하게 항상 넣어줄 전체 현황. 개요/통계 질문("쇼츠 몇 개야?")에 답할 근거가 된다. */
export function buildPlatformSnapshot(clientDocs: ClientPlatformDoc[] = []): PlatformSnapshot {
  const db = getDb();
  const count = (sql: string) => (db.prepare(sql).get() as { c: number }).c;

  const topShorts = db
    .prepare(
      `SELECT s.title, s.likes, s.comment_count, u.handle
       FROM shorts s JOIN users u ON u.id = s.author_id
       ORDER BY s.likes DESC LIMIT 5`
    )
    .all() as Array<{ title: string; likes: number; comment_count: number; handle: string }>;

  const localOnlyNote = "이 사용자 브라우저의 localStorage 기준(다른 유저 글은 안 보임)";

  return {
    generatedAt: new Date().toISOString(),
    shorts: {
      count: count(`SELECT COUNT(*) c FROM shorts`),
      top: topShorts.map((s) => ({
        title: s.title,
        likes: s.likes,
        comments: s.comment_count,
        author: `@${s.handle}`,
      })),
    },
    comments: { count: count(`SELECT COUNT(*) c FROM comments`) },
    users: { count: count(`SELECT COUNT(*) c FROM users`) },
    faq: { count: count(`SELECT COUNT(*) c FROM faqs`) },
    community: {
      count: clientDocs.filter((d) => d.kind === "community").length,
      note: localOnlyNote,
    },
    longform: {
      count: clientDocs.filter((d) => d.kind === "longform").length,
      note: localOnlyNote,
    },
  };
}

export function formatPlatformSnapshot(snapshot: PlatformSnapshot) {
  return JSON.stringify(snapshot);
}
