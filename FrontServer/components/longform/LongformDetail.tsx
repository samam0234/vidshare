"use client";

import Link from "next/link";
import { formatWhen, useContentStore } from "@/lib/content-store";
import SerialBadge from "@/components/ui/SerialBadge";

export default function LongformDetail({ id }: { id: string }) {
  const num = Number(id);
  const { getLongform } = useContentStore();
  const item = Number.isFinite(num) ? getLongform(num) : undefined;

  if (!item) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 text-center">
        <p className="text-[var(--text-muted)]">해당 롱폼을 찾을 수 없습니다.</p>
        <Link href="/longform" className="mt-3 inline-block text-sm text-[var(--accent)]">
          목록으로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link href="/longform" className="text-sm text-[var(--accent)] hover:underline">
        ← 롱폼 목록
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SerialBadge id={item.id} />
        <span className="text-xs text-[var(--text-muted)]">
          {item.authorName} · {formatWhen(item.createdAt)}
        </span>
      </div>
      <h1 className="mt-2 text-2xl font-bold">{item.title}</h1>
      <div
        className="mt-5 aspect-video overflow-hidden rounded-3xl bg-cover bg-center"
        style={{
          backgroundImage: item.thumb ? `url(${item.thumb})` : item.gradient,
        }}
      >
        {item.videoUrl ? (
          <video
            src={item.videoUrl}
            controls
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      {item.description && (
        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">
          {item.description}
        </p>
      )}
    </main>
  );
}
