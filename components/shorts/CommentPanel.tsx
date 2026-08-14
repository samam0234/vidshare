"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Comment } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  comments: Comment[];
  onAdd: (text: string) => void;
};

export default function CommentPanel({
  open,
  onClose,
  comments,
  onAdd,
}: Props) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments.length, open]);

  function submit() {
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText("");
  }

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-[90] bg-black/40 md:bg-transparent"
          aria-label="댓글 패널 닫기"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "comment-panel fixed right-0 top-0 z-[100] flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]",
          open && "open"
        )}
        aria-hidden={!open}
      >
        <div className="relative flex items-center justify-center border-b border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
          <h3 className="text-base font-semibold">댓글 {comments.length}</h3>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--btn)] hover:text-[var(--text)]"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>

        <div
          ref={listRef}
          className="custom-scroll flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
        >
          {comments.length === 0 && (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">
              첫 댓글을 남겨보세요.
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-xs font-bold text-white">
                {c.author.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{c.author}</div>
                <p className="mt-0.5 text-sm text-[var(--text)]">{c.text}</p>
                <span className="mt-1 block text-xs text-[var(--text-muted)]">
                  {c.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-t border-[var(--border)] bg-[var(--bg-card)] p-3">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="댓글을 입력하세요..."
            className="flex-1 rounded-full border-none bg-white px-4 py-2.5 text-sm text-black placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          <button
            type="button"
            onClick={submit}
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            등록
          </button>
        </div>
      </aside>
    </>
  );
}
