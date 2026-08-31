"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ListVideo, Plus } from "lucide-react";
import { api, type Playlist } from "@/lib/api";

export default function PlaylistTab({
  ownerId,
  isMe,
}: {
  ownerId: string;
  isMe: boolean;
}) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.getUserPlaylists(ownerId);
      if (cancelled) return;
      queueMicrotask(() => {
        if (res.success && res.data) setPlaylists(res.data);
        setLoading(false);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  async function create() {
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true);
    const res = await api.createPlaylist(t);
    setBusy(false);
    if (res.success && res.data) {
      setPlaylists((prev) => [res.data!, ...prev]);
      setTitle("");
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-[var(--text-muted)]">
        불러오는 중...
      </p>
    );
  }

  return (
    <div>
      {isMe && (
        <div className="mb-4">
          {creating ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void create();
                  if (e.key === "Escape") setCreating(false);
                }}
                placeholder="재생목록 제목"
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void create()}
                disabled={busy || !title.trim()}
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                만들기
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm hover:border-[var(--accent)]"
              >
                취소
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)]"
            >
              <Plus size={16} />새 재생목록
            </button>
          )}
        </div>
      )}

      {playlists.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--text-muted)]">
          재생목록이 아직 없습니다.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {playlists.map((p) => (
            <Link
              key={p.id}
              href={`/playlists/${p.id}`}
              className="surface flex aspect-[9/16] flex-col items-center justify-center gap-2 rounded-2xl px-3 text-center transition hover:border-[var(--accent)]/40"
            >
              <ListVideo size={28} className="text-[var(--text-muted)]" />
              <span className="line-clamp-2 text-sm font-medium">
                {p.title}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                영상 {p.itemCount}개
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
