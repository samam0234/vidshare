"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export default function CommunityForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!title.trim() || !body.trim()) {
      alert("제목과 내용을 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await api.createCommunityPost({ title, body });
    if (!res.success || !res.data) {
      setError(res.error ?? "작성에 실패했습니다.");
      setBusy(false);
      return;
    }
    router.push(`/community/${res.data.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">커뮤니티 글쓰기</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        작성 후 일련번호 상세 페이지로 이동합니다.
      </p>
      <section className="surface mt-6 flex flex-col gap-5 rounded-3xl p-6">
        {error && (
          <p className="rounded-xl bg-[var(--danger)]/10 px-4 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">제목</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">내용</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="내용을 입력하세요"
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className="rounded-2xl bg-[var(--accent)] px-5 py-3.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "작성 중..." : "작성하고 상세 보기"}
        </button>
      </section>
    </main>
  );
}
