"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { NotificationCategory } from "@/types";
import type {
  AppNotification,
  ChatLine,
  ChatbotMessage,
  ChatbotThread,
  CommunityPost,
  ContentState,
  Conversation,
  LongformVideo,
  SupportInquiry,
} from "@/types/content";
import { currentUser } from "@/lib/mock-data";
import { randomGradient } from "@/lib/utils";

const STORAGE_KEY = "vidshare-content-v1";

const emptyState: ContentState = {
  next: {
    longform: 1,
    community: 1,
    chatbotThread: 1,
    chatbotMessage: 1,
    conversation: 1,
    chatLine: 1,
    notification: 1,
    inquiry: 1,
  },
  longform: [],
  community: [],
  chatbotThreads: [],
  chatbotMessages: [],
  conversations: [],
  chatLines: [],
  notifications: [],
  inquiries: [],
};

let state: ContentState = emptyState;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as ContentState;
    if (parsed?.next && Array.isArray(parsed.longform)) {
      state = {
        ...emptyState,
        ...parsed,
        next: { ...emptyState.next, ...parsed.next },
        inquiries: parsed.inquiries ?? [],
      };
    }
  } catch {
    state = emptyState;
  }
}

let loaded = false;
function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  load();
}

function setState(next: ContentState) {
  state = next;
  persist();
  emit();
}

function isoNow() {
  return new Date().toISOString();
}

function subscribe(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  ensureLoaded();
  return state;
}

function getServerSnapshot() {
  return emptyState;
}

function pushNotification(
  prev: ContentState,
  input: {
    category: NotificationCategory;
    message: string;
    href?: string;
  }
): ContentState {
  const id = prev.next.notification;
  const item: AppNotification = {
    id,
    category: input.category,
    message: input.message,
    read: false,
    href: input.href,
    createdAt: isoNow(),
  };
  return {
    ...prev,
    next: { ...prev.next, notification: id + 1 },
    notifications: [item, ...prev.notifications],
  };
}

export function formatSerial(id: number) {
  return `#${String(id).padStart(3, "0")}`;
}

export function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}

export function addLongform(input: {
  title: string;
  description: string;
  videoUrl?: string;
  thumb?: string;
  gradient?: string;
}): LongformVideo {
  const prev = getSnapshot();
  const id = prev.next.longform;
  const item: LongformVideo = {
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    videoUrl: input.videoUrl?.trim() ?? "",
    thumb: input.thumb,
    gradient: input.gradient ?? randomGradient(),
    authorName: currentUser.name,
    createdAt: isoNow(),
  };
  let next = {
    ...prev,
    next: { ...prev.next, longform: id + 1 },
    longform: [item, ...prev.longform],
  };
  next = pushNotification(next, {
    category: "system",
    message: `롱폼 ${formatSerial(id)} 이 등록되었습니다.`,
    href: `/longform/${id}`,
  });
  setState(next);
  return item;
}

export function addCommunity(input: {
  title: string;
  body: string;
}): CommunityPost {
  const prev = getSnapshot();
  const id = prev.next.community;
  const item: CommunityPost = {
    id,
    title: input.title.trim(),
    body: input.body.trim(),
    authorName: currentUser.name,
    createdAt: isoNow(),
  };
  let next = {
    ...prev,
    next: { ...prev.next, community: id + 1 },
    community: [item, ...prev.community],
  };
  next = pushNotification(next, {
    category: "system",
    message: `커뮤니티 글 ${formatSerial(id)} 이 작성되었습니다.`,
    href: `/community/${id}`,
  });
  setState(next);
  return item;
}

export function addChatbotThread(input?: {
  title?: string;
  model?: ChatbotThread["model"];
  guest?: boolean;
}): ChatbotThread {
  const prev = getSnapshot();
  const id = prev.next.chatbotThread;
  const now = isoNow();
  const item: ChatbotThread = {
    id,
    title: input?.title?.trim() || `챗봇 대화 ${formatSerial(id)}`,
    model: input?.model ?? "locals",
    ...(input?.guest ? { guest: true } : {}),
    createdAt: now,
    updatedAt: now,
  };
  setState({
    ...prev,
    next: { ...prev.next, chatbotThread: id + 1 },
    chatbotThreads: [item, ...prev.chatbotThreads],
  });
  return item;
}

