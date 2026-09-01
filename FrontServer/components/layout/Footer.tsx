"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/chatbot" || pathname.startsWith("/chatbot/")) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--nav)]">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-6 text-center text-sm text-[var(--text-muted)]">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link href="/terms" className="hover:text-[var(--text)] hover:underline">
            이용약관
          </Link>
          <span aria-hidden>|</span>
          <Link href="/privacy" className="hover:text-[var(--text)] hover:underline">
            개인정보처리방침
          </Link>
          <span aria-hidden>|</span>
          <Link href="/business" className="hover:text-[var(--text)] hover:underline">
            사업자 정보확인
          </Link>
          <span aria-hidden>|</span>
          <Link
            href="/support"
            className="hover:text-[var(--text)] hover:underline"
          >
            고객센터
          </Link>
        </div>
        <p>© VidShare Corp. All rights reserved.</p>
      </div>
    </footer>
  );
}
