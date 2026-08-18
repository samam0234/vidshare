"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    const err = await login(handle, password);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">로그인</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        테스트 계정: <span className="font-mono">demo</span> /{" "}
        <span className="font-mono">demo1234</span>
      </p>
      <section className="surface mt-6 flex flex-col gap-4 rounded-3xl p-6">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">핸들</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoComplete="username"
            placeholder="demo"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter") void onSubmit();
            }}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={busy}
          className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "확인 중..." : "로그인"}
        </button>
        <p className="text-center text-sm text-[var(--text-muted)]">
          계정이 없으면{" "}
          <Link href="/register" className="text-[var(--accent)] hover:underline">
            회원가입
          </Link>
        </p>
      </section>
    </main>
  );
}
