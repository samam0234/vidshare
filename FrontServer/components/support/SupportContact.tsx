"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { formatWhen } from "@/lib/content-store";
import { api } from "@/lib/api";
import SerialBadge from "@/components/ui/SerialBadge";
import type { SupportInquiry } from "@/types/content";

export default function SupportContact() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<SupportInquiry[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.getInquiries();
      if (cancelled) return;
      queueMicrotask(() => {
        if (res.success && res.data) setInquiries(res.data);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit() {
    if (!subject.trim() || !body.trim()) {
      alert("제목과 내용을 입력해 주세요.");
      return;
    }
    setBusy(true);
    const res = await api.createInquiry({ subject, body });
    setBusy(false);
    if (!res.success || !res.data) {
      alert(res.error ?? "문의 전송에 실패했습니다.");
      return;
    }
    setSubject("");
    setBody("");
    router.push(`/support/${res.data.id}`);
  }

  return (
    <section className="mt-10 space-y-5">
      <div>
        <h2 className="text-xl font-bold">문의 메시지</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          위 방법으로도 해결이 안 되면 메시지를 보내 주세요. 문의 번호가 부여됩니다.
        </p>
      </div>

      <div className="surface flex flex-col gap-4 rounded-3xl p-5">
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">제목</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="어떤 점이 안 되나요?"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">내용</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="어떤 화면에서, 무엇을 눌렀을 때 안 되는지 적어 주세요."
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          <Send size={16} />
          {busy ? "보내는 중..." : "메시지 보내기"}
        </button>
      </div>

      {inquiries.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--text-muted)]">
            내가 보낸 문의
          </h3>
          <ul className="space-y-2">
            {inquiries.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/support/${q.id}`}
                  className="surface flex items-center gap-2 rounded-2xl px-4 py-3 text-sm hover:border-[var(--accent)]/40"
                >
                  <SerialBadge id={q.id} />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {q.subject}
                  </span>
                  {q.adminReply ? (
                    <span className="shrink-0 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                      답변 완료
                    </span>
                  ) : null}
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">
                    {formatWhen(q.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
