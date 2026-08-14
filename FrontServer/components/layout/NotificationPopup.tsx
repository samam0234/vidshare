"use client";

import Link from "next/link";
import { Settings, X } from "lucide-react";
import { formatSerial, useContentStore } from "@/lib/content-store";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  className?: string;
};

export default function NotificationPopup({ open, onClose, className }: Props) {
  const { notifications } = useContentStore();

  if (!open) return null;

  const items = notifications.slice(0, 6);

  return (
    <div
      className={cn(
        "absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]",
        className
      )}
      role="dialog"
      aria-label="알림"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
        <span className="text-sm font-semibold">알림</span>
        <div className="flex items-center gap-1">
          <Link
            href="/notifications"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--btn)] hover:text-[var(--text)]"
            aria-label="알림 설정"
          >
            <Settings size={16} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--btn)] hover:text-[var(--text)]"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="custom-scroll max-h-72 overflow-y-auto">
        {items.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
            새 알림이 없습니다.
          </p>
        )}
        {items.map((n) => (
          <Link
            key={n.id}
            href={`/notifications/${n.id}`}
            onClick={onClose}
            className={cn(
              "block border-b border-[var(--border)] px-4 py-3 text-sm transition-colors hover:bg-[var(--btn)]",
              !n.read && "bg-[var(--accent)]/5"
            )}
          >
            <span className="mr-1.5 font-mono text-[11px] text-[var(--accent)]">
              {formatSerial(n.id)}
            </span>
            {n.message}
          </Link>
        ))}
      </div>
      <Link
        href="/notifications"
        onClick={onClose}
        className="block border-t border-[var(--border)] px-4 py-3 text-center text-sm font-medium text-[var(--accent)] hover:bg-[var(--btn)]"
      >
        모든 알림 보기
      </Link>
    </div>
  );
}
