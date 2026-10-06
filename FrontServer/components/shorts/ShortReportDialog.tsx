"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  REPORT_REASONS,
  REPORT_REASON_MAX,
  REPORT_REASON_OTHER,
  buildReportReason,
} from "@/lib/short-menu";
import Dialog from "@/components/ui/Dialog";

type Props = {
  shortId: string;
  onClose: () => void;
  onDone: () => void;
};

/** 신고 사유를 고르고 접수한다. 접수된 신고는 관리자 콘솔 "신고" 화면에 쌓인다. */
export default function ShortReportDialog({ shortId, onClose, onDone }: Props) {
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text = buildReportReason(reason, detail);

  async function submit() {
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    const res = await api.reportContent("short", shortId, text);
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "신고를 접수하지 못했습니다.");
      return;
    }
    onDone();
  }

  return (
    <Dialog title="영상 신고" onClose={onClose} locked={busy}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--text-muted)]">
          어떤 문제가 있나요? 접수된 신고는 운영자가 확인합니다.
        </p>
        {error && (
          <p role="alert" className="rounded-xl bg-[var(--danger)]/10 px-4 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">신고 사유</legend>
          {REPORT_REASONS.map((r) => (
            <label
              key={r}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm",
                reason === r
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-[var(--border)] hover:border-[var(--accent)]"
              )}
            >
              <input
                type="radio"
                name="report-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-[var(--accent)]"
              />
              {r}
            </label>
          ))}
        </fieldset>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">
            자세한 내용 {reason === REPORT_REASON_OTHER ? "(필수)" : "(선택)"}
          </span>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={REPORT_REASON_MAX - 40}
            rows={3}
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2.5 text-sm font-medium hover:border-[var(--accent)] disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!text || busy}
            className="rounded-xl bg-[var(--danger)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "접수 중..." : "신고하기"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
