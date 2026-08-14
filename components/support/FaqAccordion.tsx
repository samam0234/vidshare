"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { faqItems } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function FaqAccordion() {
  const [open, setOpen] = useState<Record<string, boolean>>({
    q1: true,
  });

  function toggle(id: string) {
    setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function expandAll() {
    const next: Record<string, boolean> = {};
    faqItems.forEach((f) => {
      next[f.id] = true;
    });
    setOpen(next);
  }

  function collapseAll() {
    setOpen({});
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">
        🎬 쇼츠 문제 해결 방법 안내문
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        자주 묻는 문제와 해결 방법을 확인해 보세요.
      </p>
      <hr className="my-6 border-[var(--border)]" />

      <div className="space-y-3">
        {faqItems.map((item, i) => {
          const isOpen = !!open[item.id];
          return (
            <section
              key={item.id}
              className="surface overflow-hidden rounded-2xl"
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left"
                aria-expanded={isOpen}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-sm font-bold text-[var(--accent)]">
                  {i + 1}
                </span>
                <span className="flex-1 font-semibold">{item.question}</span>
                <ChevronDown
                  size={18}
                  className={cn(
                    "text-[var(--text-muted)] transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              {isOpen && (
                <div className="border-t border-[var(--border)] px-4 py-4">
                  <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--text-muted)]">
                    {item.answers.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={expandAll}
          className="rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2 text-sm font-medium hover:border-[var(--accent)]"
        >
          모두 열기
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2 text-sm font-medium hover:border-[var(--accent)]"
        >
          모두 닫기
        </button>
      </div>
    </main>
  );
}
