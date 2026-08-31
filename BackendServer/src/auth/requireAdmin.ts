import type { Request } from "express";
import { findAccount, type AuthAccount } from "./accounts";
import { getSessionUserId } from "./sessions";
import { readAdminSid } from "./adminSession";
import { HttpError } from "../middleware/errorHandler";

export function getRequestAdminAccount(req: Request): AuthAccount | null {
  const userId = getSessionUserId(readAdminSid(req));
  if (!userId) return null;
  const account = findAccount(userId);
  if (!account || account.role !== "admin" || account.suspended) return null;
  return account;
}

/**
 * 관리자 라우트 진입 가드.
 * 비로그인·일반 유저·정지된 관리자를 **구분하지 않고** 같은 401 을 준다
 * (핸들 하나로 관리자 계정 존재 여부를 떠보지 못하게).
 */
export function requireAdmin(req: Request): AuthAccount {
  const account = getRequestAdminAccount(req);
  if (!account) throw new HttpError(401, "관리자 로그인이 필요합니다.");
  return account;
}
