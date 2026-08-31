"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toProfileVideos } from "@/lib/mock-data";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/context/AuthContext";
import ProfileHeader from "./ProfileHeader";
import ProfileTabs, { type SortKey, type TabKey } from "./ProfileTabs";
import VideoGrid from "./VideoGrid";
import PlaylistTab from "./PlaylistTab";

type Props = { id: string };

export default function ProfilePageClient({ id }: Props) {
  const { user } = useAuth();
  const resolvedId = id === "me" || id === "u-me" ? (user?.id ?? id) : id;

  const { data: author = null, isLoading: authorLoading } = useQuery({
    queryKey: queryKeys.user(resolvedId),
    queryFn: async () => {
      const res = await api.getUser(resolvedId);
      return res.success && res.data ? res.data : null;
    },
  });
  const { data: shorts = [], isLoading: shortsLoading } = useQuery({
    queryKey: queryKeys.userShorts(resolvedId),
    queryFn: async () => {
      const res = await api.getUserShorts(resolvedId);
      return res.success && res.data ? res.data : [];
    },
  });
  const loading = authorLoading || shortsLoading;

  const isMe = Boolean(user && author && author.id === user.id);
  const baseVideos = useMemo(() => toProfileVideos(shorts), [shorts]);

  const [tab, setTab] = useState<TabKey>("videos");
  const [sort, setSort] = useState<SortKey>("latest");

  const videos = useMemo(() => {
    const list = [...baseVideos];

    if (sort === "latest") {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sort === "oldest") {
      list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else {
      list.sort((a, b) => b.likes - a.likes);
    }
    return list;
  }, [baseVideos, sort]);

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
        {tab === "playlists" ? (
          <PlaylistTab ownerId={author.id} isMe={isMe} />
        ) : (
          <VideoGrid videos={videos} emptyText="표시할 영상이 없습니다." />
        )}
      </div>
    </main>
  );
}

