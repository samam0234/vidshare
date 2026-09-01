/** 비회원이 그대로 볼 수 있는 경로. 그 외는 로그인 필요. */
export function isGuestAllowedPath(pathname: string) {
  if (pathname === "/" || pathname === "") return true;
  if (pathname === "/login" || pathname.startsWith("/login/")) return true;
  if (pathname === "/register" || pathname.startsWith("/register/")) return true;
  if (pathname === "/longform") return true;
  if (/^\/longform\/\d+$/.test(pathname)) return true;
  if (pathname === "/community") return true;
  if (/^\/community\/\d+$/.test(pathname)) return true;
  if (pathname === "/chatbot") return true;
  if (/^\/chatbot\/\d+$/.test(pathname)) return true;
  if (pathname === "/search") return true;
  if (pathname === "/terms") return true;
  if (pathname === "/privacy") return true;
  if (/^\/profile\/[^/]+$/.test(pathname)) return true;
  if (/^\/profile\/[^/]+\/(followers|following)$/.test(pathname)) return true;
  if (/^\/playlists\/\d+$/.test(pathname)) return true;
  return false;
}

export function loginHref(next?: string | null) {
  const raw = next?.trim() || "/";
  const safe =
    raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/login")
      ? raw
      : "/";
  return `/login?next=${encodeURIComponent(safe)}`;
}

export function safeNextPath(next?: string | null) {
  const raw = next?.trim() || "/";
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/";
}
