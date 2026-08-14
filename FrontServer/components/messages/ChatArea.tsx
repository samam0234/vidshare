"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import type { ChatUser, Message } from "@/types";
import { nowTimeLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Props = {
  user: ChatUser;
  messages: Message[];
  onSend: (content: string, isImage?: boolean) => void;
};

export default function ChatArea({ user, messages, onSend }: Props) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, user.id]);

  function send() {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  }

  function onImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onSend(String(reader.result), true);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <Link
          href={`/profile/${user.id}`}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-sm font-bold text-white"
        >
          {user.name.slice(0, 1)}
        </Link>
        <div>
          <div className="font-semibold">{user.name}</div>
          <div className="text-xs text-[var(--text-muted)]">
            {user.online ? "온라인" : "오프라인"} · @{user.handle}
          </div>
        </div>
      </div>

      <div
        ref={listRef}
        className="custom-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex max-w-[85%] gap-2",
              m.type === "me" ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            {m.type === "other" && (
              <Link
                href={`/profile/${user.id}`}
                className="mt-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-xs font-bold text-white"
              >
                {user.name.slice(0, 1)}
              </Link>
            )}
            <div
              className={cn(
                "rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                m.type === "me"
                  ? "rounded-br-md bg-[var(--accent)] text-white"
                  : "rounded-bl-md bg-[var(--btn)] text-[var(--text)]"
              )}
            >
              {m.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.content}
                  alt="첨부 이미지"
                  className="max-w-[180px] rounded-lg"
                />
              ) : (
                <p>{m.content}</p>
              )}
              <span
                className={cn(
                  "mt-1 block text-[10px]",
                  m.type === "me" ? "text-white/80" : "text-[var(--text-muted)]"
                )}
              >
                {m.time || nowTimeLabel()}
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
          className="rounded-xl p-2.5 text-[var(--text-muted)] hover:bg-[var(--btn)] hover:text-[var(--text)]"
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
  );
}
