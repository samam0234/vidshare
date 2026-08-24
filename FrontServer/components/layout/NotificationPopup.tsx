"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCheck, FileText, Settings, Trash2, X } from "lucide-react";
import { formatSerial } from "@/lib/content-store";
import {
  clearAllNotifications,
  markAllNotificationsRead,
  setNotificationsEnabled,
  useNotifications,
  useNotificationsEnabled,
} from "@/lib/notifications-store";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function NotificationPopup({ open, onClose }: Props) {
  const { notifications, unreadCount } = useNotifications();
  const enabled = useNotificationsEnabled();
  const [view, setView] = useState<"list" | "settings">("list");

  useEffect(() => {
    if (open) queueMicrotask(() => setView("list"));
  }, [open]);

  if (!open) return null;

  const items = notifications.slice(0, 6);

  return (
    <div
      className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]"
      role="dialog"
      aria-label="알림"
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
        <div className="flex items-center gap-1">
          <Link
            href="/notifications"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--btn)] hover:text-[var(--text)]"
            aria-label="알림 목록 페이지"
          >
            <FileText size={16} />
          </Link>
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {view === "settings" ? "알림 설정" : "알림"}
            {view === "list" && unreadCount > 0 && (
              <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setView((v) => (v === "settings" ? "list" : "settings"))}
            className={cn(
              "rounded-lg p-1.5 hover:bg-[var(--btn)]",
              view === "settings"
                ? "bg-[var(--btn)] text-[var(--accent)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
            aria-label="알림 설정"
            aria-pressed={view === "settings"}
          >
            <Settings size={16} />
          </button>
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
      {view === "settings" ? (
        <div className="space-y-1 px-2 py-2">
          <div className="flex items-center justify-between rounded-xl px-3 py-2.5">
            <span className="text-sm">알림 받기</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setNotificationsEnabled(!enabled)}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                enabled ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]",
                  enabled ? "left-[1.375rem]" : "left-0.5"
                )}
              />
            </button>
          </div>
          <button
            type="button"
            disabled={unreadCount === 0}
            onClick={() => void markAllNotificationsRead()}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[var(--btn)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCheck size={16} className="text-[var(--text-muted)]" />
            모든 알림 읽음 처리
          </button>
          <button
            type="button"
            disabled={notifications.length === 0}
            onClick={() => void clearAllNotifications()}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-[var(--danger)] hover:bg-[var(--btn)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={16} />
            알림 전체 삭제
          </button>
        </div>
      ) : (
        <>
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
                  "flex items-start gap-2 border-b border-[var(--border)] px-4 py-3 text-sm transition-colors hover:bg-[var(--btn)]",
                  !n.read && "bg-[var(--accent)]/[0.06]"
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    n.read ? "bg-transparent" : "bg-[var(--accent)]"
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="mr-1.5 font-mono text-[11px] text-[var(--accent)]">
                    {formatSerial(n.id)}
                  </span>
                  <span
                    className={cn(
                      n.read
                        ? "text-[var(--text-muted)]"
                        : "font-semibold text-[var(--text)]"
                    )}
                  >
                    {n.message}
                  </span>
                </span>
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
        </>
      )}
    </div>
  );
}
