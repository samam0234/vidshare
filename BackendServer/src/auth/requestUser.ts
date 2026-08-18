import type { Request } from "express";
import { findAccount, toPublicUser, type AuthAccount } from "./accounts";
import { getSessionUserId, SESSION_COOKIE } from "./sessions";

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
