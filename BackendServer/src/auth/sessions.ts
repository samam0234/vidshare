import { randomUUID } from "crypto";
import type { Response } from "express";

export const SESSION_COOKIE = "vidshare_sid";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const sessions = new Map<string, { userId: string; createdAt: number }>();

export function createSession(userId: string) {
  const id = randomUUID();
  sessions.set(id, { userId, createdAt: Date.now() });
  return id;
}

export function getSessionUserId(sid?: string | null) {
  if (!sid) return null;
  const row = sessions.get(sid);
  if (!row) return null;
  if (Date.now() - row.createdAt > MAX_AGE_MS) {
    sessions.delete(sid);
    return null;
  }
  return row.userId;
}

export function destroySession(sid?: string | null) {
  if (sid) sessions.delete(sid);
}

export function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_MS,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}
