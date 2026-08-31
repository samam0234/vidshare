"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Author } from "@/types";

type Kind = "followers" | "following";

const LABEL: Record<Kind, { title: string; empty: string }> = {
  followers: {
    title: "팔로워",
    empty: "아직 팔로워가 없습니다.",
  },
  following: {
    title: "팔로잉",
    empty: "아직 팔로우한 사람이 없습니다.",
  },
};

export default function FollowList({ id, kind }: { id: string; kind: Kind }) {
  const [author, setAuthor] = useState<Author | null>(null);
  const [people, setPeople] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [userRes, listRes] = await Promise.all([
        api.getUser(id),
        kind === "followers" ? api.getFollowers(id) : api.getFollowing(id),
      ]);
      if (cancelled) return;
      queueMicrotask(() => {
        setAuthor(userRes.success && userRes.data ? userRes.data : null);
        if (listRes.success && listRes.data) {
          setPeople(listRes.data);
          setError(null);
        } else {
          setError(listRes.error ?? "목록을 불러오지 못했습니다.");
        }
        setLoading(false);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [id, kind]);

  const label = LABEL[kind];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href={`/profile/${id}`}
        className="text-sm text-[var(--accent)] hover:underline"
      >
        ← 프로필로
      </Link>

      <h1 className="mt-3 text-2xl font-bold">
        {author ? `${author.name} 님의 ${label.title}` : label.title}
      </h1>

      <div className="mt-4 flex gap-1">
        {(["followers", "following"] as Kind[]).map((k) => (
          <Link
            key={k}
            href={`/profile/${id}/${k}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              kind === k
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--btn)] text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            {LABEL[k].title}
          </Link>
        ))}
      </div>

      {loading && (
        <p className="py-16 text-center text-sm text-[var(--text-muted)]">
          불러오는 중...
        </p>
      )}

      {error && (
        <p className="py-16 text-center text-sm text-[var(--danger)]">{error}</p>
      )}

      {!loading && !error && people.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Users size={28} className="text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">{label.empty}</p>
        </div>
      )}

      {!loading && !error && people.length > 0 && (
        <ul className="mt-5 space-y-2">
          {people.map((p) => (
            <li key={p.id}>
              <Link
                href={`/profile/${p.id}`}
                className="surface flex items-center gap-3 rounded-2xl px-4 py-3 transition hover:border-[var(--accent)]/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-sky-500 to-pink-500 text-sm font-bold text-white">
                  {p.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {p.name}
                  </span>
                  <span className="block truncate text-xs text-[var(--text-muted)]">
                    @{p.handle}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
