import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <SearchX size={32} className="text-[var(--text-muted)]" />
      <h1 className="mt-4 text-xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        주소가 바뀌었거나 삭제된 페이지일 수 있습니다.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        홈으로
      </Link>
    </main>
  );
}
