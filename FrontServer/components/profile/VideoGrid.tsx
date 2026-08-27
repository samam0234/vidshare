"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import type { ProfileVideo } from "@/types";
import { mediaUrl } from "@/lib/media";

type Props = {
  videos: ProfileVideo[];
  emptyText?: string;
};

export default function VideoGrid({ videos, emptyText }: Props) {
  if (videos.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-[var(--text-muted)]">
        {emptyText ?? "표시할 영상이 없습니다."}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {videos.map((v) => (
        <Link
          key={v.id}
          href={`/?id=${v.shortId}`}
          className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-[var(--border)] shadow-sm transition hover:scale-[1.02] hover:shadow-lg"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={
              v.thumb
                ? { backgroundImage: `url(${mediaUrl(v.thumb)})` }
                : { background: v.gradient }
            }
          />
          <div className="absolute inset-0 bg-black/20 transition group-hover:bg-black/10" />
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
            <Play size={12} fill="white" />
            {v.views} views
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <p className="line-clamp-2 text-xs font-medium text-white">
              {v.title}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
