"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bot, Paperclip, PanelLeft, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import {
  addChatbotMessage,
  addChatbotThread,
  collectChatCorpus,
  formatWhen,
  removeChatbotThread,
  renameChatbotThread,
  setChatbotModel,
  useContentStore,
  useStoreHydrated,
} from "@/lib/content-store";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { loginHref } from "@/lib/guest-routes";
import {
  CHATBOT_PRODUCTS,
  productLabel,
  type ChatbotProduct,
} from "@/lib/chatbot-models";
import SerialBadge from "@/components/ui/SerialBadge";
import { cn } from "@/lib/utils";
import type { ChatbotAttachment } from "@/types/content";

const ACCEPT =
  "image/*,.pdf,.txt,.md,.csv,.json,.doc,.docx,application/pdf,text/plain";
const MAX_FILES = 4;
const MAX_BYTES = 5 * 1024 * 1024;

function formatSize(n: number) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)}KB`;
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}

function isImage(mime: string) {
  return mime.startsWith("image/");
}

async function fileToAttachment(file: File): Promise<ChatbotAttachment> {
  const mime = file.type || "application/octet-stream";
  const base: ChatbotAttachment = {
    name: file.name,
    mime,
    size: file.size,
  };
  const lower = file.name.toLowerCase();
  const textLike =
    mime.startsWith("text/") ||
    lower.endsWith(".md") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".json") ||
    lower.endsWith(".txt");
  if (textLike) {
    const text = (await file.text()).slice(0, 8000);
    return { ...base, text };
  }
  if (isImage(mime)) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    return { ...base, dataUrl };
  }
  return base;
}

function withFileNote(text: string, files: ChatbotAttachment[]) {
  if (!files.length) return text;
  const bits = files.map((f) => {
    if (f.text) return `[문서 ${f.name}]\n${f.text}`;
    if (isImage(f.mime)) return `[이미지 첨부: ${f.name}]`;
    return `[파일 첨부: ${f.name}]`;
  });
  return [text.trim(), ...bits].filter(Boolean).join("\n\n");
}

export default function ChatbotWorkspace({ threadId }: { threadId?: string }) {
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const { user, ready } = useAuth();
  const isMember = Boolean(user);
  const { chatbotThreads, getThread, getThreadMessages } = useContentStore();
  const num = threadId ? Number(threadId) : NaN;
  const guestThread = chatbotThreads.find((t) => t.guest);
  const memberThread = Number.isFinite(num) ? getThread(num) : undefined;
  const thread = isMember ? memberThread : guestThread;
  const messages = thread ? getThreadMessages(thread.id) : [];
  const savedThreads = chatbotThreads.filter((t) => !t.guest);
  const [product, setProduct] = useState<ChatbotProduct>("locals");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<ChatbotAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const activeProduct: ChatbotProduct = isMember
    ? (thread?.model ?? product)
    : "locals";
  const memberLocked =
    (activeProduct === "vide" || activeProduct === "shape") && !user;

  useEffect(() => {
    if (thread?.model) setProduct(thread.model);
  }, [thread?.id, thread?.model]);

  useEffect(() => {
    if (!hydrated || !ready || user) return;
    if (!chatbotThreads.some((t) => t.guest)) {
      addChatbotThread({
        title: "VidShare Locals",
        model: "locals",
        guest: true,
      });
    }
    if (threadId) router.replace("/chatbot");
  }, [hydrated, ready, user, chatbotThreads, threadId, router]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, busy, thread?.id]);

  useEffect(() => {
    if (editingId != null) renameRef.current?.focus();
  }, [editingId]);

  function goThread(id: number) {
    setSidebarOpen(false);
    router.push(`/chatbot/${id}`);
  }

  function startThread(model: ChatbotProduct) {
    if (!user) return;
    const spec = CHATBOT_PRODUCTS.find((p) => p.id === model);
    if (spec?.memberOnly && !user) {
      router.push(loginHref("/chatbot"));
      return;
    }
    const t = addChatbotThread({ model });
    goThread(t.id);
  }

  function onPickModel(next: ChatbotProduct) {
    const spec = CHATBOT_PRODUCTS.find((p) => p.id === next);
    if (spec?.memberOnly && !user) {
      router.push(loginHref(thread ? `/chatbot/${thread.id}` : "/chatbot"));
      return;
    }
    setProduct(next);
    if (thread) setChatbotModel(thread.id, next);
  }

  function startRename(id: number, title: string) {
    setEditingId(id);
    setEditTitle(title);
  }

  function saveRename() {
    if (editingId == null) return;
    renameChatbotThread(editingId, editTitle);
    setEditingId(null);
    setEditTitle("");
  }

  function cancelRename() {
    setEditingId(null);
    setEditTitle("");
  }

  function deleteThread(id: number) {
    const t = savedThreads.find((x) => x.id === id);
    const label = t?.title ?? "이 대화";
    if (!window.confirm(`“${label}” 대화를 삭제할까요?`)) return;
    removeChatbotThread(id);
    if (editingId === id) cancelRename();
    if (thread?.id === id) {
      setSidebarOpen(false);
      router.push("/chatbot");
    }
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    const incoming = Array.from(list);
    const next: ChatbotAttachment[] = [...files];
    for (const file of incoming) {
      if (next.length >= MAX_FILES) {
        setError(`파일은 최대 ${MAX_FILES}개까지 첨부할 수 있습니다.`);
        break;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name} 은 5MB를 넘습니다.`);
        continue;
      }
      next.push(await fileToAttachment(file));
    }
    setFiles(next);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function send() {
    const t = text.trim();
    if ((!t && files.length === 0) || busy) return;
    if (memberLocked) return;

    let current = thread;
    if (!current) {
      if (!user) {
        current = addChatbotThread({
          title: "VidShare Locals",
          model: "locals",
          guest: true,
        });
      } else {
        const spec = CHATBOT_PRODUCTS.find((p) => p.id === activeProduct);
        if (spec?.memberOnly && !user) {
          router.push(loginHref("/chatbot"));
          return;
        }
        current = addChatbotThread({ model: activeProduct });
        router.push(`/chatbot/${current.id}`);
      }
    }

    setError(null);
    const attachments = files;
    const content = t || (attachments.length ? "(첨부 파일)" : "");
    addChatbotMessage({
      threadId: current.id,
      role: "user",
      content,
      attachments,
    });
    setText("");
    setFiles([]);
    setBusy(true);

    const prompt = withFileNote(t, attachments);
    const history = [
      ...messages.map((m) => ({
        role: (m.role === "bot" ? "assistant" : "user") as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: prompt },
    ];
    const corpus =
      activeProduct === "shape"
        ? collectChatCorpus(current.id)
        : undefined;

    try {
      const res = await api.chatbotComplete({
        product: activeProduct,
        threadKey: String(current.id),
        messages: history,
        corpus,
      });
      if (!res.success || !res.data?.text) {
        setError(res.error ?? "답변을 받지 못했습니다.");
        return;
      }
      addChatbotMessage({
        threadId: current.id,
        role: "bot",
        content: res.data.text,
      });
    } catch {
      setError("서버에 연결하지 못했습니다. 백엔드가 켜져 있는지 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const sidebar = (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--nav)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-3">
        <span className="text-sm font-bold">저장 기록</span>
        <button
          type="button"
          onClick={() => startThread(activeProduct)}
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
        >
          <Plus size={14} />
          새 대화
        </button>
      </div>
      <div className="custom-scroll flex-1 overflow-y-auto p-2">
        {savedThreads.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-[var(--text-muted)]">
            아직 저장된 대화가 없습니다.
          </p>
        ) : (
          <ul className="space-y-1">
            {savedThreads.map((t) => (
              <li
                key={t.id}
                className={cn(
                  "rounded-xl px-2 py-2 transition",
                  thread?.id === t.id
                    ? "bg-[var(--btn)]"
                    : "hover:bg-[var(--btn)]/60"
                )}
              >
                <div className="flex items-start gap-1">
                  {editingId === t.id ? (
                    <input
                      ref={renameRef}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={saveRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          saveRename();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelRename();
                        }
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-[var(--accent)] bg-[var(--bg)] px-2 py-1 text-sm focus:outline-none"
                      aria-label="방 이름"
                      maxLength={60}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => goThread(t.id)}
                      className="min-w-0 flex-1 px-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <SerialBadge id={t.id} />
                        <span className="truncate text-[10px] text-[var(--accent)]">
                          {productLabel(t.model)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">
                        {t.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                        {formatWhen(t.updatedAt)}
                      </p>
                    </button>
                  )}
                  <div className="flex shrink-0 flex-col gap-0.5 pt-0.5">
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
                      aria-label="이름 수정"
                      title="이름 수정"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(t.id, t.title);
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--danger)]"
                      aria-label="대화 삭제"
                      title="삭제"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteThread(t.id);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );

  if (!hydrated) {
    return (
      <main className="flex h-[calc(100dvh-3.5rem)] items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">대화를 불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] min-h-0 overflow-hidden">
      {isMember && <div className="hidden h-full md:flex">{sidebar}</div>}

      {isMember && sidebarOpen && (
        <div className="fixed inset-0 z-[200] flex md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="기록 닫기"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 h-full">{sidebar}</div>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col bg-[var(--bg)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
          {isMember && (
            <button
              type="button"
              className="rounded-lg p-2 text-[var(--text)] hover:bg-[var(--btn)] md:hidden"
              aria-label="저장 기록"
              onClick={() => setSidebarOpen(true)}
            >
              <PanelLeft size={18} />
            </button>
          )}
          {thread ? (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {isMember && <SerialBadge id={thread.id} />}
                <h1 className="truncate text-sm font-bold">
                  {isMember ? thread.title : "VidShare Locals"}
                </h1>
              </div>
            </div>
          ) : (
            <h1 className="flex-1 text-sm font-bold">
              {isMember ? "챗봇" : "VidShare Locals"}
            </h1>
          )}
        </div>

        <div ref={listRef} className="custom-scroll flex-1 overflow-y-auto px-4 py-4">
          {!thread ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Bot className="text-[var(--text-muted)]" size={36} />
              <p className="text-sm text-[var(--text-muted)]">
                {isMember
                  ? "왼쪽에서 저장 기록을 고르거나 새 대화를 시작하세요."
                  : "VidShare Locals에게 물어보세요. 채팅방 저장은 회원만 가능합니다."}
              </p>
            </div>
          ) : messages.length === 0 ? (
            <p className="py-16 text-center text-sm text-[var(--text-muted)]">
              {productLabel(activeProduct)}에게 물어보세요.
            </p>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                    m.role === "user"
                      ? "ml-auto rounded-br-md bg-[var(--accent)] text-white"
                      : "mr-auto rounded-bl-md bg-[var(--btn)]"
                  )}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <SerialBadge id={m.id} />
                    <span
                      className={cn(
                        "text-[10px]",
                        m.role === "user"
                          ? "text-white/80"
                          : "text-[var(--text-muted)]"
                      )}
                    >
                      {formatWhen(m.createdAt)}
                    </span>
                  </div>
                  {m.attachments?.some((a) => a.dataUrl) && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {m.attachments
                        .filter((a) => a.dataUrl)
                        .map((a) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={a.name}
                            src={a.dataUrl}
                            alt={a.name}
                            className="max-h-40 max-w-[180px] rounded-lg"
                          />
                        ))}
                    </div>
                  )}
                  {m.attachments?.some((a) => !a.dataUrl) && (
                    <ul className="mb-2 space-y-1 text-xs opacity-90">
                      {m.attachments
                        .filter((a) => !a.dataUrl)
                        .map((a) => (
                          <li key={a.name}>
                            첨부 {a.name} ({formatSize(a.size)})
                          </li>
                        ))}
                    </ul>
                  )}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
              {busy && (
                <p className="mr-auto text-xs text-[var(--text-muted)]">
                  답변하는 중...
                </p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] bg-[var(--nav)] px-3 py-3">
          {memberLocked ? (
            <p className="text-center text-sm text-[var(--text-muted)]">
              {productLabel(activeProduct)}는 회원만 쓸 수 있습니다.{" "}
              <Link
                href={loginHref(thread ? `/chatbot/${thread.id}` : "/chatbot")}
                className="text-[var(--accent)] hover:underline"
              >
                로그인
              </Link>
            </p>
          ) : (
            <div className="mx-auto max-w-3xl space-y-2">
              {error && (
                <p className="text-xs text-[var(--danger)]">{error}</p>
              )}
              {files.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--btn)] px-2.5 py-1 text-xs"
                    >
                      {f.dataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={f.dataUrl}
                          alt=""
                          className="h-5 w-5 rounded object-cover"
                        />
                      ) : null}
                      <span className="max-w-[9rem] truncate">{f.name}</span>
                      <button
                        type="button"
                        aria-label="첨부 제거"
                        onClick={() =>
                          setFiles((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="rounded-full p-0.5 hover:bg-[var(--bg)]"
                      >
                        <X size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-end gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(e) => void onFiles(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--btn)] text-[var(--text)] hover:border-[var(--accent)] disabled:opacity-60"
                  aria-label="파일 업로드"
                  title="이미지나 문서 첨부"
                >
                  <Paperclip size={18} />
                </button>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={1}
                  placeholder="메시지를 입력하세요..."
                  disabled={busy}
                  className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none disabled:opacity-60"
                />
                {isMember ? (
                  <select
                    value={activeProduct}
                    onChange={(e) =>
                      onPickModel(e.target.value as ChatbotProduct)
                    }
                    disabled={busy}
                    className="h-11 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--btn)] px-2 text-xs font-semibold focus:border-[var(--accent)] focus:outline-none disabled:opacity-60"
                    aria-label="모델 선택"
                  >
                    {CHATBOT_PRODUCTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name.replace("VidShare ", "")}
                        {p.memberOnly ? " · 회원" : " · 무료"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="flex h-11 shrink-0 items-center rounded-xl border border-[var(--border)] bg-[var(--btn)] px-3 text-xs font-semibold">
                    Locals · 무료
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={busy}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-60"
                  aria-label="메시지 보내기"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
