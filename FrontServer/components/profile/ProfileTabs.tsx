"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FolderOpen, Heart, Play } from "lucide-react";

export type TabKey = "videos" | "playlists" | "likes";
export type SortKey = "latest" | "popular" | "oldest";

type Props = {
  tab: TabKey;
  sort: SortKey;
  onTab: (t: TabKey) => void;
  onSort: (s: SortKey) => void;
};

const tabs: { key: TabKey; label: string; icon: ReactNode }[] = [
  { key: "videos", label: "동영상", icon: <Play size={16} /> },
  { key: "playlists", label: "재생목록", icon: <FolderOpen size={16} /> },
  { key: "likes", label: "좋아요", icon: <Heart size={16} /> },
];

const sorts: { key: SortKey; label: string }[] = [
  { key: "latest", label: "최신" },
  { key: "popular", label: "인기" },
  { key: "oldest", label: "오래된 순" },
];

export default function ProfileTabs({ tab, sort, onTab, onSort }: Props) {
  return (
    <section className="flex flex-col gap-3 border-b border-[var(--border)] pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onTab(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition",
              tab === t.key
                ? "bg-[var(--btn)] text-[var(--text)]"
                : "text-[var(--text-muted)] hover:bg-[var(--btn)]/60"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        {tab !== "playlists" &&
          sorts.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onSort(s.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                sort === s.key
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--btn)] text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
            >
              {s.label}
            </button>
          ))}
      </div>
    </section>
  );
}
