"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";

export default function LoginClient() {
  const { login } = useAdminAuth();
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const message = await login(handle, password);
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    router.replace("/");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="surface w-full max-w-sm rounded-2xl p-8">
        <div className="mb-6 text-center">
          <span className="rounded bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-black">
            ADMIN
          </span>
          <h1 className="mt-3 text-xl font-bold">VidShare Console</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            관리자 계정으로만 로그인할 수 있습니다.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-[var(--text-muted)]">핸들</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-[var(--text-muted)]">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 outline-none focus:border-[var(--accent)]"
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 font-semibold text-black transition-opacity disabled:opacity-50"
          >
            {busy ? "확인 중..." : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-[var(--text-muted)]">
          계정이 없다면 서버에서
          <br />
          <code className="text-[var(--text)]">
            npm run create-admin -- &lt;handle&gt; &lt;password&gt;
          </code>
          <br />
          로 만들어 주세요.
        </p>
      </div>
    </main>
  );
}
