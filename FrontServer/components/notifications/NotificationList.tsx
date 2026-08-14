"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { notifications as seed } from "@/lib/mock-data";
import type { Notification, NotificationCategory } from "@/types";
import { cn } from "@/lib/utils";

const tabs: { key: "all" | NotificationCategory; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "comment", label: "댓글" },
  { key: "mention", label: "멘션" },
  { key: "like", label: "좋아요" },
  { key: "system", label: "시스템/관리자" },
  { key: "follower", label: "팔로워" },
];

export default function NotificationList() {
  const [items, setItems] = useState<Notification[]>(seed);
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuId(null);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const filtered =
    tab === "all" ? items : items.filter((n) => n.category === tab);

  function hide(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
    setMenuId(null);
  }

  function mute(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, message: `🔕 ${n.message.replace(/^[^\s]+\s/, "")}` } : n))
    );
    setMenuId(null);
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">알림</h1>

      <div className="custom-scroll mt-5 flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              tab === t.key
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--btn)] text-[var(--text-muted)] hover:text-[var(--text)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-2" ref={menuRef}>
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-[var(--text-muted)]">
            알림이 없습니다.
          </p>
        )}
        {filtered.map((n) => (
          <div
            key={n.id}
            className={cn(
              "surface relative flex items-start gap-3 rounded-2xl px-4 py-3.5 transition hover:border-[var(--accent)]/40",
              !n.read && "ring-1 ring-[var(--accent)]/20"
            )}
          >
            <div className="min-w-0 flex-1 text-sm leading-relaxed">
              {n.message}
            </div>
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuId((id) => (id === n.id ? null : n.id));
                }}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--btn)] hover:text-[var(--text)]"
                aria-label="더보기"
              >
                <MoreVertical size={16} />
              </button>
              {menuId === n.id && (
                <div className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow)]">
                  <button
                    type="button"
                    className="block w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--btn)]"
                    onClick={() => hide(n.id)}
                  >
                    👁‍ 알림 숨기기
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--btn)]"
                    onClick={() => mute(n.id)}
                  >
                    🔕 알림 받지 않기
                  </button>
                  <button
                    type="button"
                    className="block w-full px-3 py-2.5 text-left text-sm text-[var(--danger)] hover:bg-[var(--btn)]"
                    onClick={() => hide(n.id)}
                  >
                    ❌ 해당 알림 삭제
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
