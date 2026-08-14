"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Plus } from "lucide-react";
import { addChatbotThread, formatWhen, useContentStore } from "@/lib/content-store";
import SerialBadge from "@/components/ui/SerialBadge";

export default function ChatbotHome() {
  const router = useRouter();
  const { chatbotThreads } = useContentStore();

  function startThread() {
    const t = addChatbotThread();
    router.push(`/chatbot/${t.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">챗봇</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            새 대화를 시작하면 대화 번호가 생기고, 메시지마다 일련번호가 붙습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={startThread}
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Plus size={16} />
          새 대화
        </button>
      </div>

      {chatbotThreads.length === 0 ? (
        <div className="surface mt-8 flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
          <Bot className="text-[var(--text-muted)]" size={36} />
          <p className="text-sm text-[var(--text-muted)]">
            아직 대화가 없습니다. 새 대화를 시작해 보세요.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {chatbotThreads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/chatbot/${t.id}`}
                className="surface block rounded-2xl p-4 transition hover:border-[var(--accent)]/40"
              >
                <div className="flex items-center gap-2">
                  <SerialBadge id={t.id} />
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatWhen(t.updatedAt)}
                  </span>
                </div>
                <h2 className="mt-2 truncate font-semibold">{t.title}</h2>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
