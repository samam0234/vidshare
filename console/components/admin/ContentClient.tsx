"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import type { CommunityPost, LongformVideo, Short } from "@/types";
import { ListState, PageHeader, PageShell, Panel } from "@/components/ui/Page";
import { formatWhen, truncate } from "@/lib/format";

type Tab = "shorts" | "longform" | "community";

type Row = {
  key: string;
  title: string;
  meta: string;
  body?: string;
  onDelete: () => Promise<{ success: boolean; error?: string }>;
};

const TABS: Array<{ value: Tab; label: string }> = [
  { value: "shorts", label: "쇼츠" },
  { value: "longform", label: "롱폼" },
  { value: "community", label: "커뮤니티" },
];

export default function ContentClient() {
  const [tab, setTab] = useState<Tab>("shorts");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (tab === "shorts") {
      const res = await adminApi.getShorts();
      if (res.success && res.data) {
        setRows(
          res.data.map((s: Short) => ({
            key: s.id,
            title: s.title,
            meta: `@${s.author.handle} · 좋아요 ${s.likes} · 댓글 ${s.comments} · ${formatWhen(s.createdAt)}`,
            body: s.description ? truncate(s.description, 120) : undefined,
            onDelete: () => adminApi.deleteShort(s.id),
          }))
        );
      } else setError(res.error ?? "쇼츠를 불러오지 못했습니다.");
    } else if (tab === "longform") {
      const res = await adminApi.getLongform();
      if (res.success && res.data) {
        setRows(
          res.data.map((v: LongformVideo) => ({
            key: String(v.id),
            title: v.title,
            meta: `${v.authorName} · ${formatWhen(v.createdAt)}`,
            body: v.description ? truncate(v.description, 120) : undefined,
            onDelete: () => adminApi.deleteLongform(v.id),
          }))
        );
      } else setError(res.error ?? "롱폼을 불러오지 못했습니다.");
    } else {
      const res = await adminApi.getCommunity();
      if (res.success && res.data) {
        setRows(
          res.data.map((p: CommunityPost) => ({
            key: String(p.id),
            title: p.title,
            meta: `${p.authorName} · ${formatWhen(p.createdAt)}`,
            body: truncate(p.body, 120),
            onDelete: () => adminApi.deleteCommunityPost(p.id),
          }))
        );
      } else setError(res.error ?? "커뮤니티 글을 불러오지 못했습니다.");
    }

    setLoading(false);
  }, [tab]);

  // 이펙트 본문에서 setState 를 동기로 부르지 않도록 마이크로태스크로 미룬다.
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function remove(row: Row) {
    if (!window.confirm(`"${row.title}" 을(를) 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }
    setBusyKey(row.key);
    const res = await row.onDelete();
    setBusyKey(null);
    if (!res.success) {
      setError(res.error ?? "삭제하지 못했습니다.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.key !== row.key));
  }

  return (
    <PageShell>
      <PageHeader
        title="콘텐츠"
        description="신고가 확인된 게시물을 찾아 지웁니다."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              tab === t.value
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--btn)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Panel>
        <ListState
          loading={loading}
          error={error}
          empty={rows.length === 0}
          emptyText="등록된 콘텐츠가 없습니다."
        />

        {!loading && !error && rows.length > 0 ? (
          <ul className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <li key={row.key} className="flex flex-wrap gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-[var(--btn)] px-1.5 py-0.5 text-xs text-[var(--text-muted)]">
                      {row.key}
                    </code>
                    <span className="truncate font-medium">{row.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {row.meta}
                  </p>
                  {row.body ? (
                    <p className="mt-2 break-words text-sm text-[var(--text-muted)]">
                      {row.body}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={busyKey === row.key}
                  onClick={() => void remove(row)}
                  className="h-fit shrink-0 rounded-lg bg-[var(--danger)] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <p className="mt-3 text-xs text-[var(--text-muted)]">
        쇼츠를 지우면 달린 댓글과 재생목록 항목도 함께 사라집니다. 다만 업로드된
        원본 파일(<code>/uploads</code>)은 서버에 그대로 남습니다.
      </p>
    </PageShell>
  );
}
