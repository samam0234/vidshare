"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <AlertTriangle size={32} className="text-[var(--danger)]" />
      <h1 className="mt-4 text-xl font-bold">문제가 발생했습니다</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        페이지를 불러오는 중 오류가 났습니다. 잠시 후 다시 시도해 주세요.
      </p>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)]"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
