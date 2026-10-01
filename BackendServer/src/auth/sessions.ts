import { randomUUID } from "crypto";
import type { Response } from "express";
import { getDb } from "../db/client";
import {
  sessionCookieClearOptions,
  sessionCookieOptions,
} from "./cookieOptions";

export const SESSION_COOKIE = "vidshare_sid";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSession(userId: string) {
  const id = randomUUID();
  await getDb().run(
    "INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)",
    id,
    userId,
    Date.now()
  );
  return id;
}

export async function getSessionUserId(sid?: string | null) {
  if (!sid) return null;
  const row = await getDb().get<{ user_id: string; created_at: number }>(
    "SELECT user_id, created_at FROM sessions WHERE id = ?",
    sid
  );
  if (!row) return null;
  if (Date.now() - row.created_at > MAX_AGE_MS) {
    await getDb().run("DELETE FROM sessions WHERE id = ?", sid);
    return null;
  }
  return row.user_id;
}

export async function destroySession(sid?: string | null) {
  if (sid) await getDb().run("DELETE FROM sessions WHERE id = ?", sid);
}

export function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, sessionCookieOptions(MAX_AGE_MS));
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, sessionCookieClearOptions());
}
