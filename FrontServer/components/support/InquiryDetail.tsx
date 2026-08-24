"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatWhen } from "@/lib/content-store";
import { api } from "@/lib/api";
import SerialBadge from "@/components/ui/SerialBadge";
import type { SupportInquiry } from "@/types/content";

export default function InquiryDetail({ id }: { id: string }) {
  const num = Number(id);
  const [item, setItem] = useState<SupportInquiry | null | undefined>(undefined);

  useEffect(() => {
    if (!Number.isFinite(num)) {
      queueMicrotask(() => setItem(null));
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await api.getInquiry(num);
      if (cancelled) return;
      queueMicrotask(() => {
        setItem(res.success && res.data ? res.data : null);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [num]);

  if (item === undefined) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center">
        <p className="text-sm text-[var(--text-muted)]">불러오는 중...</p>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center">
        <p className="text-[var(--text-muted)]">문의를 찾을 수 없습니다.</p>
        <Link href="/support" className="mt-3 inline-block text-sm text-[var(--accent)]">
          고객센터로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link href="/support" className="text-sm text-[var(--accent)] hover:underline">
        ← 고객센터
      </Link>
      <article className="surface mt-4 rounded-3xl p-6">
        <div className="flex flex-wrap items-center gap-2">
          <SerialBadge id={item.id} />
          <span className="text-xs text-[var(--text-muted)]">
            {item.authorName} · {formatWhen(item.createdAt)}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold">{item.subject}</h1>
        <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">{item.body}</p>
      </article>
    </main>
  );
}
