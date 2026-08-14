"use client";

import Link from "next/link";
import { Clapperboard, Plus } from "lucide-react";
import { formatWhen, useContentStore } from "@/lib/content-store";
import SerialBadge from "@/components/ui/SerialBadge";

export default function LongformList() {
  const { longform } = useContentStore();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">롱폼 영상</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            작성하면 일련번호가 붙고 상세 페이지로 열립니다.
          </p>
        </div>
        <Link
          href="/longform/write"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={16} />
          롱폼 등록
        </Link>
      </div>

      {longform.length === 0 ? (
        <div className="surface mt-8 flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
          <Clapperboard className="text-[var(--text-muted)]" size={36} />
          <p className="text-sm text-[var(--text-muted)]">
            아직 등록된 롱폼이 없습니다. 첫 영상을 올려 보세요.
          </p>
          <Link
            href="/longform/write"
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            지금 등록하기
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {longform.map((v) => (
            <li key={v.id}>
              <Link
                href={`/longform/${v.id}`}
                className="surface flex gap-4 rounded-2xl p-4 transition hover:border-[var(--accent)]/40"
              >
                <div
                  className="h-20 w-32 shrink-0 rounded-xl bg-cover bg-center"
                  style={{
                    backgroundImage: v.thumb
                      ? `url(${v.thumb})`
                      : v.gradient,
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <SerialBadge id={v.id} />
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatWhen(v.createdAt)}
                    </span>
                  </div>
                  <h2 className="mt-1 truncate font-semibold">{v.title}</h2>
                  <p className="mt-0.5 line-clamp-2 text-sm text-[var(--text-muted)]">
                    {v.description || "설명 없음"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
