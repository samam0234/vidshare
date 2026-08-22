"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toProfileVideos } from "@/lib/mock-data";
import type { Author, Short } from "@/types";
import { useAuth } from "@/context/AuthContext";
import ProfileHeader from "./ProfileHeader";
import ProfileTabs, { type SortKey, type TabKey } from "./ProfileTabs";
import VideoGrid from "./VideoGrid";

type Props = { id: string };

export default function ProfilePageClient({ id }: Props) {
  const { user } = useAuth();
  const resolvedId = id === "me" || id === "u-me" ? (user?.id ?? id) : id;

  const [author, setAuthor] = useState<Author | null>(null);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    Promise.all([api.getUser(resolvedId), api.getUserShorts(resolvedId)]).then(
      ([userRes, shortsRes]) => {
        if (cancelled) return;
        setAuthor(userRes.success && userRes.data ? userRes.data : null);
        setShorts(shortsRes.success && shortsRes.data ? shortsRes.data : []);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [resolvedId]);

  const isMe = Boolean(user && author && author.id === user.id);
  const baseVideos = useMemo(() => toProfileVideos(shorts), [shorts]);

  const [tab, setTab] = useState<TabKey>("videos");
  const [sort, setSort] = useState<SortKey>("latest");

  const videos = useMemo(() => {
    let list = [...baseVideos];
    if (tab === "playlists") {
      list = [];
    }

    if (sort === "latest") {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sort === "oldest") {
      list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else {
      list.sort((a, b) => b.likes - a.likes);
    }
    return list;
  }, [baseVideos, tab, sort]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <p className="text-sm text-[var(--text-muted)]">불러오는 중...</p>
      </main>
    );
  }

  if (!author) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <p className="text-sm text-[var(--text-muted)]">
          사용자를 찾을 수 없습니다.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <ProfileHeader
        author={author}
        isMe={isMe}
        signedIn={Boolean(user)}
        videoCount={baseVideos.length}
      />
      <div className="mt-8 space-y-5">
        <ProfileTabs
          tab={tab}
          sort={sort}
          onTab={setTab}
          onSort={setSort}
        />
        <VideoGrid
          videos={videos}
          emptyText={
            tab === "playlists"
              ? "재생목록이 아직 없습니다."
              : "표시할 영상이 없습니다."
          }
        />
      </div>
    </main>
  );
}

