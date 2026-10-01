import { createHash } from "crypto";
import { getDb, withTx } from "../db/client";
import type { CorpusDoc } from "./types";

export type MemoryHit = {
  threadKey: string;
  title: string;
  role: string;
  content: string;
  score: number;
};

function docId(owner: string, doc: CorpusDoc) {
  return createHash("sha256")
    .update(`${owner}\n${doc.threadKey}\n${doc.role}\n${doc.content}`)
    .digest("hex")
    .slice(0, 24);
}

export function tokens(raw: string) {
  const s = raw.toLowerCase();
  const words = s.split(/[^a-z0-9가-힣]+/i).filter((w) => w.length >= 2);
  const hangul = s.replace(/[^가-힣]/g, "");
  const grams: string[] = [];
  for (let i = 0; i < hangul.length - 1; i++) grams.push(hangul.slice(i, i + 2));
  return [...words, ...grams];
}

export async function ingestCorpus(owner: string, docs: CorpusDoc[]) {
  if (!owner || !docs.length) return 0;
  const now = new Date().toISOString();
  let n = 0;
  await withTx(async (tx) => {
    for (const doc of docs) {
      const content = doc.content.trim();
      if (content.length < 2) continue;
      const info = await tx.run(
        `INSERT INTO chatbot_docs
         (id, owner, thread_key, title, role, content, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
        docId(owner, { ...doc, content }),
        owner,
        doc.threadKey,
        (doc.title ?? "").slice(0, 80),
        doc.role,
        content.slice(0, 4000),
        now
      );
      if (info.changes) n += 1;
    }
  });
  return n;
}

export async function retrieveMemories(input: {
  owner: string;
  query: string;
  excludeThread?: string;
  limit: number;
}): Promise<MemoryHit[]> {
  const { owner, query, excludeThread, limit } = input;
  const q = new Set(tokens(query));
  if (!owner || q.size === 0) return [];

  const rows = await getDb().all<{
    thread_key: string;
    title: string;
    role: string;
    content: string;
  }>(
    `SELECT thread_key, title, role, content
     FROM chatbot_docs
     WHERE owner = ?
     ORDER BY created_at DESC
     LIMIT 2000`,
    owner
  );

  const scored: MemoryHit[] = [];
  for (const row of rows) {
    if (excludeThread && row.thread_key === excludeThread) continue;
    const hay = tokens(`${row.title} ${row.content}`);
    let score = 0;
    for (const t of hay) {
      if (q.has(t)) score += 1;
    }
    if (score <= 0) continue;
    scored.push({
      threadKey: row.thread_key,
      title: row.title,
      role: row.role,
      content: row.content,
      score,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  const out: MemoryHit[] = [];
  const seen = new Set<string>();
  for (const hit of scored) {
    const key = hit.content.slice(0, 160);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
}

export function formatHits(hits: MemoryHit[]) {
  return hits.map((h) => {
    const who = h.role === "user" ? "사용자" : "봇";
    const title = h.title ? `[${h.title}] ` : "";
    return `${title}${who}: ${h.content.slice(0, 320)}`;
  });
}

export async function loadSummary(owner: string, threadKey: string) {
  const row = await getDb().get<{ summary: string }>(
    `SELECT summary FROM chatbot_summaries
     WHERE owner = ? AND thread_key = ?`,
    owner,
    threadKey
  );
  return row?.summary ?? "";
}

export async function saveSummary(owner: string, threadKey: string, summary: string) {
  await getDb().run(
    `INSERT INTO chatbot_summaries (owner, thread_key, summary, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(owner, thread_key) DO UPDATE SET
       summary = excluded.summary,
       updated_at = excluded.updated_at`,
    owner,
    threadKey,
    summary.slice(0, 2500),
    new Date().toISOString()
  );
}
