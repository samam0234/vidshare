/**
 * BackendServer HTTP client (콘솔용).
 * FrontServer 와 같은 :4000 서버를 보지만, 호출하는 경로는 `/api/admin/*` 이고
 * 그 라우트들은 `vidshare_admin_sid` 쿠키만 읽고 쓴다. 쿠키 이름이 달라
 * 같은 브라우저에서 사용자 사이트 로그인과 서로 덮어쓰지 않는다.
 */

function isLanHostname(hostname: string) {
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return false;
}

function resolveApiUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (isLanHostname(hostname)) {
      return `${protocol}//${hostname}:4000`;
    }
  }
  return "http://localhost:4000";
}

export type ApiResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function request<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${resolveApiUrl()}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    return { success: false, error: "서버에 연결할 수 없습니다." };
  }

  const body = (await res.json().catch(() => ({}))) as ApiResult<T>;
  if (!res.ok) {
    return { success: false, error: body.error ?? res.statusText };
  }
  return body;
}

export const apiBaseUrl = resolveApiUrl;
