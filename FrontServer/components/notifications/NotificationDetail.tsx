"use client";

import Link from "next/link";
import { useEffect } from "react";
import { formatWhen } from "@/lib/content-store";
import {
  markNotificationRead,
  refreshNotifications,
  useNotifications,
} from "@/lib/notifications-store";
import SerialBadge from "@/components/ui/SerialBadge";

export default function NotificationDetail({ id }: { id: string }) {
  const num = Number(id);
  const { notifications } = useNotifications();
  const item = notifications.find((n) => n.id === num);

  useEffect(() => {
    void refreshNotifications();
  }, []);

  useEffect(() => {
    if (!item || item.read) return;
    void markNotificationRead(item.id);
  }, [item]);

  if (!item) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center">
        <p className="text-[var(--text-muted)]">알림을 찾을 수 없습니다.</p>
        <Link
          href="/notifications"
          className="mt-3 inline-block text-sm text-[var(--accent)]"
        >
          목록으로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href="/notifications"
        className="text-sm text-[var(--accent)] hover:underline"
      >
        ← 알림 목록
      </Link>
      <article className="surface mt-4 rounded-3xl p-6">
        <div className="flex flex-wrap items-center gap-2">
          <SerialBadge id={item.id} />
          <span className="rounded-full bg-[var(--btn)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
            {item.category}
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {formatWhen(item.createdAt)}
          </span>
        </div>
        <p className="mt-4 text-base leading-relaxed">{item.message}</p>
        {item.href && (
          <Link
            href={item.href}
            className="mt-6 inline-block text-sm font-medium text-[var(--accent)] hover:underline"
          >
            관련 페이지 열기
          </Link>
        )}
      </article>
    </main>
  );
}
