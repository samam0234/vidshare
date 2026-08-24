import type { Request } from "express";
import { findAccount, toPublicUser, type AuthAccount } from "./accounts";
import { getSessionUserId, SESSION_COOKIE } from "./sessions";
import { HttpError } from "../middleware/errorHandler";

export function readSid(req: Request) {
  const raw = req.cookies?.[SESSION_COOKIE];
  return typeof raw === "string" ? raw : null;
}

export function getRequestAccount(req: Request): AuthAccount | null {
  const userId = getSessionUserId(readSid(req));
  if (!userId) return null;
  return findAccount(userId) ?? null;
}

export function getRequestPublicUser(req: Request) {
  const account = getRequestAccount(req);
  return account ? toPublicUser(account) : null;
}

/** 로그인이 필요한 라우트에서 사용. 없으면 401. */
export function requireRequestUser(req: Request) {
  const user = getRequestPublicUser(req);
  if (!user) throw new HttpError(401, "로그인이 필요합니다.");
  return user;
}
