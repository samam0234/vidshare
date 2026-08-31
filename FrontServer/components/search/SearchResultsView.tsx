"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Users, Film, Video, MessageSquareText } from "lucide-react";
import { api, type SearchResults } from "@/lib/api";
import { formatWhen } from "@/lib/content-store";
import SerialBadge from "@/components/ui/SerialBadge";
import { cn } from "@/lib/utils";

type TabKey = "all" | "shorts" | "longform" | "community" | "users";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "shorts", label: "쇼츠" },
  { key: "longform", label: "롱폼" },
  { key: "community", label: "커뮤니티" },
  { key: "users", label: "유저" },
];

const EMPTY: SearchResults = {
  query: "",
  shorts: [],
  longform: [],
  community: [],
  users: [],
};

function countOf(r: SearchResults) {
  return r.shorts.length + r.longform.length + r.community.length + r.users.length;
}

export default function SearchResultsView() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";

  const [input, setInput] = useState(q);
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(Boolean(q));
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("all");

  useEffect(() => {
    queueMicrotask(() => setInput(q));
    if (!q.trim()) {
      queueMicrotask(() => {
        setResults(EMPTY);
        setLoading(false);
        setError(null);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    (async () => {
      const res = await api.search(q);
      if (cancelled) return;
      queueMicrotask(() => {
        if (res.success && res.data) {
          setResults(res.data);
          setError(null);
        } else {
          setError(res.error ?? "검색에 실패했습니다.");
        }
        setLoading(false);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = input.trim();
    if (!next) return;
    router.push(`/search?q=${encodeURIComponent(next)}`);
  }

  const total = countOf(results);
  const show = (key: Exclude<TabKey, "all">) => tab === "all" || tab === key;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">검색</h1>

      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="쇼츠·롱폼·커뮤니티·유저 검색"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--bg)] py-2 pl-9 pr-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          검색
        </button>
      </form>

      {q && (
        <div className="custom-scroll mt-5 flex gap-1 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                tab === t.key
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--btn)] text-[var(--text-muted)] hover:text-[var(--text)]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
          검색 중...
        </p>
      )}

      {error && (
        <p className="mt-8 text-center text-sm text-[var(--danger)]">{error}</p>
      )}

      {!loading && !error && !q && (
        <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
          검색어를 입력하세요.
        </p>
      )}

      {!loading && !error && q && total === 0 && (
        <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
          &ldquo;{q}&rdquo; 검색 결과가 없습니다.
        </p>
      )}

      {!loading && !error && total > 0 && (
        <div className="mt-6 space-y-8">
          {show("shorts") && results.shorts.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
                <Film size={15} />
                쇼츠 {results.shorts.length}
              </h2>
              <ul className="space-y-2">
                {results.shorts.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/?id=${encodeURIComponent(s.id)}`}
                      className="surface block rounded-2xl px-4 py-3 transition hover:border-[var(--accent)]/40"
                    >
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        @{s.author.handle}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {show("longform") && results.longform.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
                <Video size={15} />
                롱폼 {results.longform.length}
              </h2>
              <ul className="space-y-2">
                {results.longform.map((v) => (
                  <li key={v.id}>
                    <Link
                      href={`/longform/${v.id}`}
                      className="surface block rounded-2xl px-4 py-3 transition hover:border-[var(--accent)]/40"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <SerialBadge id={v.id} />
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {formatWhen(v.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{v.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {v.authorName}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {show("community") && results.community.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
                <MessageSquareText size={15} />
                커뮤니티 {results.community.length}
              </h2>
              <ul className="space-y-2">
                {results.community.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/community/${p.id}`}
                      className="surface block rounded-2xl px-4 py-3 transition hover:border-[var(--accent)]/40"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <SerialBadge id={p.id} />
                        <span className="text-[11px] text-[var(--text-muted)]">
                          {formatWhen(p.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-muted)]">
                        {p.body}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {show("users") && results.users.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
                <Users size={15} />
                유저 {results.users.length}
              </h2>
              <ul className="space-y-2">
                {results.users.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/profile/${u.id}`}
                      className="surface block rounded-2xl px-4 py-3 transition hover:border-[var(--accent)]/40"
                    >
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        @{u.handle}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
