/**
 * BackendServer HTTP client 스텁.
 * UI는 아직 mock-data를 주로 쓰며, 점진적으로 이 모듈로 교체합니다.
 */

function resolveApiUrl() {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:4000`;
    }
  }
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
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
  const res = await fetch(`${resolveApiUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as ApiResult<T>;

  if (!res.ok) {
    return {
      success: false,
      error: body.error ?? res.statusText,
    };
  }

  return body;
}

export const api = {
  get baseUrl() {
    return resolveApiUrl();
  },

  health: () => request<{ status: string }>("/api/health"),

  getShorts: (q?: string) =>
    request<unknown[]>(
      q ? `/api/shorts?q=${encodeURIComponent(q)}` : "/api/shorts"
    ),

  getShort: (id: string) => request<unknown>(`/api/shorts/${id}`),

  createShort: (payload: {
    title: string;
    description?: string;
    gradient?: string;
    videoUrl?: string;
  }) =>
    request<unknown>("/api/shorts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getComments: (shortId: string) =>
    request<unknown[]>(`/api/shorts/${shortId}/comments`),

  postComment: (shortId: string, text: string, author?: string) =>
    request<unknown>(`/api/shorts/${shortId}/comments`, {
      method: "POST",
      body: JSON.stringify({ text, author }),
    }),

  getUser: (id: string) => request<unknown>(`/api/users/${id}`),

  getUserShorts: (id: string) =>
    request<unknown[]>(`/api/users/${id}/shorts`),

  getNotifications: (category?: string) =>
    request<unknown[]>(
      category && category !== "all"
        ? `/api/notifications?category=${encodeURIComponent(category)}`
        : "/api/notifications"
    ),

  getChatUsers: () => request<unknown[]>("/api/messages/users"),

  getMessages: (userId: string) =>
    request<unknown>(`/api/messages/${userId}`),

  sendMessage: (userId: string, content: string, isImage?: boolean) =>
    request<unknown>(`/api/messages/${userId}`, {
      method: "POST",
      body: JSON.stringify({ content, isImage }),
    }),

  getFaq: () => request<unknown[]>("/api/support/faq"),
};
