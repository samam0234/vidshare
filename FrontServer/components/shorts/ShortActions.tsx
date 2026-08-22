"use client";

import { MessageCircle, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { cn, formatCount } from "@/lib/utils";

type Props = {
  liked: boolean;
  disliked: boolean;
  likes: number;
  comments: number;
  onLike: () => void;
  onDislike: () => void;
  onComment: () => void;
  onShare: () => void;
  overlay?: boolean;
};

export default function ShortActions({
  liked,
  disliked,
  likes,
  comments,
  onLike,
  onDislike,
  onComment,
  onShare,
  overlay = false,
}: Props) {
  const btn =
    "flex h-12 w-12 items-center justify-center rounded-full glass-btn text-white transition hover:scale-110 hover:bg-white/25";

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4",
        overlay
          ? "absolute bottom-28 right-3 z-10 md:right-4"
          : "absolute -right-16 bottom-28 z-10 hidden md:flex"
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onLike}
          className={cn(btn, liked && "!bg-[var(--accent)]/90 scale-110")}
          aria-label="좋아요"
          aria-pressed={liked}
        >
          <ThumbsUp size={22} fill={liked ? "currentColor" : "none"} />
        </button>
        <span className="text-xs font-medium text-white drop-shadow">
          {formatCount(likes)}
        </span>
      </div>

      <button
        type="button"
        onClick={onDislike}
        className={cn(btn, disliked && "!bg-zinc-500/90 scale-110")}
        aria-label="싫어요"
        aria-pressed={disliked}
      >
        <ThumbsDown size={22} fill={disliked ? "currentColor" : "none"} />
      </button>

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onComment}
          className={btn}
          aria-label="댓글"
        >
          <MessageCircle size={22} />
        </button>
        <span className="text-xs font-medium text-white drop-shadow">
          {formatCount(comments)}
        </span>
      </div>

      <button type="button" onClick={onShare} className={btn} aria-label="공유">
        <Share2 size={22} />
      </button>
    </div>
  );
}
