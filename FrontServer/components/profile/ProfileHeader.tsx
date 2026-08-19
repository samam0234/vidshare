"use client";

import Link from "next/link";
import { Settings, Upload, UserRound } from "lucide-react";
import type { Author } from "@/types";
import { loginHref } from "@/lib/guest-routes";

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
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          영상 {videoCount}개
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
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                팔로우
              </button>
              <Link
                href="/messages"
                className="rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)]"
              >
                메시지
              </Link>
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
