"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownRight, X } from "lucide-react";
import type { Comment } from "@/types";

type Props = {
  open: boolean;
  onClose: () => void;
  comments: Comment[];
  onAdd: (text: string, parentId?: string) => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  canWrite?: boolean;
  currentUserId?: string;
};

export default function CommentPanel({
  open,
  onClose,
  comments,
  onAdd,
  onEdit,
  onDelete,
  canWrite = true,
  currentUserId,
}: Props) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const threads = useMemo(() => {
    const roots = comments.filter((c) => !c.parentId);
    const byParent = new Map<string, Comment[]>();
    for (const c of comments) {
      if (!c.parentId) continue;
      const list = byParent.get(c.parentId) ?? [];
      list.push(c);
      byParent.set(c.parentId, list);
    }
    return roots.map((root) => ({
      root,
      replies: byParent.get(root.id) ?? [],
    }));
  }, [comments]);

  useEffect(() => {
    if (open && canWrite) {
      inputRef.current?.focus();
    }
  }, [open, canWrite]);

  useEffect(() => {
    if (!open) queueMicrotask(() => setReplyTo(null));
  }, [open]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [comments.length, open]);

  function submit() {
    const t = text.trim();
    if (!t) return;
    onAdd(t, replyTo?.id);
    setText("");
    setReplyTo(null);
  }

  function startReply(c: Comment) {
    setReplyTo(c);
    inputRef.current?.focus();
  }

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[90] bg-black/40 md:bg-transparent"
        aria-label="댓글 패널 닫기"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-14 z-[100] flex h-[calc(100%-3.5rem)] w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]"
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
          {threads.map(({ root, replies }) => (
            <div key={root.id} className="flex flex-col gap-3">
              <CommentItem
                comment={root}
                canWrite={canWrite}
                canManage={root.authorId === currentUserId}
                onReply={() => startReply(root)}
                onEdit={(text) => onEdit(root.id, text)}
                onDelete={() => onDelete(root.id)}
              />
              {replies.length > 0 && (
                <div className="ml-6 flex flex-col gap-3 border-l border-[var(--border)] pl-4">
                  {replies.map((r) => (
                    <CommentItem
                      key={r.id}
                      comment={r}
                      canWrite={canWrite}
                      canManage={r.authorId === currentUserId}
                      onReply={() => startReply(root)}
                      onEdit={(text) => onEdit(r.id, text)}
                      onDelete={() => onDelete(r.id)}
                      small
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {canWrite ? (
          <div className="border-t border-[var(--border)] bg-[var(--bg-card)] p-3">
            {replyTo && (
              <div className="mb-2 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <CornerDownRight size={13} />
                <span className="min-w-0 flex-1 truncate">
                  {replyTo.author} 님에게 답글
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="rounded px-1.5 py-0.5 hover:bg-[var(--btn)] hover:text-[var(--text)]"
                >
                  취소
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                  if (e.key === "Escape") setReplyTo(null);
                }}
                placeholder={
                  replyTo ? "답글을 입력하세요..." : "댓글을 입력하세요..."
                }
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
          </div>
        ) : (
          <div className="border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-center text-sm text-[var(--text-muted)]">
            댓글을 쓰려면{" "}
            <a href="/login?next=/" className="font-medium text-[var(--accent)] hover:underline">
              로그인
            </a>
            이 필요합니다.
          </div>
        )}
      </aside>
    </>
  );
}

function CommentItem({
  comment,
  canWrite,
  canManage,
  onReply,
  onEdit,
  onDelete,
  small,
}: {
  comment: Comment;
  canWrite: boolean;
  canManage: boolean;
  onReply: () => void;
  onEdit: (text: string) => void;
  onDelete: () => void;
  small?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);

  function saveEdit() {
    const t = draft.trim();
    if (t && t !== comment.text) onEdit(t);
    setEditing(false);
  }

  return (
    <div className="flex gap-3">
      <div
        className={
          small
            ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-[10px] font-bold text-white"
            : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-xs font-bold text-white"
        }
      >
        {comment.author.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{comment.author}</div>
        {editing ? (
          <div className="mt-1 flex gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
              className="flex-1 rounded-full border-none bg-white px-3 py-1.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <button
              type="button"
              onClick={saveEdit}
              className="shrink-0 rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
            >
              저장
            </button>
          </div>
        ) : (
          <p className="mt-0.5 text-sm text-[var(--text)]">{comment.text}</p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)]">
            {comment.time}
          </span>
          {canWrite && !editing && (
            <button
              type="button"
              onClick={onReply}
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              답글
            </button>
          )}
          {canManage && !editing && (
            <>
              <button
                type="button"
                onClick={() => {
                  setDraft(comment.text);
                  setEditing(true);
                }}
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                수정
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--danger)]"
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
