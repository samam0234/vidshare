"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAuth } from "@/context/AdminAuthContext";

const NAV = [
  { href: "/", label: "대시보드" },
  { href: "/reports", label: "신고" },
  { href: "/users", label: "유저" },
  { href: "/content", label: "콘텐츠" },
  { href: "/support", label: "고객센터" },
];

export default function AdminNav() {
  const { admin, logout } = useAdminAuth();
  const pathname = usePathname();

  if (!admin) return null;

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--nav)]">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="rounded bg-[var(--accent)] px-2 py-0.5 text-xs font-bold text-black">
            ADMIN
          </span>
          <span>VidShare Console</span>
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--btn)] hover:text-[var(--text)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-[var(--text-muted)]">@{admin.handle}</span>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--btn)] hover:text-[var(--text)]"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
