"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { api } from "@/lib/api";

type TargetType = "short" | "comment" | "community" | "user";

export default function ReportButton({
  targetType,
  targetId,
  className,
}: {
  targetType: TargetType;
  targetId: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    const text = reason.trim();
    if (!text || busy) return;
    setBusy(true);
    const res = await api.reportContent(targetType, targetId, text);
    setBusy(false);
    if (res.success) {
      setDone(true);
      setOpen(false);
      setReason("");
    }
  }

  if (done) {
    return (
      <span className={className ?? "text-xs text-[var(--text-muted)]"}>
        신고 접수됨
      </span>
    );
  }

  if (open) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="신고 사유"
          className="w-32 rounded-full border border-[var(--border)] bg-transparent px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !reason.trim()}
          className="text-xs font-medium text-[var(--danger)] hover:underline disabled:opacity-40"
        >
          제출
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          취소
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={
        className ??
        "inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--danger)]"
      }
    >
      <Flag size={12} />
      신고
    </button>
  );
}
