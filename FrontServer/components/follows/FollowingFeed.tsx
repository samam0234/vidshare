"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { toProfileVideos } from "@/lib/mock-data";
import { useAuth } from "@/context/AuthContext";
import { loginHref } from "@/lib/guest-routes";
import VideoGrid from "@/components/profile/VideoGrid";
import type { Short } from "@/types";

export default function FollowingFeed() {
  const { user, ready } = useAuth();
  const [shorts, setShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await api.getFollowingFeed();
      if (cancelled) return;
      queueMicrotask(() => {
        if (res.success && res.data) {
          setShorts(res.data);
          setError(null);
        } else {
          setError(res.error ?? "피드를 불러오지 못했습니다.");
        }
        setLoading(false);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  const videos = useMemo(() => toProfileVideos(shorts), [shorts]);

  if (!ready || loading) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <p className="py-16 text-center text-sm text-[var(--text-muted)]">
          불러오는 중...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">팔로잉</h1>
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <UserPlus size={28} className="text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">
            로그인하면 팔로우한 크리에이터의 영상을 모아 볼 수 있습니다.
          </p>
          <Link
            href={loginHref("/following")}
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            로그인
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">팔로잉</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        팔로우한 크리에이터의 최신 영상입니다.
      </p>

      {error && (
        <p className="mt-8 text-center text-sm text-[var(--danger)]">{error}</p>
      )}

      {!error && videos.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <UserPlus size={28} className="text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">
            아직 팔로우한 크리에이터가 없거나, 올라온 영상이 없습니다.
          </p>
          <Link
            href="/search"
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)]"
          >
            크리에이터 찾아보기
          </Link>
        </div>
      )}

      {!error && videos.length > 0 && (
        <div className="mt-6">
          <VideoGrid videos={videos} />
        </div>
      )}
    </main>
  );
}
