"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const HANDLE_RE = /^[a-zA-Z0-9._]{3,20}$/;
const NAME_MAX = 30;
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

type FieldErrors = {
  handle?: string;
  name?: string;
  password?: string;
  passwordConfirm?: string;
};

function fieldClass(invalid?: string) {
  return cn(
    "w-full rounded-xl border bg-[var(--bg)] px-4 py-3 text-sm focus:outline-none",
    invalid
      ? "border-[var(--danger)]"
      : "border-[var(--border)] focus:border-[var(--accent)]"
  );
}

function validate(input: {
  handle: string;
  name: string;
  password: string;
  passwordConfirm: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  const handle = input.handle.replace(/^@/, "").trim();
  const name = input.name.trim();

  if (!handle) errors.handle = "핸들을 입력해 주세요.";
  else if (!HANDLE_RE.test(handle)) {
    errors.handle = "핸들은 영문·숫자·._ 3~20자로 입력해 주세요.";
  }

  if (!name) errors.name = "이름을 입력해 주세요.";
  else if (name.length > NAME_MAX) {
    errors.name = `이름은 ${NAME_MAX}자 이하여야 합니다.`;
  }

  if (!input.password) errors.password = "비밀번호를 입력해 주세요.";
  else if (input.password.length < PASSWORD_MIN) {
    errors.password = `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.`;
  } else if (input.password.length > PASSWORD_MAX) {
    errors.password = `비밀번호는 ${PASSWORD_MAX}자 이하여야 합니다.`;
  }

  if (!input.passwordConfirm) {
    errors.passwordConfirm = "비밀번호를 한 번 더 입력해 주세요.";
  } else if (input.password !== input.passwordConfirm) {
    errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
  }

  return errors;
}

export default function RegisterForm() {
  const router = useRouter();
  const { register, user, ready } = useAuth();
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const nextErrors = validate({ handle, name, password, passwordConfirm });
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setBusy(true);
    const err = await register({
      handle: handle.replace(/^@/, "").trim(),
      name: name.trim(),
      password,
    });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/");
  }

  if (ready && user) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">회원가입</h1>
        <section className="surface mt-6 flex flex-col gap-4 rounded-3xl p-6">
          <p className="text-sm text-[var(--text-muted)]">
            이미{" "}
            <span className="font-medium text-[var(--text)]">@{user.handle}</span>{" "}
            계정으로 로그인되어 있습니다.
          </p>
          <Link
            href="/"
            className="rounded-2xl bg-[var(--accent)] px-5 py-3 text-center text-sm font-bold text-white hover:opacity-90"
          >
            홈으로
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">회원가입</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        가입하면 바로 로그인됩니다. 서버를 재시작하면 계정은 초기화됩니다.
      </p>
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="surface mt-6 flex flex-col gap-4 rounded-3xl p-6"
        noValidate
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">핸들</span>
          <input
            value={handle}
            onChange={(e) => {
              setHandle(e.target.value);
              if (fieldErrors.handle) {
                setFieldErrors((prev) => ({ ...prev, handle: undefined }));
              }
            }}
            autoComplete="username"
            placeholder="영문·숫자 3~20자"
            aria-invalid={Boolean(fieldErrors.handle)}
            aria-describedby={fieldErrors.handle ? "handle-error" : undefined}
            className={fieldClass(fieldErrors.handle)}
          />
          {fieldErrors.handle && (
            <p id="handle-error" className="text-sm text-[var(--danger)]">
              {fieldErrors.handle}
            </p>
          )}
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">이름</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) {
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            autoComplete="nickname"
            placeholder="표시 이름"
            maxLength={NAME_MAX}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            className={fieldClass(fieldErrors.name)}
          />
          {fieldErrors.name && (
            <p id="name-error" className="text-sm text-[var(--danger)]">
              {fieldErrors.name}
            </p>
          )}
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            autoComplete="new-password"
            placeholder={`${PASSWORD_MIN}자 이상`}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
            }
            className={fieldClass(fieldErrors.password)}
          />
          {fieldErrors.password && (
            <p id="password-error" className="text-sm text-[var(--danger)]">
              {fieldErrors.password}
            </p>
          )}
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">비밀번호 확인</span>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => {
              setPasswordConfirm(e.target.value);
              if (fieldErrors.passwordConfirm) {
                setFieldErrors((prev) => ({
                  ...prev,
                  passwordConfirm: undefined,
                }));
              }
            }}
            autoComplete="new-password"
            placeholder="비밀번호를 다시 입력"
            aria-invalid={Boolean(fieldErrors.passwordConfirm)}
            aria-describedby={
              fieldErrors.passwordConfirm ? "password-confirm-error" : undefined
            }
            className={fieldClass(fieldErrors.passwordConfirm)}
          />
          {fieldErrors.passwordConfirm && (
            <p
              id="password-confirm-error"
              className="text-sm text-[var(--danger)]"
            >
              {fieldErrors.passwordConfirm}
            </p>
          )}
        </label>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <button
          type="submit"
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
      </form>
    </main>
  );
}
