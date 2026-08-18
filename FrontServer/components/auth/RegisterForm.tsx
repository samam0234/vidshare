"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setError(null);
    setBusy(true);
    const err = await register({ handle, name, password });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">회원가입</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        가입하면 바로 로그인됩니다. 서버를 재시작하면 계정은 초기화됩니다.
      </p>
      <section className="surface mt-6 flex flex-col gap-4 rounded-3xl p-6">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">핸들</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoComplete="username"
            placeholder="영문·숫자 3~20자"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="표시 이름"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="6자 이상"
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
          {busy ? "가입 중..." : "가입하고 시작하기"}
        </button>
        <p className="text-center text-sm text-[var(--text-muted)]">
          이미 계정이 있으면{" "}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            로그인
          </Link>
        </p>
      </section>
    </main>
  );
}
