"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  EllipsisVertical,
  EyeOff,
  Flag,
  Link2,
  Lock,
  Pencil,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { loginHref } from "@/lib/guest-routes";
import { cn } from "@/lib/utils";
import {
  shortMenuItems,
  shortMenuRole,
  type ShortMenuAction,
} from "@/lib/short-menu";
import type { Short } from "@/types";
import Dialog from "@/components/ui/Dialog";
import ShortEditDialog from "./ShortEditDialog";
import ShortReportDialog from "./ShortReportDialog";

const ICONS: Record<ShortMenuAction, LucideIcon> = {
  edit: Pencil,
  delete: Trash2,
  notInterested: EyeOff,
  copyLink: Link2,
  profile: UserRound,
  report: Flag,
  block: Ban,
};

type Props = {
  short: Short;
  /** 수정이 저장되면 목록의 해당 쇼츠를 갈아 끼운다 */
  onEdited: (short: Short) => void;
  onDeleted: (id: string) => void;
  /** 비추천 — 저장·목록에서 빼기·되돌리기 안내는 피드가 맡는다 */
  onNotInterested: (short: Short) => void;
  onBlocked: (authorId: string) => void;
  notify: (text: string) => void;
};

type Dialogs = "edit" | "delete" | "report" | "block" | null;

export default function ShortMenu({
  short,
  onEdited,
  onDeleted,
  onNotInterested,
  onBlocked,
  notify,
}: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = shortMenuRole({ userId: user?.id, authorId: short.author.id });
  const items = shortMenuItems(role);
  const isPrivate = short.visibility === "private";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (e.target instanceof Node && !rootRef.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function closeDialog() {
    if (busy) return;
    setDialog(null);
    setError(null);
  }

  function goLogin() {
    router.push(loginHref("/"));
  }

  async function copyLink() {
    const url = `${window.location.origin}/?id=${encodeURIComponent(short.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      notify("링크를 복사했어요");
    } catch {
      notify("링크를 복사하지 못했어요");
    }
  }

  function run(action: ShortMenuAction, requiresLogin?: boolean) {
    setOpen(false);
    if (requiresLogin && !user) {
      goLogin();
      return;
    }
    switch (action) {
      case "edit":
        setDialog("edit");
        break;
      case "delete":
        setDialog("delete");
        break;
      case "report":
        setDialog("report");
        break;
      case "block":
        setDialog("block");
        break;
      case "notInterested":
        onNotInterested(short);
        break;
      case "copyLink":
        void copyLink();
        break;
      case "profile":
        router.push(`/profile/${short.author.id}`);
        break;
    }
  }

  async function confirmDelete() {
    setBusy(true);
    setError(null);
    const res = await api.deleteShort(short.id);
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "삭제하지 못했습니다.");
      return;
    }
    setDialog(null);
    onDeleted(short.id);
    notify("영상을 삭제했어요");
  }

  async function confirmBlock() {
    setBusy(true);
    setError(null);
    const res = await api.blockUser(short.author.id);
    setBusy(false);
    if (!res.success) {
      setError(res.error ?? "차단하지 못했습니다.");
      return;
    }
    setDialog(null);
    onBlocked(short.author.id);
    notify(`@${short.author.handle} 님을 차단했어요`);
  }

  return (
    <>
      <div ref={rootRef} className="absolute left-3 top-3 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full glass-btn text-white"
          aria-label="영상 설정"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <EllipsisVertical size={20} />
        </button>

        {role === "owner" && isPrivate && (
          <span className="inline-flex items-center gap-1 rounded-full glass-btn px-2.5 py-1 text-xs font-semibold text-white">
            <Lock size={12} />
            비공개
          </span>
        )}

        {open && (
          <div
            role="menu"
            aria-label="영상 설정"
            className="absolute left-0 top-12 min-w-[220px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] py-1.5 text-[var(--text)] shadow-[var(--shadow)]"
          >
            {items.map((item) => {
              const Icon = ICONS[item.action];
              return (
                <button
                  key={item.action}
                  type="button"
                  role="menuitem"
                  onClick={() => run(item.action, item.requiresLogin)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-[var(--btn)]",
                    item.danger && "text-[var(--danger)]"
                  )}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {item.requiresLogin && !user && (
                    <span className="shrink-0 text-[10px] text-[var(--text-muted)]">로그인</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {dialog === "edit" && (
        <ShortEditDialog
          short={short}
          onClose={closeDialog}
          onSaved={(updated) => {
            setDialog(null);
            onEdited(updated);
            notify("저장했어요");
          }}
        />
      )}

      {dialog === "report" && (
        <ShortReportDialog
          shortId={short.id}
          onClose={closeDialog}
          onDone={() => {
            setDialog(null);
            notify("신고가 접수됐어요");
          }}
        />
      )}

      {dialog === "delete" && (
        <ConfirmDialog
          title="영상을 삭제할까요?"
          body={`"${short.title}" 영상과 댓글, 업로드한 파일이 함께 삭제되고 되돌릴 수 없어요.`}
          confirmLabel="삭제"
          busyLabel="삭제 중..."
          busy={busy}
          error={error}
          onConfirm={() => void confirmDelete()}
          onClose={closeDialog}
        />
      )}

      {dialog === "block" && (
        <ConfirmDialog
          title={`@${short.author.handle} 님을 차단할까요?`}
          body="이 사용자의 영상이 내 피드에서 사라지고, 서로의 팔로우가 해제돼요. 상대 프로필에서 언제든 차단을 풀 수 있어요."
          confirmLabel="차단"
          busyLabel="차단 중..."
          busy={busy}
          error={error}
          onConfirm={() => void confirmBlock()}
          onClose={closeDialog}
        />
      )}
    </>
  );
}

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  busyLabel,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog title={title} onClose={onClose} locked={busy} initialFocus="[data-cancel]">
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">{body}</p>
        {error && (
          <p role="alert" className="rounded-xl bg-[var(--danger)]/10 px-4 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            data-cancel
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2.5 text-sm font-medium hover:border-[var(--accent)] disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl bg-[var(--danger)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
