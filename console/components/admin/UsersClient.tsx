"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import type { AdminUser } from "@/types";
import { ListState, PageHeader, PageShell, Panel } from "@/components/ui/Page";
import { formatWhen } from "@/lib/format";

export default function UsersClient() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminApi.getUsers(submitted);
    if (res.success && res.data) setUsers(res.data);
    else setError(res.error ?? "유저 목록을 불러오지 못했습니다.");
    setLoading(false);
  }, [submitted]);

  // 이펙트 본문에서 setState 를 동기로 부르지 않도록 마이크로태스크로 미룬다.
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function toggleSuspend(user: AdminUser) {
    const next = !user.suspended;
    const label = next ? "정지" : "정지 해제";
    if (!window.confirm(`@${user.handle} 계정을 ${label}할까요?`)) return;

    setBusyId(user.id);
    const res = await adminApi.setUserSuspended(user.id, next);
    setBusyId(null);
    if (!res.success) {
      setError(res.error ?? "상태를 바꾸지 못했습니다.");
      return;
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, suspended: next } : u))
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="유저"
        description="가입한 계정을 확인하고 필요하면 로그인을 막습니다."
      />

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query);
        }}
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="핸들 또는 이름 검색"
          className="w-full max-w-xs rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:bg-[var(--btn)]"
        >
          검색
        </button>
        {submitted ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSubmitted("");
            }}
            className="rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--btn)]"
          >
            초기화
          </button>
        ) : null}
      </form>

      <Panel>
        <ListState
          loading={loading}
          error={error}
          empty={users.length === 0}
          emptyText="조건에 맞는 유저가 없습니다."
        />

        {!loading && !error && users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-[var(--border)] text-left text-xs text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">유저</th>
                  <th className="px-4 py-3 font-medium">역할</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">가입</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        @{user.handle}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.role === "admin" ? (
                        <span className="rounded bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]">
                          관리자
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">
                          일반
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.suspended ? (
                        <span className="rounded bg-[var(--danger-soft)] px-2 py-0.5 text-xs text-[var(--danger)]">
                          정지
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--success)]">
                          정상
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {formatWhen(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.role === "admin" ? (
                        <span className="text-xs text-[var(--text-muted)]">
                          관리자는 정지할 수 없음
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === user.id}
                          onClick={() => void toggleSuspend(user)}
                          className={`rounded-lg px-3 py-1 text-xs disabled:opacity-50 ${
                            user.suspended
                              ? "border border-[var(--border)] hover:bg-[var(--btn)]"
                              : "bg-[var(--danger)] font-semibold text-white"
                          }`}
                        >
                          {user.suspended ? "정지 해제" : "정지"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>

      <p className="mt-3 text-xs text-[var(--text-muted)]">
        정지하면 해당 계정의 기존 로그인 세션이 즉시 끊기고, 다시 로그인하려
        하면 403 을 받습니다. 작성한 콘텐츠는 남아 있으니 필요하면 콘텐츠 탭에서
        따로 지우세요.
      </p>
    </PageShell>
  );
}
