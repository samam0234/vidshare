"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import type { AdminReport, ReportStatus } from "@/types";
import { ListState, PageHeader, PageShell, Panel } from "@/components/ui/Page";
import { formatWhen } from "@/lib/format";

const FILTERS: Array<{ value: ReportStatus | "all"; label: string }> = [
  { value: "open", label: "미처리" },
  { value: "resolved", label: "조치함" },
  { value: "dismissed", label: "반려" },
  { value: "all", label: "전체" },
];

const STATUS_LABEL: Record<ReportStatus, string> = {
  open: "미처리",
  resolved: "조치함",
  dismissed: "반려",
};

const TARGET_LABEL: Record<string, string> = {
  short: "쇼츠",
  comment: "댓글",
  community: "커뮤니티",
  user: "유저",
};

export default function ReportsClient() {
  const [filter, setFilter] = useState<ReportStatus | "all">("open");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminApi.getReports(filter === "all" ? undefined : filter);
    if (res.success && res.data) setReports(res.data);
    else setError(res.error ?? "신고 목록을 불러오지 못했습니다.");
    setLoading(false);
  }, [filter]);

  // 이펙트 본문에서 setState 를 동기로 부르지 않도록 마이크로태스크로 미룬다
  // (FrontServer 와 같은 저장소 공통 관례).
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function patch(id: number, status: ReportStatus) {
    setBusyId(id);
    const res = await adminApi.setReportStatus(id, status);
    setBusyId(null);
    if (!res.success) {
      setError(res.error ?? "상태를 바꾸지 못했습니다.");
      return;
    }
    // 필터가 걸려 있으면 목록에서 빠져야 하므로 다시 읽는다.
    if (filter === "all") {
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } else {
      void load();
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="신고"
        description="유저가 접수한 신고를 확인하고 처리 상태를 남깁니다."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              filter === f.value
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--btn)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Panel>
        <ListState
          loading={loading}
          error={error}
          empty={reports.length === 0}
          emptyText="해당하는 신고가 없습니다."
        />

        {!loading && !error && reports.length > 0 ? (
          <ul className="divide-y divide-[var(--border)]">
            {reports.map((report) => (
              <li key={report.id} className="flex flex-wrap gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span className="rounded bg-[var(--btn)] px-2 py-0.5 text-[var(--text)]">
                      {TARGET_LABEL[report.targetType] ?? report.targetType}
                    </span>
                    <code className="text-[var(--text)]">{report.targetId}</code>
                    <span>·</span>
                    <span>@{report.reporterHandle} 신고</span>
                    <span>·</span>
                    <span>{formatWhen(report.createdAt)}</span>
                  </div>
                  <p className="mt-2 break-words text-sm">{report.reason}</p>
                </div>

                <div className="flex shrink-0 items-start gap-2">
                  <span
                    className={`rounded-lg px-2 py-1 text-xs ${
                      report.status === "open"
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : report.status === "resolved"
                          ? "bg-[var(--success-soft)] text-[var(--success)]"
                          : "bg-[var(--btn)] text-[var(--text-muted)]"
                    }`}
                  >
                    {STATUS_LABEL[report.status]}
                  </span>

                  {report.status === "open" ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === report.id}
                        onClick={() => void patch(report.id, "resolved")}
                        className="rounded-lg bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-black disabled:opacity-50"
                      >
                        조치함
                      </button>
                      <button
                        type="button"
                        disabled={busyId === report.id}
                        onClick={() => void patch(report.id, "dismissed")}
                        className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--btn)] disabled:opacity-50"
                      >
                        반려
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busyId === report.id}
                      onClick={() => void patch(report.id, "open")}
                      className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--btn)] disabled:opacity-50"
                    >
                      되돌리기
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <p className="mt-3 text-xs text-[var(--text-muted)]">
        신고 대상을 실제로 지우려면 <strong>콘텐츠</strong> 탭에서 해당 항목을
        찾아 삭제하세요. 상태 변경은 처리 기록만 남깁니다.
      </p>
    </PageShell>
  );
}
