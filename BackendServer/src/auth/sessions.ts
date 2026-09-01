import { randomUUID } from "crypto";
import type { Response } from "express";
import { getDb } from "../db/client";
import {
  sessionCookieClearOptions,
  sessionCookieOptions,
} from "./cookieOptions";

export const SESSION_COOKIE = "vidshare_sid";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function createSession(userId: string) {
  const id = randomUUID();
  getDb()
    .prepare("INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)")
    .run(id, userId, Date.now());
  return id;
}

export function getSessionUserId(sid?: string | null) {
  if (!sid) return null;
  const row = getDb()
    .prepare("SELECT user_id, created_at FROM sessions WHERE id = ?")
    .get(sid) as { user_id: string; created_at: number } | undefined;
  if (!row) return null;
  if (Date.now() - row.created_at > MAX_AGE_MS) {
    getDb().prepare("DELETE FROM sessions WHERE id = ?").run(sid);
    return null;
  }
  return row.user_id;
}

export function destroySession(sid?: string | null) {
  if (sid) getDb().prepare("DELETE FROM sessions WHERE id = ?").run(sid);
}

export function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, sessionCookieOptions(MAX_AGE_MS));
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, sessionCookieClearOptions());
}
