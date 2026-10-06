"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Comment, Short } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { loginHref } from "@/lib/guest-routes";
import {
  readHiddenIds,
  withHiddenId,
  withoutHiddenId,
  writeHiddenIds,
} from "@/lib/hidden-shorts";
import ShortCard from "./ShortCard";
import ScrollNav from "./ScrollNav";
import CommentPanel from "./CommentPanel";

type Props = {
  query?: string;
  focusId?: string;
};

type Toast = { text: string; undo?: () => void };

export default function ShortsFeed({ query, focusId }: Props) {
  const { user } = useAuth();
  const router = useRouter();

  function requireMember() {
    if (user) return true;
    router.push(loginHref("/"));
    return false;
  }

  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 비로그인 시청자의 "비추천" — 이 브라우저에만 저장된다(로그인하면 서버가 거른다).
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  useEffect(() => {
    queueMicrotask(() => setHiddenIds(readHiddenIds()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    api.getShorts(query).then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        setShorts(res.data);
        setLoadError(null);
      } else {
        setShorts([]);
        setLoadError(res.error ?? "쇼츠를 불러오지 못했습니다.");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const list = useMemo(() => {
    // 검색어로 찾을 때는 비추천한 영상도 보여 준다(서버 규칙과 같다)
    const hidden = !user && !query ? new Set(hiddenIds) : null;
    const base = hidden ? shorts.filter((s) => !hidden.has(s.id)) : shorts;
    if (!focusId) return base;
    const idx = base.findIndex((s) => s.id === focusId);
    if (idx <= 0) return base;
    const copy = [...base];
    const [item] = copy.splice(idx, 1);
    copy.unshift(item);
    return copy;
  }, [shorts, focusId, user, query, hiddenIds]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [disliked, setDisliked] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeShortId, setActiveShortId] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const listRef = useRef(list);
  useEffect(() => {
    listRef.current = list;
  });

  // 새로 불러왔거나 검색어·포커스가 바뀌면 맨 위에서 시작한다.
  // (좋아요·수정처럼 목록이 갱신될 때마다 처음으로 돌아가지는 않는다)
  useEffect(() => {
    if (loading) return;
    queueMicrotask(() => {
      setIndex(0);
      setActiveShortId(listRef.current[0]?.id ?? "");
    });
  }, [loading, query, focusId]);

  useEffect(() => {
    if (!activeShortId) {
      queueMicrotask(() => setComments([]));
      return;
    }
    let cancelled = false;
    api.getComments(activeShortId).then((res) => {
      if (cancelled) return;
      setComments(res.success && res.data ? res.data : []);
    });
    return () => {
      cancelled = true;
    };
  }, [activeShortId]);

  const scrollToIndex = useCallback((i: number) => {
    const el = containerRef.current;
    if (!el) return;
    const child = el.children[i] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({ top: child.offsetTop, behavior: "smooth" });
    setIndex(i);
    setActiveShortId(list[i]?.id ?? "");
  }, [list]);

  /** 스크롤 위치에서 가장 가까운 카드를 현재 카드로 맞춘다. */
  const syncActiveFromScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    let closest = 0;
    let min = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const dist = Math.abs((child as HTMLElement).offsetTop - scrollTop);
      if (dist < min) {
        min = dist;
        closest = i;
      }
    });
    setIndex(closest);
    setActiveShortId(list[closest]?.id ?? "");
  }, [list]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout>;
    function onScroll() {
      clearTimeout(timer);
      timer = setTimeout(syncActiveFromScroll, 80);
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
    };
  }, [syncActiveFromScroll]);

  // 카드가 빠지면(비추천·삭제·차단) 같은 스크롤 위치에 다음 카드가 올라오므로 현재 카드를 다시 맞춘다.
  const count = list.length;
  useEffect(() => {
    const frame = requestAnimationFrame(syncActiveFromScroll);
    return () => cancelAnimationFrame(frame);
  }, [count, syncActiveFromScroll]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPanelOpen(false);
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      // 입력칸·대화상자에서는 방향키를 그대로 쓴다(글 속 커서 이동 등)
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")
      ) {
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (index < list.length - 1) scrollToIndex(index + 1);
      } else {
        e.preventDefault();
        if (index > 0) scrollToIndex(index - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, list.length, scrollToIndex]);

  async function toggleLike(id: string) {
    if (!requireMember()) return;
    const willLike = !liked[id];
    setLiked((prev) => ({ ...prev, [id]: willLike }));
    setDisliked((prev) => ({ ...prev, [id]: false }));
    const res = await api.likeShort(id, willLike ? "like" : "unlike");
    if (res.success && res.data) {
      const nextLikes = res.data.likes;
      setShorts((prev) =>
        prev.map((s) => (s.id === id ? { ...s, likes: nextLikes } : s))
      );
    }
  }

  function toggleDislike(id: string) {
    if (!requireMember()) return;
    setDisliked((prev) => ({ ...prev, [id]: !prev[id] }));
    setLiked((prev) => ({ ...prev, [id]: false }));
  }

  async function addComment(text: string, parentId?: string) {
    if (!user || !activeShortId) return;
    const res = await api.postComment(activeShortId, text, parentId);
    if (res.success && res.data) {
      const created = res.data;
      setComments((prev) => [...prev, created]);
      setShorts((prev) =>
        prev.map((s) =>
          s.id === activeShortId ? { ...s, comments: s.comments + 1 } : s
        )
      );
    } else if (res.error) {
      notify(res.error);
    }
  }

  async function editComment(id: string, text: string) {
    const res = await api.patchComment(id, text);
    if (res.success && res.data) {
      const updated = res.data;
      setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
    }
  }

  async function removeComment(id: string) {
    if (!activeShortId) return;
    const target = comments.find((c) => c.id === id);
    if (!target) return;
    const removedCount =
      1 + comments.filter((c) => c.parentId === id).length;
    const res = await api.deleteComment(id);
    if (res.success) {
      setComments((prev) =>
        prev.filter((c) => c.id !== id && c.parentId !== id)
      );
      setShorts((prev) =>
        prev.map((s) =>
          s.id === activeShortId
            ? { ...s, comments: Math.max(0, s.comments - removedCount) }
            : s
        )
      );
    }
  }

  function notify(text: string, undo?: () => void) {
    clearTimeout(toastTimer.current);
    setToast({ text, undo });
    toastTimer.current = setTimeout(() => setToast(null), undo ? 6000 : 2200);
  }

  function share() {
    if (!requireMember()) return;
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => undefined);
    }
    notify("링크가 복사되었습니다");
  }

  // ---- ⋮ 설정 메뉴에서 오는 변경 -------------------------------------------

  function onEdited(updated: Short) {
    setShorts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }

  function onDeleted(id: string) {
    setShorts((prev) => prev.filter((s) => s.id !== id));
    if (id === activeShortId) setPanelOpen(false);
  }

  function onBlocked(authorId: string) {
    setShorts((prev) => prev.filter((s) => s.author.id !== authorId));
  }

  /** 비추천: 이 시청자의 추천에서만 영상을 뺀다. 로그인하면 서버에, 아니면 이 브라우저에 저장한다. */
  async function onNotInterested(short: Short) {
    const at = shorts.findIndex((s) => s.id === short.id);
    if (user) {
      const res = await api.dislikeShort(short.id);
      if (!res.success) {
        notify(res.error ?? "처리하지 못했어요");
        return;
      }
    } else {
      const next = withHiddenId(readHiddenIds(), short.id);
      writeHiddenIds(next);
      setHiddenIds(next);
    }
    setShorts((prev) => prev.filter((s) => s.id !== short.id));
    if (short.id === activeShortId) setPanelOpen(false);
    notify("이 영상을 추천에서 제외했어요", () => void undoNotInterested(short, at));
  }

  async function undoNotInterested(short: Short, at: number) {
    if (user) {
      const res = await api.undislikeShort(short.id);
      if (!res.success) {
        notify(res.error ?? "되돌리지 못했어요");
        return;
      }
    } else {
      const next = withoutHiddenId(readHiddenIds(), short.id);
      writeHiddenIds(next);
      setHiddenIds(next);
    }
    setShorts((prev) => {
      if (prev.some((s) => s.id === short.id)) return prev;
      const copy = [...prev];
      copy.splice(Math.min(Math.max(at, 0), copy.length), 0, short);
      return copy;
    });
    notify("다시 추천에 포함했어요");
  }

  const activeShort = list.find((s) => s.id === activeShortId);

  return (
    <div className="relative flex flex-1 flex-col bg-[var(--bg)]">
      {query && (
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-center text-sm text-[var(--text-muted)]">
          &ldquo;{query}&rdquo; 검색 결과 · {list.length}개
        </div>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">
          쇼츠를 불러오는 중...
        </div>
      ) : loadError ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">
          {loadError}
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">
          표시할 쇼츠가 없습니다.
        </div>
      ) : (
        <div className="relative mx-auto flex w-full max-w-5xl flex-1">
          <div
            ref={containerRef}
            className="shorts-snap hide-scrollbar h-[calc(100dvh-3.5rem)] w-full flex-1 overflow-y-scroll"
          >
            {list.map((short, i) => (
              <ShortCard
                key={short.id}
                short={short}
                active={i === index}
                liked={!!liked[short.id]}
                disliked={!!disliked[short.id]}
                onLike={() => toggleLike(short.id)}
                onDislike={() => toggleDislike(short.id)}
                onComment={() => {
                  setActiveShortId(short.id);
                  setPanelOpen(true);
                }}
                onShare={share}
                onEdited={onEdited}
                onDeleted={onDeleted}
                onNotInterested={(s) => void onNotInterested(s)}
                onBlocked={onBlocked}
                notify={(text) => notify(text)}
              />
            ))}
          </div>

          <div className="pointer-events-none absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 md:block lg:right-8">
            <ScrollNav
              onUp={() => index > 0 && scrollToIndex(index - 1)}
              onDown={() => index < list.length - 1 && scrollToIndex(index + 1)}
              canUp={index > 0}
              canDown={index < list.length - 1}
            />
          </div>
        </div>
      )}

      <CommentPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        comments={comments}
        onAdd={addComment}
        onEdit={editComment}
        onDelete={removeComment}
        canWrite={Boolean(user)}
        commentsClosed={activeShort?.commentsEnabled === false}
        currentUserId={user?.id}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-8 left-1/2 z-[120] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-2.5 text-sm font-medium shadow-[var(--shadow)]"
        >
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                const undo = toast.undo;
                clearTimeout(toastTimer.current);
                setToast(null);
                undo?.();
              }}
              className="shrink-0 whitespace-nowrap font-semibold text-[var(--accent)] hover:underline"
            >
              되돌리기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
