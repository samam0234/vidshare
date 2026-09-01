import type { CookieOptions } from "express";

/**
 * 프로덕션에서 프론트와 API가 `app.` / `api.` 처럼 서브도메인으로 갈라지면
 * `COOKIE_DOMAIN=.example.com` 을 줘야 SameSite=Lax 쿠키가 실린다.
 * 완전히 다른 사이트면 `COOKIE_SAMESITE=none` (HTTPS 필수).
 */
export function sessionCookieOptions(maxAge: number): CookieOptions {
  const raw = (process.env.COOKIE_SAMESITE ?? "lax").trim().toLowerCase();
  const sameSite: CookieOptions["sameSite"] =
    raw === "none" || raw === "strict" || raw === "lax" ? raw : "lax";
  const domain = process.env.COOKIE_DOMAIN?.trim();
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite,
    secure: production || sameSite === "none",
    path: "/",
    maxAge,
    ...(domain ? { domain } : {}),
  };
}

export function sessionCookieClearOptions(): CookieOptions {
  const opts = sessionCookieOptions(0);
  return {
    path: opts.path,
    sameSite: opts.sameSite,
    secure: opts.secure,
    ...(opts.domain ? { domain: opts.domain } : {}),
  };
}
