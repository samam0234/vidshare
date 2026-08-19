"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import {
  addChatbotMessage,
  formatWhen,
  searchChatMemory,
  useContentStore,
  useStoreHydrated,
} from "@/lib/content-store";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { loginHref } from "@/lib/guest-routes";
import { productLabel, type ChatbotProduct } from "@/lib/chatbot-models";
import SerialBadge from "@/components/ui/SerialBadge";
import { cn } from "@/lib/utils";

export default function ChatbotThread({ id }: { id: string }) {
  const num = Number(id);
  const hydrated = useStoreHydrated();
  const { user } = useAuth();
  const { getThread, getThreadMessages } = useContentStore();
  const thread = Number.isFinite(num) ? getThread(num) : undefined;
  const messages = Number.isFinite(num) ? getThreadMessages(num) : [];
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const product: ChatbotProduct = thread?.model ?? "locals";
  const memberLocked = (product === "vide" || product === "shape") && !user;

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, busy]);

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 text-center">
        <p className="text-sm text-[var(--text-muted)]">대화를 불러오는 중...</p>
      </main>
    );
  }

  if (!thread) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 text-center">
        <p className="text-[var(--text-muted)]">대화를 찾을 수 없습니다.</p>
        <Link href="/chatbot" className="mt-3 inline-block text-sm text-[var(--accent)]">
          목록으로
        </Link>
      </main>
    );
  }

  async function send() {
    const t = text.trim();
    if (!t || !thread || busy) return;
    if (memberLocked) return;
    setError(null);
    addChatbotMessage({ threadId: thread.id, role: "user", content: t });
    setText("");
    setBusy(true);

    const history = [
      ...messages.map((m) => ({
        role: (m.role === "bot" ? "assistant" : "user") as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: t },
    ];
    const memories =
      product === "shape" ? searchChatMemory(t, thread.id) : undefined;

    const res = await api.chatbotComplete({
      product,
      messages: history,
      memories,
    });
    setBusy(false);
    if (!res.success || !res.data?.text) {
      setError(res.error ?? "답변을 받지 못했습니다.");
      return;
    }
    addChatbotMessage({
      threadId: thread.id,
      role: "bot",
      content: res.data.text,
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
      <Link href="/chatbot" className="text-sm text-[var(--accent)] hover:underline">
        ← 챗봇 목록
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SerialBadge id={thread.id} />
        <h1 className="truncate text-lg font-bold">{thread.title}</h1>
        <span className="rounded-full bg-[var(--btn)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
          {productLabel(product)}
        </span>
      </div>

      <div className="surface mt-4 flex min-h-[60vh] flex-1 flex-col overflow-hidden rounded-3xl">
        <div ref={listRef} className="custom-scroll flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">
              {productLabel(product)}에게 물어보세요.
            </p>
          )}
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
                    m.role === "user" ? "text-white/80" : "text-[var(--text-muted)]"
                  )}
                >
                  {formatWhen(m.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
          {busy && (
            <p className="mr-auto text-xs text-[var(--text-muted)]">답변하는 중...</p>
          )}
        </div>
        {memberLocked ? (
          <div className="border-t border-[var(--border)] p-4 text-center text-sm text-[var(--text-muted)]">
            {productLabel(product)}는 회원만 쓸 수 있습니다.{" "}
            <Link
              href={loginHref(`/chatbot/${thread.id}`)}
              className="text-[var(--accent)] hover:underline"
            >
              로그인
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2 border-t border-[var(--border)] p-3">
            {error && <p className="px-1 text-xs text-[var(--danger)]">{error}</p>}
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="메시지를 입력하세요..."
                disabled={busy}
                className="flex-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy}
                className="rounded-full bg-[var(--accent)] p-2.5 text-white hover:opacity-90 disabled:opacity-60"
                aria-label="전송"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