export function setChatbotModel(
  id: number,
  model: NonNullable<ChatbotThread["model"]>
) {
  const prev = getSnapshot();
  setState({
    ...prev,
    chatbotThreads: prev.chatbotThreads.map((t) =>
      t.id === id ? { ...t, model, updatedAt: isoNow() } : t
    ),
  });
}

export function renameChatbotThread(id: number, title: string) {
  const next = title.trim().slice(0, 60);
  if (!next) return false;
  const prev = getSnapshot();
  if (!prev.chatbotThreads.some((t) => t.id === id)) return false;
  setState({
    ...prev,
    chatbotThreads: prev.chatbotThreads.map((t) =>
      t.id === id ? { ...t, title: next, updatedAt: isoNow() } : t
    ),
  });
  return true;
}

export function removeChatbotThread(id: number) {
  const prev = getSnapshot();
  if (!prev.chatbotThreads.some((t) => t.id === id)) return false;
  setState({
    ...prev,
    chatbotThreads: prev.chatbotThreads.filter((t) => t.id !== id),
    chatbotMessages: prev.chatbotMessages.filter((m) => m.threadId !== id),
  });
  return true;
}

export function addChatbotMessage(input: {
  threadId: number;
  role: "user" | "bot";
  content: string;
  attachments?: ChatbotMessage["attachments"];
}): ChatbotMessage | null {
  const prev = getSnapshot();
  const thread = prev.chatbotThreads.find((t) => t.id === input.threadId);
  if (!thread) return null;
  const id = prev.next.chatbotMessage;
  const item: ChatbotMessage = {
    id,
    threadId: input.threadId,
    role: input.role,
    content: input.content,
    ...(input.attachments?.length ? { attachments: input.attachments } : {}),
    createdAt: isoNow(),
  };
  const title =
    input.role === "user" && thread.title.startsWith("챗봇 대화")
      ? input.content.trim().slice(0, 28) || thread.title
      : thread.title;
  setState({
    ...prev,
    next: { ...prev.next, chatbotMessage: id + 1 },
    chatbotMessages: [...prev.chatbotMessages, item],
    chatbotThreads: prev.chatbotThreads.map((t) =>
      t.id === input.threadId
        ? { ...t, title, updatedAt: item.createdAt }
        : t
    ),
  });
  return item;
}

export function addConversation(input: {
  targetName: string;
  targetHandle?: string;
}): Conversation {
  const prev = getSnapshot();
  const id = prev.next.conversation;
  const name = input.targetName.trim();
  const item: Conversation = {
    id,
    targetName: name,
    targetHandle: (input.targetHandle ?? name).replace(/^@/, "").trim() || name,
    lastMessage: "",
    createdAt: isoNow(),
  };
  let next = {
    ...prev,
    next: { ...prev.next, conversation: id + 1 },
    conversations: [item, ...prev.conversations],
  };
  next = pushNotification(next, {
    category: "mention",
    message: `대화 상대 ${formatSerial(id)} (${name}) 를 추가했습니다.`,
    href: `/messages/${id}`,
  });
  setState(next);
  return item;
}

export function addChatLine(input: {
  conversationId: number;
  type: "me" | "other";
  content: string;
  isImage?: boolean;
}): ChatLine | null {
  const prev = getSnapshot();
  const conv = prev.conversations.find((c) => c.id === input.conversationId);
  if (!conv) return null;
  const id = prev.next.chatLine;
  const item: ChatLine = {
    id,
    conversationId: input.conversationId,
    type: input.type,
    content: input.content,
    isImage: input.isImage,
    createdAt: isoNow(),
  };
  const preview = input.isImage ? "(이미지)" : input.content.slice(0, 40);
  setState({
    ...prev,
    next: { ...prev.next, chatLine: id + 1 },
    chatLines: [...prev.chatLines, item],
    conversations: prev.conversations.map((c) =>
      c.id === input.conversationId ? { ...c, lastMessage: preview } : c
    ),
  });
  return item;
}

