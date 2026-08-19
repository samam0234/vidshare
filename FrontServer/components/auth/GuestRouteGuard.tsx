"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isGuestAllowedPath, loginHref } from "@/lib/guest-routes";

export default function GuestRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = isGuestAllowedPath(pathname);
  const blocked = ready && !user && !allowed;

  useEffect(() => {
    if (!blocked) return;
    const qs = window.location.search;
    const next = qs ? `${pathname}${qs}` : pathname;
    router.replace(loginHref(next));
  }, [blocked, pathname, router]);

  if (!ready && !allowed) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16 text-center">
        <p className="text-sm text-[var(--text-muted)]">확인 중...</p>
      </main>
    );
  }

  if (blocked) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          이 기능은 로그인 후 이용할 수 있습니다.
        </p>
      </main>
    );
  }

  return children;
}
