"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import type { Short } from "@/types";
import { formatCount } from "@/lib/utils";
import ShortActions from "./ShortActions";

type Props = {
  short: Short;
  active: boolean;
  liked: boolean;
  disliked: boolean;
  onLike: () => void;
  onDislike: () => void;
  onComment: () => void;
  onShare: () => void;
};

export default function ShortCard({
  short,
  active,
  liked,
  disliked,
  onLike,
  onDislike,
  onComment,
  onShare,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (active) {
      void v
        .play()
        .then(() => {
          queueMicrotask(() => setPlaying(true));
        })
        .catch(() => {
          queueMicrotask(() => setPlaying(false));
        });
    } else {
      v.pause();
      queueMicrotask(() => setPlaying(false));
    }
  }, [active]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v
        .play()
        .then(() => setPlaying(true))
        .catch(() => undefined);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  return (
    <article className="short-snap-item relative flex h-[calc(100dvh-3.5rem)] w-full shrink-0 items-center justify-center px-2 py-3 sm:px-4">
      <div className="relative h-full w-full max-w-[420px] overflow-hidden rounded-3xl bg-black shadow-[var(--shadow)]">
        <div
          className="absolute inset-0"
          style={{ background: short.gradient }}
        />

        {short.videoUrl ? (
          <video
            ref={videoRef}
            src={short.videoUrl}
            className="absolute inset-0 h-full w-full object-cover"
            loop
            muted={muted}
            playsInline
            onClick={togglePlay}
          />
        ) : (
          <button
            type="button"
            className="absolute inset-0 flex items-center justify-center"
            onClick={togglePlay}
            aria-label="재생"
          >
            <Play className="h-16 w-16 text-white/80" />
          </button>
        )}

        {!playing && short.videoUrl && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/40 p-4">
              <Play className="h-10 w-10 text-white" fill="white" />
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute bottom-5 left-4 right-16 z-10 text-white">
          <h3 className="text-base font-bold leading-snug drop-shadow sm:text-lg">
            {short.title}
          </h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-white/90">
            <Link
              href={`/profile/${short.author.id}`}
              className="pointer-events-auto font-semibold hover:underline"
            >
              @{short.author.handle}
            </Link>
            <span>·</span>
            <span>{formatCount(short.likes)} 좋아요</span>
            <span>·</span>
            <span>{formatCount(short.comments)} 댓글</span>
          </p>
          {short.description && (
            <p className="mt-1 line-clamp-2 text-xs text-white/75">
              {short.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full glass-btn text-white"
          aria-label={muted ? "소리 켜기" : "음소거"}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        <ShortActions
          liked={liked}
          disliked={disliked}
          likes={short.likes}
          comments={short.comments}
          onLike={onLike}
          onDislike={onDislike}
          onComment={onComment}
          onShare={onShare}
          overlay
        />
      </div>
    </article>
  );
}
