"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquareText, Plus } from "lucide-react";
import { formatWhen } from "@/lib/content-store";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { loginHref } from "@/lib/guest-routes";
import SerialBadge from "@/components/ui/SerialBadge";
import type { CommunityPost } from "@/types/content";

export default function CommunityList() {
  const { user } = useAuth();
  const writeHref = user ? "/community/write" : loginHref("/community/write");
  const [community, setCommunity] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.getCommunityList();
      if (cancelled) return;
      queueMicrotask(() => {
        if (res.success && res.data) {
          setCommunity(res.data);
        } else {
          setLoadError(res.error ?? "커뮤니티 글을 불러오지 못했습니다.");
        }
        setLoading(false);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">커뮤니티</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            글을 쓰면 일련번호가 생기고 상세에서 확인할 수 있습니다.
          </p>
        </div>
        {user ? (
          <Link
            href="/community/write"
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus size={16} />
            글쓰기
          </Link>
        ) : (
          <Link
            href={writeHref}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)]"
          >
            로그인하고 글쓰기
          </Link>
        )}
      </div>

      {loading ? (
        <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
          불러오는 중...
        </p>
      ) : loadError ? (
        <p className="mt-8 text-center text-sm text-[var(--danger)]">
          {loadError}
        </p>
      ) : community.length === 0 ? (
        <div className="surface mt-8 flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
          <MessageSquareText className="text-[var(--text-muted)]" size={36} />
          <p className="text-sm text-[var(--text-muted)]">
            아직 작성된 글이 없습니다.
          </p>
          <Link
            href={writeHref}
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            {user ? "첫 글 작성하기" : "로그인하고 글쓰기"}
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {community.map((p) => (
            <li key={p.id}>
              <Link
                href={`/community/${p.id}`}
                className="surface block rounded-2xl p-4 transition hover:border-[var(--accent)]/40"
              >
                <div className="flex items-center gap-2">
                  <SerialBadge id={p.id} />
                  <span className="text-xs text-[var(--text-muted)]">
                    {p.authorName} · {formatWhen(p.createdAt)}
                  </span>
                </div>
                <h2 className="mt-2 font-semibold">{p.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
                  {p.body}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
