"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";

/**
 * FrontServer 의 GuestRouteGuard 와 반대 방향의 가드.
 * 저쪽은 "몇몇 경로만 비회원 허용"이지만, 콘솔은 `/login` 을 뺀 **전부**가
 * 관리자 전용이다.
 */
export default function AdminRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { admin, ready } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const blocked = ready && !admin && !isLoginPage;

  useEffect(() => {
    if (blocked) router.replace("/login");
  }, [blocked, router]);

  // 이미 로그인한 상태로 /login 에 오면 대시보드로 보낸다.
  useEffect(() => {
    if (ready && admin && isLoginPage) router.replace("/");
  }, [ready, admin, isLoginPage, router]);

  if (!ready && !isLoginPage) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <p className="text-sm text-[var(--text-muted)]">확인 중...</p>
      </main>
    );
  }

  if (blocked) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <p className="text-sm text-[var(--text-muted)]">
          관리자 로그인이 필요합니다.
        </p>
      </main>
    );
  }

  return children;
}
