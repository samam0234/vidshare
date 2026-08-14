"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageCircle, Plus } from "lucide-react";
import { addConversation, formatWhen, useContentStore } from "@/lib/content-store";
import SerialBadge from "@/components/ui/SerialBadge";

export default function MessagesPageClient() {
  const router = useRouter();
  const { conversations } = useContentStore();
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  function createTarget() {
    if (!name.trim()) {
      alert("상대 이름을 입력해 주세요.");
      return;
    }
    const conv = addConversation({ targetName: name });
    setName("");
    setOpen(false);
    router.push(`/messages/${conv.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">메시지</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            대화 상대를 추가하면 대상 번호가 생기고, 채팅은 상세에서 작성됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={16} />
          상대 추가
        </button>
      </div>

      {open && (
        <div className="surface mt-4 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 space-y-1.5">
            <span className="text-sm font-semibold">상대 이름</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createTarget();
              }}
              placeholder="예: 깃털유머"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={createTarget}
            className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            추가하고 채팅 열기
          </button>
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="surface mt-8 flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
          <MessageCircle className="text-[var(--text-muted)]" size={36} />
          <p className="text-sm text-[var(--text-muted)]">
            더미 대화 상대는 없습니다. 상대를 추가하면 목록에 뜹니다.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                className="surface flex items-center gap-3 rounded-2xl px-4 py-3.5 transition hover:border-[var(--accent)]/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-sm font-bold text-white">
                  {c.targetName.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <SerialBadge id={c.id} />
                    <span className="truncate font-semibold">{c.targetName}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatWhen(c.createdAt)}
                    </span>
                  </div>
                  <p className="truncate text-sm text-[var(--text-muted)]">
                    {c.lastMessage || "아직 메시지가 없습니다"}
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
