"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 포트폴리오 사이트는 Next 라우트가 아니라 public/portfolio 로 복사되는 정적 페이지다
// (FrontServer/scripts/sync-portfolio.mjs). 디렉터리 인덱스 해석에 기대지 않도록
// index.html 까지 명시한다. 별도 호스트에 올렸다면 환경 변수로 덮어쓴다.
const PORTFOLIO_URL =
  process.env.NEXT_PUBLIC_PORTFOLIO_URL || "/portfolio/index.html";

export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/chatbot" || pathname.startsWith("/chatbot/")) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--nav)]">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-6 text-center text-sm text-[var(--text-muted)]">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <a
            href={PORTFOLIO_URL}
            className="font-medium text-[var(--accent)] hover:underline"
          >
            프로젝트 소개
          </a>
          <span aria-hidden>|</span>
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
