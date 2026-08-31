"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Ban, Settings, Upload, UserRound } from "lucide-react";
import type { Author } from "@/types";
import { api } from "@/lib/api";
import { loginHref } from "@/lib/guest-routes";
import ReportButton from "@/components/moderation/ReportButton";

type Props = {
  author: Author;
  isMe?: boolean;
  videoCount: number;
  signedIn?: boolean;
};

export default function ProfileHeader({
  author,
  isMe,
  videoCount,
  signedIn = false,
}: Props) {
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [followRes, blockRes] = await Promise.all([
        api.getFollowStatus(author.id),
        signedIn && !isMe ? api.getBlockStatus(author.id) : null,
      ]);
      if (cancelled) return;
      queueMicrotask(() => {
        if (followRes.success && followRes.data) {
          setFollowers(followRes.data.followers);
          setFollowing(followRes.data.following);
          setIsFollowing(followRes.data.isFollowing);
        }
        if (blockRes && blockRes.success && blockRes.data) {
          setBlocked(blockRes.data.blocked);
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [author.id, signedIn, isMe]);

  async function toggleFollow() {
    if (busy) return;
    setBusy(true);
    const res = isFollowing
      ? await api.unfollowUser(author.id)
      : await api.followUser(author.id);
    if (res.success && res.data) {
      setFollowers(res.data.followers);
      setFollowing(res.data.following);
      setIsFollowing(res.data.isFollowing);
    }
    setBusy(false);
  }

  async function toggleBlock() {
    if (busy) return;
    setBusy(true);
    const res = blocked
      ? await api.unblockUser(author.id)
      : await api.blockUser(author.id);
    if (res.success && res.data) {
      setBlocked(res.data.blocked);
      if (res.data.blocked) {
        setIsFollowing(false);
        setFollowers((n) => Math.max(0, n));
      }
    }
    setBusy(false);
  }

  return (
    <section className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-sky-500 to-pink-500 text-3xl font-bold text-white shadow-lg sm:h-32 sm:w-32">
        {author.name.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold sm:text-2xl">
          Id : {author.name}{" "}
          <span className="text-sm font-medium text-[var(--text-muted)]">
            @{author.handle}
          </span>
        </h1>
        {author.bio && (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{author.bio}</p>
        )}
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--text-muted)]">
          <span>영상 {videoCount}개</span>
          <Link
            href={`/profile/${author.id}/followers`}
            className="hover:text-[var(--text)] hover:underline"
          >
            팔로워 <b className="text-[var(--text)]">{followers}</b>
          </Link>
          <Link
            href={`/profile/${author.id}/following`}
            className="hover:text-[var(--text)] hover:underline"
          >
            팔로잉 <b className="text-[var(--text)]">{following}</b>
          </Link>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isMe ? (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-hot)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <UserRound size={16} />
                프로필 변경
              </button>
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)]"
              >
                <Upload size={16} />
                영상 업로드
              </Link>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--btn)] hover:border-[var(--accent)]"
                aria-label="설정"
              >
                <Settings size={18} />
              </button>
            </>
          ) : signedIn ? (
            <>
              <button
                type="button"
                onClick={() => void toggleFollow()}
                disabled={busy || blocked}
                className={
                  isFollowing
                    ? "rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)] disabled:opacity-50"
                    : "rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                }
              >
                {isFollowing ? "팔로잉" : "팔로우"}
              </button>
              <Link
                href="/messages"
                className="rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)]"
              >
                메시지
              </Link>
              <button
                type="button"
                onClick={() => void toggleBlock()}
                disabled={busy}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--btn)] hover:border-[var(--danger)] disabled:opacity-50"
                aria-label={blocked ? "차단 해제" : "차단"}
                title={blocked ? "차단 해제" : "차단"}
              >
                <Ban
                  size={18}
                  className={blocked ? "text-[var(--danger)]" : undefined}
                />
              </button>
              <ReportButton
                targetType="user"
                targetId={author.id}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--btn)] px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
              />
            </>
          ) : (
            <Link
              href={loginHref(`/profile/${author.id}`)}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              로그인하고 팔로우
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
