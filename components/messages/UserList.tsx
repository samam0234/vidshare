"use client";

import Link from "next/link";
import type { ChatUser } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  users: ChatUser[];
  activeId: string;
  onSelect: (id: string) => void;
};

export default function UserList({ users, activeId, onSelect }: Props) {
  return (
    <aside className="flex w-full flex-col border-b border-[var(--border)] md:w-72 md:border-b-0 md:border-r">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h2 className="font-semibold">메시지</h2>
        <p className="text-xs text-[var(--text-muted)]">대화 상대</p>
      </div>
      <div className="custom-scroll flex max-h-40 flex-row gap-2 overflow-x-auto p-2 md:max-h-none md:flex-1 md:flex-col md:overflow-y-auto">
        {users.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => onSelect(u.id)}
            className={cn(
              "flex min-w-[200px] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition md:min-w-0",
              activeId === u.id
                ? "bg-[var(--btn)]"
                : "hover:bg-[var(--btn)]/60"
            )}
          >
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-sm font-bold text-white">
                {u.name.slice(0, 1)}
              </div>
              {u.online && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-elevated)] bg-[var(--success)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{u.name}</span>
                <Link
                  href={`/profile/${u.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 text-[10px] text-[var(--accent)] hover:underline"
                >
                  프로필
                </Link>
              </div>
              <p className="truncate text-xs text-[var(--text-muted)]">
                {u.lastMessage}
              </p>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