export function markNotificationRead(id: number) {
  const prev = getSnapshot();
  setState({
    ...prev,
    notifications: prev.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    ),
  });
}

export function addInquiry(input: {
  subject: string;
  body: string;
}): SupportInquiry {
  const prev = getSnapshot();
  const id = prev.next.inquiry ?? 1;
  const item: SupportInquiry = {
    id,
    subject: input.subject.trim(),
    body: input.body.trim(),
    authorName: currentUser.name,
    createdAt: isoNow(),
  };
  let next: ContentState = {
    ...prev,
    next: { ...prev.next, inquiry: id + 1 },
    inquiries: [item, ...(prev.inquiries ?? [])],
  };
  next = pushNotification(next, {
    category: "system",
    message: `고객센터 문의 ${formatSerial(id)} 을 보냈습니다.`,
    href: `/support/${id}`,
  });
  setState(next);
  return item;
}

export function removeNotification(id: number) {
  const prev = getSnapshot();
  setState({
    ...prev,
    notifications: prev.notifications.filter((n) => n.id !== id),
  });
}

export function collectChatCorpus(excludeThreadId?: number, limit = 400) {
  const prev = getSnapshot();
  const out: Array<{
    threadKey: string;
    title: string;
    role: "user" | "assistant";
    content: string;
  }> = [];
  for (const m of prev.chatbotMessages) {
    if (excludeThreadId && m.threadId === excludeThreadId) continue;
    const thread = prev.chatbotThreads.find((t) => t.id === m.threadId);
    if (thread?.guest) continue;
    const content = m.content.trim();
    if (content.length < 2) continue;
    out.push({
      threadKey: String(m.threadId),
      title: thread?.title ?? "",
      role: m.role === "bot" ? "assistant" : "user",
      content,
    });
  }
  return out.slice(-limit);
}

/** localStorage 시드는 클라이언트에서만 있다. 상세 페이지는 이게 true일 때까지 비어 있다고 보면 안 된다. */
export function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    ensureLoaded();
    setHydrated(true);
  }, []);
  return hydrated;
}

export function useContentStore() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const unreadCount = snapshot.notifications.filter((n) => !n.read).length;

  const getLongform = useCallback(
    (id: number) => snapshot.longform.find((x) => x.id === id),
    [snapshot.longform]
  );
  const getCommunity = useCallback(
    (id: number) => snapshot.community.find((x) => x.id === id),
    [snapshot.community]
  );
  const getThread = useCallback(
    (id: number) => snapshot.chatbotThreads.find((x) => x.id === id),
    [snapshot.chatbotThreads]
  );
  const getThreadMessages = useCallback(
    (id: number) => snapshot.chatbotMessages.filter((x) => x.threadId === id),
    [snapshot.chatbotMessages]
  );
  const getConversation = useCallback(
    (id: number) => snapshot.conversations.find((x) => x.id === id),
    [snapshot.conversations]
  );
  const getChatLines = useCallback(
    (id: number) => snapshot.chatLines.filter((x) => x.conversationId === id),
    [snapshot.chatLines]
  );
  const getNotification = useCallback(
    (id: number) => snapshot.notifications.find((x) => x.id === id),
    [snapshot.notifications]
  );
  const getInquiry = useCallback(
    (id: number) => snapshot.inquiries.find((x) => x.id === id),
    [snapshot.inquiries]
  );

  return {
    ...snapshot,
    inquiries: snapshot.inquiries ?? [],
    unreadCount,
    getLongform,
    getCommunity,
    getThread,
    getThreadMessages,
    getConversation,
    getChatLines,
    getNotification,
    getInquiry,
  };
}
