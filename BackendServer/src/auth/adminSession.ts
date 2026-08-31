import type { Request, Response } from "express";

/**
 * 관리자 콘솔은 일반 사이트와 **다른 쿠키 이름**을 쓴다.
 * 같은 브라우저에서 3000(사용자)/3200(콘솔)을 동시에 열어도 두 세션이
 * 서로 덮어쓰지 않고 공존한다. sid 자체는 `sessions` 테이블을 그대로
 * 공유하므로 세션 생성·조회·삭제 로직은 `sessions.ts` 를 재사용한다.
 */
export const ADMIN_SESSION_COOKIE = "vidshare_admin_sid";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function readAdminSid(req: Request) {
  const raw = req.cookies?.[ADMIN_SESSION_COOKIE];
  return typeof raw === "string" ? raw : null;
}

export function setAdminSessionCookie(res: Response, sid: string) {
  res.cookie(ADMIN_SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_MS,
  });
}

export function clearAdminSessionCookie(res: Response) {
  res.clearCookie(ADMIN_SESSION_COOKIE, { path: "/" });
}
