/**
 * BackendServer HTTP client.
 */

import type { Author, Comment, Short } from "@/types";

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
    request<Short[]>(
      q ? `/api/shorts?q=${encodeURIComponent(q)}` : "/api/shorts"
    ),

  getShort: (id: string) => request<Short>(`/api/shorts/${id}`),

  createShort: (payload: {
    title: string;
    description?: string;
    gradient?: string;
    videoUrl?: string;
  }) =>
    request<Short>("/api/shorts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  likeShort: (id: string, action: "like" | "unlike") =>
    request<{ id: string; likes: number }>(`/api/shorts/${id}/like`, {
      method: "POST",
      body: JSON.stringify({ action }),
    }),

  getComments: (shortId: string) =>
    request<Comment[]>(`/api/shorts/${shortId}/comments`),

  postComment: (shortId: string, text: string, author?: string) =>
    request<Comment>(`/api/shorts/${shortId}/comments`, {
      method: "POST",
      body: JSON.stringify({ text, author }),
    }),

  getUser: (id: string) => request<Author>(`/api/users/${id}`),

  getUserShorts: (id: string) =>
    request<Short[]>(`/api/users/${id}/shorts`),

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

  chatbotComplete: (payload: {
    product: "locals" | "vide" | "shape";
    threadKey?: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    corpus?: Array<{
      threadKey: string;
      title?: string;
      role: "user" | "assistant";
      content: string;
    }>;
    platformDocs?: Array<{
      kind: "longform" | "community";
      title: string;
      content: string;
    }>;
    images?: Array<{ mime: string; dataBase64: string }>;
  }) =>
    request<{
      text: string;
      product: string;
      model: string;
      pipeline?: string;
      retrieved?: number;
    }>("/api/chatbot/complete", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
