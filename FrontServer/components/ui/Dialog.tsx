"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 처리 중에는 바깥 클릭·Esc 로 닫히지 않게 한다 */
  locked?: boolean;
  /** 열릴 때 포커스를 줄 요소의 선택자. 기본은 대화상자 자체 */
  initialFocus?: string;
};

/** 화면 중앙 모달. body 로 포털을 띄워 카드의 overflow·스크롤 영역에 잘리지 않는다. */
export default function Dialog({ title, onClose, children, locked, initialFocus }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const lockedRef = useRef(locked);

  useEffect(() => {
    onCloseRef.current = onClose;
    lockedRef.current = locked;
  });

  useEffect(() => {
    const panel = panelRef.current;
    const target = (initialFocus && panel?.querySelector<HTMLElement>(initialFocus)) || panel;
    target?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !lockedRef.current) {
        e.stopPropagation();
        onCloseRef.current();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [initialFocus]);

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="닫기"
        tabIndex={-1}
        className="absolute inset-0 bg-black/60"
        onClick={() => !locked && onClose()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow)] focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 id={titleId} className="text-base font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            aria-label="닫기"
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--btn)] hover:text-[var(--text)] disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>
        <div className="custom-scroll overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
