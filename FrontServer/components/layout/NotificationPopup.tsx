"use client";

import Link from "next/link";
import { Settings, X } from "lucide-react";
import { notifications as mockNotifications } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  className?: string;
};

export default function NotificationPopup({ open, onClose, className }: Props) {
  if (!open) return null;

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
        {mockNotifications.slice(0, 6).map((n) => (
          <div
            key={n.id}
            className={cn(
              "border-b border-[var(--border)] px-4 py-3 text-sm transition-colors hover:bg-[var(--btn)]",
              !n.read && "bg-[var(--accent)]/5"
            )}
          >
            {n.message}
          </div>
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
