"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bell,
  Menu,
  MessageCircle,
  Moon,
  Search,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { useContentStore } from "@/lib/content-store";
import NotificationPopup from "./NotificationPopup";

const navLinks = [
  { href: "/longform", label: "롱폼 영상" },
  { href: "/community", label: "커뮤니티" },
  { href: "/chatbot", label: "챗봇" },
  { href: "/", label: "쇼츠" },
  { href: "/upload", label: "업로드" },
  { href: "/support", label: "고객센터" },
];

function pathActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount } = useContentStore();
  const [query, setQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cramped, setCramped] = useState(true);
  const [pathForMenus, setPathForMenus] = useState(pathname);
  const notifRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  if (pathForMenus !== pathname) {
    setPathForMenus(pathname);
    if (menuOpen) setMenuOpen(false);
    if (notifOpen) setNotifOpen(false);
  }

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const update = () => setCramped(el.clientWidth < 1120);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/?q=${encodeURIComponent(query.trim())}`);
  }

  return (
  <header className="sticky top-0 z-[200] border-b border-[var(--border)] bg-[var(--nav)]/90 backdrop-blur-xl">
      <div
        ref={barRef}
        className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-4"
      >
        {cramped && (
          <button
            type="button"
            className="rounded-xl p-2 text-[var(--text)] hover:bg-[var(--btn)]"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="메뉴"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
          <span className="logo-grad">VidShare</span>
        </Link>

        {!cramped && (
          <nav className="ml-2 flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  pathActive(pathname, link.href)
                    ? "bg-[var(--btn)] text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--btn)] hover:text-[var(--text)]"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <form
          onSubmit={onSearch}
          className="mx-auto hidden min-w-0 flex-1 max-w-xl items-center gap-2 sm:flex"
        >
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색어를 입력하세요..."
              className="w-full rounded-full border border-[var(--border)] bg-[var(--bg)] py-2 pl-9 pr-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-full bg-[var(--btn)] px-4 py-2 text-sm font-medium border border-[var(--border)] hover:border-[var(--accent)]"
          >
            검색
          </button>
        </form>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/upload"
            className="hidden items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 sm:inline-flex"
          >
            <Upload size={16} />
            업로드
          </Link>

          <Link
            href="/messages"
            className="rounded-xl p-2 text-[var(--text)] hover:bg-[var(--btn)]"
            aria-label="메시지"
          >
            <MessageCircle size={20} />
          </Link>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNotifOpen((v) => !v);
              }}
              className="relative rounded-xl p-2 text-[var(--text)] hover:bg-[var(--btn)]"
              aria-label="알림"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--accent-hot)]" />
              )}
            </button>
            <NotificationPopup
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
            />
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-xl p-2 text-[var(--text)] hover:bg-[var(--btn)]"
            aria-label="테마 전환"
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <Link
            href="/profile/u-me"
            className="hidden rounded-full border border-[var(--border)] bg-[var(--btn)] px-3 py-1.5 text-sm font-medium hover:border-[var(--accent)] sm:inline-flex"
          >
            내 프로필
          </Link>

          <button
            type="button"
            className="hidden rounded-full border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] md:inline-flex"
          >
            로그인
          </button>
        </div>
      </div>

      {cramped && menuOpen && (
        <div className="border-t border-[var(--border)] bg-[var(--nav)] px-3 py-3">
          <form onSubmit={onSearch} className="mb-3 flex gap-2 sm:hidden">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색..."
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--btn)] px-3 py-2 text-sm"
            >
              검색
            </button>
          </form>
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-sm font-medium",
                  pathActive(pathname, link.href)
                    ? "bg-[var(--btn)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--btn)]"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/profile/u-me"
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--btn)]"
            >
              내 프로필
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
