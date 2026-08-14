"use client";

import Link from "next/link";
import { formatWhen, useContentStore } from "@/lib/content-store";
import SerialBadge from "@/components/ui/SerialBadge";

export default function CommunityDetail({ id }: { id: string }) {
  const num = Number(id);
  const { getCommunity } = useContentStore();
  const item = Number.isFinite(num) ? getCommunity(num) : undefined;

  if (!item) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 text-center">
        <p className="text-[var(--text-muted)]">글을 찾을 수 없습니다.</p>
        <Link href="/community" className="mt-3 inline-block text-sm text-[var(--accent)]">
          목록으로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link href="/community" className="text-sm text-[var(--accent)] hover:underline">
        ← 커뮤니티
      </Link>
      <article className="surface mt-4 rounded-3xl p-6">
        <div className="flex flex-wrap items-center gap-2">
          <SerialBadge id={item.id} />
          <span className="text-xs text-[var(--text-muted)]">
            {item.authorName} · {formatWhen(item.createdAt)}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold">{item.title}</h1>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>
      </article>
    </main>
  );
}
