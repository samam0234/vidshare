"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bot, Plus } from "lucide-react";
import { addChatbotThread, formatWhen, useContentStore } from "@/lib/content-store";
import { useAuth } from "@/context/AuthContext";
import { loginHref } from "@/lib/guest-routes";
import {
  CHATBOT_PRODUCTS,
  productLabel,
  type ChatbotProduct,
} from "@/lib/chatbot-models";
import SerialBadge from "@/components/ui/SerialBadge";
import { cn } from "@/lib/utils";

export default function ChatbotHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { chatbotThreads } = useContentStore();
  const [product, setProduct] = useState<ChatbotProduct>("locals");

  function startThread() {
    const spec = CHATBOT_PRODUCTS.find((p) => p.id === product);
    if (spec?.memberOnly && !user) {
      router.push(loginHref("/chatbot"));
      return;
    }
    const t = addChatbotThread({ model: product });
    router.push(`/chatbot/${t.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">챗봇</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            비회원은 VidShare Locals만, 회원은 Vide·Shape까지 쓸 수 있습니다.
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

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {CHATBOT_PRODUCTS.map((p) => {
          const locked = p.memberOnly && !user;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (locked) {
                  router.push(loginHref("/chatbot"));
                  return;
                }
                setProduct(p.id);
              }}
              className={cn(
                "surface rounded-2xl p-4 text-left transition hover:border-[var(--accent)]/40",
                product === p.id && !locked && "ring-2 ring-[var(--accent)]"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{p.name}</span>
                {p.memberOnly ? (
                  <span className="rounded-full bg-[var(--btn)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                    회원
                  </span>
                ) : (
                  <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                    무료
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                {p.blurb}
              </p>
              {locked && (
                <p className="mt-2 text-[11px] text-[var(--accent)]">
                  로그인하면 사용할 수 있습니다
                </p>
              )}
            </button>
          );
        })}
      </div>

      {chatbotThreads.length === 0 ? (
        <div className="surface mt-8 flex flex-col items-center gap-3 rounded-3xl px-6 py-16 text-center">
          <Bot className="text-[var(--text-muted)]" size={36} />
          <p className="text-sm text-[var(--text-muted)]">
            아직 대화가 없습니다. 모델을 고르고 새 대화를 시작해 보세요.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {chatbotThreads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/chatbot/${t.id}`}
                className="surface block rounded-2xl p-4 transition hover:border-[var(--accent)]/40"
              >
                <div className="flex items-center gap-2">
                  <SerialBadge id={t.id} />
                  <span className="text-xs font-medium text-[var(--accent)]">
                    {productLabel(t.model)}
                  </span>
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
