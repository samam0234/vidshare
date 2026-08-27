/**
 * BackendServer HTTP client.
 */

import type { Author, Comment, Short } from "@/types";
import type {
  AppNotification,
  ChatLine,
  ChatbotAttachment,
  ChatbotMessage,
  ChatbotThread,
  CommunityPost,
  Conversation,
  LongformVideo,
  SupportInquiry,
} from "@/types/content";

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
    thumb?: string;
  }) =>
    request<Short>("/api/shorts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  uploadFile: async (
    file: File,
    kind: "image" | "video"
  ): Promise<
    ApiResult<{ url: string; mime: string; size: number; kind: "image" | "video" }>
  > => {
    const form = new FormData();
    form.append("file", file);
    let res: Response;
    try {
      res = await fetch(
        `${resolveApiUrl()}/api/uploads?kind=${encodeURIComponent(kind)}`,
        {
          method: "POST",
          credentials: "include",
          body: form,
          cache: "no-store",
        }
      );
    } catch {
      return { success: false, error: "서버에 연결할 수 없습니다." };
    }
    const body = (await res.json().catch(() => ({}))) as ApiResult<{
      url: string;
      mime: string;
      size: number;
      kind: "image" | "video";
    }>;
    if (!res.ok) {
      return { success: false, error: body.error ?? res.statusText };
    }
    return body;
  },

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
    request<AppNotification[]>(
      category && category !== "all"
        ? `/api/notifications?category=${encodeURIComponent(category)}`
        : "/api/notifications"
    ),

  patchNotification: (id: number, read: boolean) =>
    request<AppNotification>(`/api/notifications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ read }),
    }),

  deleteNotification: (id: number) =>
    request<AppNotification>(`/api/notifications/${id}`, {
      method: "DELETE",
    }),

  getLongformList: () => request<LongformVideo[]>("/api/longform"),

  getLongform: (id: number) => request<LongformVideo>(`/api/longform/${id}`),

  createLongform: (payload: {
    title: string;
    description?: string;
    videoUrl?: string;
    thumb?: string;
    gradient?: string;
  }) =>
    request<LongformVideo>("/api/longform", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getCommunityList: () => request<CommunityPost[]>("/api/community"),

  getCommunityPost: (id: number) =>
    request<CommunityPost>(`/api/community/${id}`),

  createCommunityPost: (payload: { title: string; body: string }) =>
    request<CommunityPost>("/api/community", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getConversations: () => request<Conversation[]>("/api/conversations"),

  getConversation: (id: number) =>
    request<{ conversation: Conversation; lines: ChatLine[] }>(
      `/api/conversations/${id}`
    ),

  createConversation: (payload: { targetName: string; targetHandle?: string }) =>
    request<Conversation>("/api/conversations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  sendChatLine: (
    conversationId: number,
    payload: { type: "me" | "other"; content: string; isImage?: boolean }
  ) =>
    request<ChatLine>(`/api/conversations/${conversationId}/lines`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getInquiries: () => request<SupportInquiry[]>("/api/support/inquiries"),

  getInquiry: (id: number) =>
    request<SupportInquiry>(`/api/support/inquiries/${id}`),

  createInquiry: (payload: { subject: string; body: string }) =>
    request<SupportInquiry>("/api/support/inquiries", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getChatbotThreads: () => request<ChatbotThread[]>("/api/chatbot/threads"),

  getChatbotThread: (id: number) =>
    request<{ thread: ChatbotThread; messages: ChatbotMessage[] }>(
      `/api/chatbot/threads/${id}`
    ),

  createChatbotThread: (payload?: {
    title?: string;
    model?: "locals" | "vide" | "shape";
  }) =>
    request<ChatbotThread>("/api/chatbot/threads", {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }),

  patchChatbotThread: (
    id: number,
    payload: { title?: string; model?: "locals" | "vide" | "shape" }
  ) =>
    request<ChatbotThread>(`/api/chatbot/threads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteChatbotThread: (id: number) =>
    request<{ id: number }>(`/api/chatbot/threads/${id}`, {
      method: "DELETE",
    }),

  addChatbotThreadMessage: (
    id: number,
    payload: {
      role: "user" | "bot";
      content: string;
      attachments?: ChatbotAttachment[];
    }
  ) =>
    request<ChatbotMessage>(`/api/chatbot/threads/${id}/messages`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

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
