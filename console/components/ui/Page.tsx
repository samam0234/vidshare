import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`surface overflow-hidden rounded-xl ${className}`}>
      {children}
    </div>
  );
}

/** 로딩·에러·빈 목록을 한 줄로 처리하는 상태 표시. */
export function ListState({
  loading,
  error,
  empty,
  emptyText = "표시할 항목이 없습니다.",
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyText?: string;
}) {
  if (loading) {
    return <p className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">불러오는 중...</p>;
  }
  if (error) {
    return <p className="px-4 py-10 text-center text-sm text-[var(--danger)]">{error}</p>;
  }
  if (empty) {
    return <p className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">{emptyText}</p>;
  }
  return null;
}
