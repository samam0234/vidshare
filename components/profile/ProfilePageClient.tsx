"use client";

import { useMemo, useState } from "react";
import {
  currentUser,
  getAuthorById,
  getShortsByAuthor,
  profileVideosAll,
  toProfileVideos,
} from "@/lib/mock-data";
import ProfileHeader from "./ProfileHeader";
import ProfileTabs, { type SortKey, type TabKey } from "./ProfileTabs";
import VideoGrid from "./VideoGrid";

type Props = { id: string };

export default function ProfilePageClient({ id }: Props) {
  const author = getAuthorById(id) ?? currentUser;
  const isMe = author.id === currentUser.id;

  const authorShorts = getShortsByAuthor(author.id);
  const fallbackShorts =
    authorShorts.length > 0
      ? authorShorts
      : isMe
        ? getShortsByAuthor("u1")
        : getShortsByAuthor(author.id);

  const baseVideos =
    fallbackShorts.length > 0
      ? toProfileVideos(fallbackShorts)
      : profileVideosAll.slice(0, isMe ? undefined : 3);

  const [tab, setTab] = useState<TabKey>("videos");
  const [sort, setSort] = useState<SortKey>("latest");

  const videos = useMemo(() => {
    let list = [...baseVideos];
    if (tab === "likes") {
      list = profileVideosAll.slice().sort((a, b) => b.likes - a.likes);
    } else if (tab === "playlists") {
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

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <ProfileHeader
        author={author}
        isMe={isMe}
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
