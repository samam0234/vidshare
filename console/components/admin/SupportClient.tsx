"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import type { AdminInquiry } from "@/types";
import { ListState, PageHeader, PageShell, Panel } from "@/components/ui/Page";
import { formatWhen } from "@/lib/format";

export default function SupportClient() {
  const [unrepliedOnly, setUnrepliedOnly] = useState(true);
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminApi.getInquiries(unrepliedOnly);
    if (res.success && res.data) setInquiries(res.data);
    else setError(res.error ?? "문의를 불러오지 못했습니다.");
    setLoading(false);
  }, [unrepliedOnly]);

  // 이펙트 본문에서 setState 를 동기로 부르지 않도록 마이크로태스크로 미룬다.
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  function openReply(inquiry: AdminInquiry) {
    setOpenId(inquiry.id);
    setDraft(inquiry.adminReply ?? "");
  }

  async function submitReply(id: number) {
    if (!draft.trim() || busy) return;
    setBusy(true);
    const res = await adminApi.replyToInquiry(id, draft);
    setBusy(false);
    if (!res.success || !res.data) {
      setError(res.error ?? "답변을 등록하지 못했습니다.");
      return;
    }
    const saved = res.data;
    setOpenId(null);
    setDraft("");
    if (unrepliedOnly) {
      // 답변한 문의는 이 목록의 조건에서 벗어난다.
      setInquiries((prev) => prev.filter((i) => i.id !== id));
    } else {
      setInquiries((prev) => prev.map((i) => (i.id === id ? saved : i)));
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="고객센터"
        description="유저가 보낸 문의를 확인하고 답변합니다. 답변하면 작성자에게 알림이 갑니다."
      />

      <label className="mb-4 flex w-fit cursor-pointer items-center gap-2 text-sm text-[var(--text-muted)]">
        <input
          type="checkbox"
          checked={unrepliedOnly}
          onChange={(e) => setUnrepliedOnly(e.target.checked)}
          className="accent-[var(--accent)]"
        />
        미답변만 보기
      </label>

      <Panel>
        <ListState
          loading={loading}
          error={error}
          empty={inquiries.length === 0}
          emptyText={
            unrepliedOnly ? "답변을 기다리는 문의가 없습니다." : "문의가 없습니다."
          }
        />

        {!loading && !error && inquiries.length > 0 ? (
          <ul className="divide-y divide-[var(--border)]">
            {inquiries.map((inquiry) => (
              <li key={inquiry.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="rounded bg-[var(--btn)] px-2 py-0.5 text-[var(--text)]">
                    #{String(inquiry.id).padStart(3, "0")}
                  </span>
                  <span>
                    {inquiry.authorName} (@{inquiry.authorHandle})
                  </span>
                  <span>·</span>
                  <span>{formatWhen(inquiry.createdAt)}</span>
                  {inquiry.adminReply ? (
                    <span className="rounded bg-[var(--success-soft)] px-2 py-0.5 text-[var(--success)]">
                      답변함
                    </span>
                  ) : (
                    <span className="rounded bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent)]">
                      미답변
                    </span>
                  )}
                </div>

                <h2 className="mt-2 font-semibold">{inquiry.subject}</h2>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[var(--text-muted)]">
                  {inquiry.body}
                </p>

                {inquiry.adminReply && openId !== inquiry.id ? (
                  <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">
                      답변 · {inquiry.repliedAt ? formatWhen(inquiry.repliedAt) : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                      {inquiry.adminReply}
                    </p>
                  </div>
                ) : null}

                {openId === inquiry.id ? (
                  <div className="mt-3">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={4}
                      maxLength={2000}
                      placeholder="답변 내용을 입력하세요."
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busy || !draft.trim()}
                        onClick={() => void submitReply(inquiry.id)}
                        className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-black disabled:opacity-50"
                      >
                        {busy ? "등록 중..." : "답변 등록"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenId(null);
                          setDraft("");
                        }}
                        className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--text-muted)] hover:bg-[var(--btn)]"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openReply(inquiry)}
                    className="mt-3 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--btn)]"
                  >
                    {inquiry.adminReply ? "답변 수정" : "답변하기"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>
    </PageShell>
  );
}
