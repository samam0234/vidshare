"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminApi } from "@/lib/adminApi";
import type { AdminStats } from "@/types";
import { PageHeader, PageShell, Panel } from "@/components/ui/Page";

type Card = {
  label: string;
  value: number;
  href?: string;
  hint?: string;
  alert?: boolean;
};

export default function DashboardClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void adminApi.getStats().then((res) => {
      if (!alive) return;
      if (res.success && res.data) setStats(res.data);
      else setError(res.error ?? "통계를 불러오지 못했습니다.");
    });
    return () => {
      alive = false;
    };
  }, []);

  const cards: Card[] = stats
    ? [
        {
          label: "미처리 신고",
          value: stats.openReportCount,
          href: "/reports",
          alert: stats.openReportCount > 0,
        },
        {
          label: "미답변 문의",
          value: stats.unrepliedInquiryCount,
          href: "/support",
          alert: stats.unrepliedInquiryCount > 0,
          hint: `전체 ${stats.inquiryCount}건`,
        },
        {
          label: "정지된 계정",
          value: stats.suspendedCount,
          href: "/users",
        },
        {
          label: "전체 유저",
          value: stats.userCount,
          href: "/users",
        },
        { label: "쇼츠", value: stats.shortCount, href: "/content" },
        { label: "롱폼", value: stats.longformCount, href: "/content" },
        { label: "커뮤니티 글", value: stats.communityCount, href: "/content" },
      ]
    : [];

  return (
    <PageShell>
      <PageHeader
        title="대시보드"
        description="처리해야 할 일이 남아 있는지 한눈에 봅니다."
      />

      {error ? (
        <Panel className="p-6 text-sm text-[var(--danger)]">{error}</Panel>
      ) : !stats ? (
        <Panel className="p-6 text-sm text-[var(--text-muted)]">
          불러오는 중...
        </Panel>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {cards.map((card) => {
            const body = (
              <>
                <p className="text-sm text-[var(--text-muted)]">{card.label}</p>
                <p
                  className={`mt-2 text-3xl font-bold ${
                    card.alert ? "text-[var(--accent)]" : ""
                  }`}
                >
                  {card.value}
                </p>
                {card.hint ? (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {card.hint}
                  </p>
                ) : null}
              </>
            );
            return card.href ? (
              <Link
                key={card.label}
                href={card.href}
                className="surface rounded-xl p-4 transition-colors hover:border-[var(--accent)]"
              >
                {body}
              </Link>
            ) : (
              <div key={card.label} className="surface rounded-xl p-4">
                {body}
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
