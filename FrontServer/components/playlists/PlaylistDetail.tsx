"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Play, Plus, Trash2 } from "lucide-react";
import { api, type PlaylistDetail as PlaylistDetailType } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { mediaUrl } from "@/lib/media";
import type { Short } from "@/types";

export default function PlaylistDetail({ id }: { id: number }) {
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState<PlaylistDetailType | null>(null);
  const [myShorts, setMyShorts] = useState<Short[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const isOwner = Boolean(user && playlist && playlist.ownerId === user.id);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.getPlaylist(id);
      if (cancelled) return;
      queueMicrotask(() => {
        if (res.success && res.data) {
          setPlaylist(res.data);
          setError(null);
        } else {
          setError(res.error ?? "재생목록을 찾을 수 없습니다.");
        }
        setLoading(false);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!user || !playlist || playlist.ownerId !== user.id) return;
    let cancelled = false;
    (async () => {
      const res = await api.getUserShorts(user.id);
      if (cancelled || !res.success || !res.data) return;
      queueMicrotask(() => setMyShorts(res.data!));
    })();
    return () => {
      cancelled = true;
    };
  }, [user, playlist]);

  async function addShort(shortId: string) {
    const res = await api.addToPlaylist(id, shortId);
    if (res.success && res.data) setPlaylist(res.data);
  }

  async function removeShort(shortId: string) {
    const res = await api.removeFromPlaylist(id, shortId);
    if (res.success && res.data) setPlaylist(res.data);
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <p className="text-sm text-[var(--text-muted)]">불러오는 중...</p>
      </main>
    );
  }

  if (error || !playlist) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-16 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          {error ?? "재생목록을 찾을 수 없습니다."}
        </p>
      </main>
    );
  }

  const addable = myShorts.filter(
    (s) => !playlist.items.some((i) => i.id === s.id)
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{playlist.title}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            영상 {playlist.itemCount}개
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)]"
          >
            <Plus size={16} />
            영상 추가
          </button>
        )}
      </div>

      {isOwner && showAdd && (
        <div className="surface mt-4 rounded-2xl p-4">
          <h2 className="text-sm font-semibold">내 영상에서 추가</h2>
          {addable.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              추가할 수 있는 영상이 없습니다.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {addable.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 hover:bg-[var(--btn)]"
                >
                  <span className="truncate text-sm">{s.title}</span>
                  <button
                    type="button"
                    onClick={() => void addShort(s.id)}
                    className="shrink-0 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white"
                  >
                    추가
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {playlist.items.length === 0 ? (
        <p className="py-16 text-center text-sm text-[var(--text-muted)]">
          아직 담긴 영상이 없습니다.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {playlist.items.map((s) => (
            <div
              key={s.id}
              className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-[var(--border)] shadow-sm"
            >
              <Link href={`/?id=${s.id}`} className="absolute inset-0">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={
                    s.thumb
                      ? { backgroundImage: `url(${mediaUrl(s.thumb)})` }
                      : { background: s.gradient }
                  }
                />
                <div className="absolute inset-0 bg-black/20 transition group-hover:bg-black/10" />
                <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white">
                  <Play size={12} fill="white" />
                  {s.views}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="line-clamp-2 text-xs font-medium text-white">
                    {s.title}
                  </p>
                </div>
              </Link>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => void removeShort(s.id)}
                  className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-[var(--danger)]"
                  aria-label="재생목록에서 빼기"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
