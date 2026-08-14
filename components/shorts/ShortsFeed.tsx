"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initialComments, shorts as allShorts } from "@/lib/mock-data";
import type { Comment } from "@/types";
import ShortCard from "./ShortCard";
import ScrollNav from "./ScrollNav";
import CommentPanel from "./CommentPanel";

type Props = {
  query?: string;
  focusId?: string;
};

export default function ShortsFeed({ query, focusId }: Props) {
  const list = useMemo(() => {
    let data = allShorts;
    if (query) {
      const q = query.toLowerCase();
      data = data.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.author.handle.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q)
      );
    }
    if (focusId) {
      const idx = data.findIndex((s) => s.id === focusId);
      if (idx > 0) {
        const copy = [...data];
        const [item] = copy.splice(idx, 1);
        copy.unshift(item);
        data = copy;
      }
    }
    return data.length ? data : allShorts;
  }, [query, focusId]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [disliked, setDisliked] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeShortId, setActiveShortId] = useState(list[0]?.id ?? "");
  const [shareToast, setShareToast] = useState(false);

  const activeComments = comments.filter((c) => c.shortId === activeShortId);

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

  function toggleLike(id: string) {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
    setDisliked((prev) => ({ ...prev, [id]: false }));
  }

  function toggleDislike(id: string) {
    setDisliked((prev) => ({ ...prev, [id]: !prev[id] }));
    setLiked((prev) => ({ ...prev, [id]: false }));
  }

  function addComment(text: string) {
    setComments((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        shortId: activeShortId,
        author: "사용자",
        text,
        time: "방금 전",
      },
    ]);
  }

  function share() {
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

      <CommentPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        comments={activeComments}
        onAdd={addComment}
      />

      {shareToast && (
        <div className="fixed bottom-8 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-[var(--bg-elevated)] px-5 py-2.5 text-sm font-medium shadow-[var(--shadow)] border border-[var(--border)]">
          링크가 복사되었습니다
        </div>
      )}
    </div>
  );
}
