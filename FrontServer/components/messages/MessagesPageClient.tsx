"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle, Plus } from "lucide-react";
import { formatWhen } from "@/lib/content-store";
import { api } from "@/lib/api";
import { onChatLine } from "@/lib/chat-socket";
import SerialBadge from "@/components/ui/SerialBadge";
import type { Conversation } from "@/types/content";

export default function MessagesPageClient() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.getConversations();
      if (cancelled) return;
      queueMicrotask(() => {
        if (res.success && res.data) {
          setConversations(res.data);
        } else {
          setLoadError(res.error ?? "대화 목록을 불러오지 못했습니다.");
        }
        setLoading(false);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return onChatLine((line) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === line.conversationId
            ? {
                ...c,
                lastMessage: line.isImage ? "(이미지)" : line.content.slice(0, 40),
              }
            : c
        )
      );
    });
  }, []);

  async function createTarget() {
    if (!name.trim()) {
      alert("상대 이름을 입력해 주세요.");
      return;
    }
    setBusy(true);
    const res = await api.createConversation({ targetName: name });
    setBusy(false);
    if (!res.success || !res.data) {
      alert(res.error ?? "대화 상대 추가에 실패했습니다.");
      return;
    }
    setName("");
    setOpen(false);
    router.push(`/messages/${res.data.id}`);
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
                if (e.key === "Enter") void createTarget();
              }}
              placeholder="예: 깃털유머"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => void createTarget()}
            disabled={busy}
            className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "추가 중..." : "추가하고 채팅 열기"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
          불러오는 중...
        </p>
      ) : loadError ? (
        <p className="mt-8 text-center text-sm text-[var(--danger)]">
          {loadError}
        </p>
      ) : conversations.length === 0 ? (
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
                prefetch={false}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/messages/${c.id}`);
                }}
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
