"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import {
  addChatbotMessage,
  botReply,
  formatWhen,
  useContentStore,
} from "@/lib/content-store";
import SerialBadge from "@/components/ui/SerialBadge";
import { cn } from "@/lib/utils";

export default function ChatbotThread({ id }: { id: string }) {
  const num = Number(id);
  const { getThread, getThreadMessages } = useContentStore();
  const thread = Number.isFinite(num) ? getThread(num) : undefined;
  const messages = Number.isFinite(num) ? getThreadMessages(num) : [];
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

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

  function send() {
    const t = text.trim();
    if (!t || !thread) return;
    addChatbotMessage({ threadId: thread.id, role: "user", content: t });
    setText("");
    const reply = botReply(t);
    window.setTimeout(() => {
      addChatbotMessage({ threadId: thread.id, role: "bot", content: reply });
    }, 280);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
      <Link href="/chatbot" className="text-sm text-[var(--accent)] hover:underline">
        ← 챗봇 목록
      </Link>
      <div className="mt-3 flex items-center gap-2">
        <SerialBadge id={thread.id} />
        <h1 className="truncate text-lg font-bold">{thread.title}</h1>
      </div>

      <div className="surface mt-4 flex min-h-[60vh] flex-1 flex-col overflow-hidden rounded-3xl">
        <div ref={listRef} className="custom-scroll flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">
              메시지를 입력하면 일련번호와 함께 대화가 쌓입니다.
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
        </div>
        <div className="flex items-center gap-2 border-t border-[var(--border)] p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
          <button
            type="button"
            onClick={send}
            className="rounded-full bg-[var(--accent)] p-2.5 text-white hover:opacity-90"
            aria-label="전송"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}
