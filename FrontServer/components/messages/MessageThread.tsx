"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import {
  addChatLine,
  formatWhen,
  useContentStore,
} from "@/lib/content-store";
import SerialBadge from "@/components/ui/SerialBadge";
import { cn } from "@/lib/utils";

export default function MessageThread({ id }: { id: string }) {
  const num = Number(id);
  const { getConversation, getChatLines } = useContentStore();
  const user = Number.isFinite(num) ? getConversation(num) : undefined;
  const messages = Number.isFinite(num) ? getChatLines(num) : [];
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 text-center">
        <p className="text-[var(--text-muted)]">대화 상대를 찾을 수 없습니다.</p>
        <Link href="/messages" className="mt-3 inline-block text-sm text-[var(--accent)]">
          목록으로
        </Link>
      </main>
    );
  }

  function send(content: string, isImage = false) {
    if (!user) return;
    addChatLine({
      conversationId: user.id,
      type: "me",
      content,
      isImage,
    });
  }

  function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => send(String(reader.result), true);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
      <Link href="/messages" className="text-sm text-[var(--accent)] hover:underline">
        ← 메시지 목록
      </Link>
      <div className="surface mt-4 flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-3xl">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-sm font-bold text-white">
            {user.targetName.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <SerialBadge id={user.id} />
              <span className="font-semibold">{user.targetName}</span>
            </div>
            <div className="text-xs text-[var(--text-muted)]">@{user.targetHandle}</div>
          </div>
        </div>

        <div ref={listRef} className="custom-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">
              메시지를 보내면 채팅 일련번호가 붙습니다.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex max-w-[85%] flex-col gap-1",
                m.type === "me" ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <SerialBadge id={m.id} />
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                  m.type === "me"
                    ? "rounded-br-md bg-[var(--accent)] text-white"
                    : "rounded-bl-md bg-[var(--btn)]"
                )}
              >
                {m.isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.content} alt="첨부 이미지" className="max-w-[180px] rounded-lg" />
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
                <span
                  className={cn(
                    "mt-1 block text-[10px]",
                    m.type === "me" ? "text-white/80" : "text-[var(--text-muted)]"
                  )}
                >
                  {formatWhen(m.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-[var(--border)] p-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onImage}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-xl p-2.5 text-[var(--text-muted)] hover:bg-[var(--btn)]"
            aria-label="이미지 첨부"
          >
            <Paperclip size={20} />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const t = text.trim();
                if (!t) return;
                send(t);
                setText("");
              }
            }}
            placeholder="메시지를 입력하세요..."
            className="flex-1 rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              const t = text.trim();
              if (!t) return;
              send(t);
              setText("");
            }}
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
