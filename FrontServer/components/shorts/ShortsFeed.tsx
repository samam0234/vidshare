"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Comment, Short } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { loginHref } from "@/lib/guest-routes";
import ShortCard from "./ShortCard";
import ScrollNav from "./ScrollNav";
import CommentPanel from "./CommentPanel";

type Props = {
  query?: string;
  focusId?: string;
};

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
    if (!focusId) return shorts;
    const idx = shorts.findIndex((s) => s.id === focusId);
    if (idx <= 0) return shorts;
    const copy = [...shorts];
    const [item] = copy.splice(idx, 1);
    copy.unshift(item);
    return copy;
  }, [shorts, focusId]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [disliked, setDisliked] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeShortId, setActiveShortId] = useState("");
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setIndex(0);
      setActiveShortId(list[0]?.id ?? "");
    });
  }, [list]);

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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout>;
    function onScroll() {
      clearTimeout(timer);
      timer = setTimeout(() => {
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
      }, 80);
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
    };
  }, [list]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (index < list.length - 1) scrollToIndex(index + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (index > 0) scrollToIndex(index - 1);
      } else if (e.key === "Escape") {
        setPanelOpen(false);
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
    const res = await api.postComment(activeShortId, text, user.name, parentId);
    if (res.success && res.data) {
      const created = res.data;
      setComments((prev) => [...prev, created]);
      setShorts((prev) =>
        prev.map((s) =>
          s.id === activeShortId ? { ...s, comments: s.comments + 1 } : s
        )
      );
    }
  }

  function share() {
    if (!requireMember()) return;
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => undefined);
    }
    setShareToast(true);
    setTimeout(() => setShareToast(false), 1800);
  }

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
        canWrite={Boolean(user)}
      />

      {shareToast && (
        <div className="fixed bottom-8 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-[var(--bg-elevated)] px-5 py-2.5 text-sm font-medium shadow-[var(--shadow)] border border-[var(--border)]">
          링크가 복사되었습니다
        </div>
      )}
    </div>
  );
}
