"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, ImagePlus, Lock, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { IMAGE_MAX_BYTES, formatBytes, isImageFile, mediaUrl } from "@/lib/media";
import type { Short } from "@/types";
import Dialog from "@/components/ui/Dialog";

const TITLE_MAX = 100;
const DESCRIPTION_MAX = 2000;

type Props = {
  short: Short;
  onClose: () => void;
  onSaved: (short: Short) => void;
};

/** 업로더 전용 — 제목·설명·썸네일 수정, 공개 범위, 댓글 허용 */
export default function ShortEditDialog({ short, onClose, onSaved }: Props) {
  const thumbInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(short.title);
  const [description, setDescription] = useState(short.description ?? "");
  const [visibility, setVisibility] = useState<"public" | "private">(short.visibility ?? "public");
  const [commentsEnabled, setCommentsEnabled] = useState(short.commentsEnabled ?? true);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [removeThumb, setRemoveThumb] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    };
  }, [thumbPreview]);

  function onPickThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isImageFile(file)) {
      setError("이미지 형식만 올릴 수 있습니다. (jpg, png, webp, gif)");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setError(`이미지는 ${formatBytes(IMAGE_MAX_BYTES)} 이하여야 합니다.`);
      return;
    }
    setError(null);
    setThumbFile(file);
    setRemoveThumb(false);
    setThumbPreview(URL.createObjectURL(file));
  }

  function onRemoveThumb() {
    setThumbFile(null);
    setThumbPreview(null);
    setRemoveThumb(true);
  }

  async function save() {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError("제목을 입력해 주세요.");
      return;
    }
    setError(null);

    const patch: Parameters<typeof api.updateShort>[1] = {};
    if (nextTitle !== short.title) patch.title = nextTitle;
    if (description !== (short.description ?? "")) patch.description = description;
    if (visibility !== (short.visibility ?? "public")) patch.visibility = visibility;
    if (commentsEnabled !== (short.commentsEnabled ?? true)) patch.commentsEnabled = commentsEnabled;

    setBusy(true);
    if (thumbFile) {
      const uploaded = await api.uploadFile(thumbFile, "image");
      if (!uploaded.success || !uploaded.data) {
        setBusy(false);
        setError(uploaded.error ?? "썸네일 업로드에 실패했습니다.");
        return;
      }
      patch.thumb = uploaded.data.url;
    } else if (removeThumb && short.thumb) {
      patch.thumb = null;
    }

    if (Object.keys(patch).length === 0) {
      setBusy(false);
      onClose();
      return;
    }

    const res = await api.updateShort(short.id, patch);
    setBusy(false);
    if (!res.success || !res.data) {
      setError(res.error ?? "저장하지 못했습니다.");
      return;
    }
    onSaved(res.data);
  }

  const shownThumb = thumbPreview ?? (removeThumb ? undefined : mediaUrl(short.thumb));
  const field =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none";

  return (
    <Dialog title="영상 수정" onClose={onClose} locked={busy} initialFocus="#short-edit-title">
      <div className="flex flex-col gap-5">
        {error && (
          <p role="alert" className="rounded-xl bg-[var(--danger)]/10 px-4 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">제목</span>
          <input
            id="short-edit-title"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            className={field}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">내용</span>
          <textarea
            value={description}
            maxLength={DESCRIPTION_MAX}
            rows={4}
            onChange={(e) => setDescription(e.target.value)}
            className={cn(field, "resize-none")}
          />
        </label>

        <div className="space-y-2">
          <span className="text-sm font-semibold">썸네일</span>
          <div className="flex items-center gap-3">
            <div
              className="h-20 w-14 shrink-0 rounded-xl bg-cover bg-center"
              style={{ backgroundImage: shownThumb ? `url(${shownThumb})` : short.gradient }}
            />
            <input
              ref={thumbInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
              className="hidden"
              onChange={onPickThumb}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => thumbInput.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--btn)] px-3 py-2 text-sm font-medium hover:border-[var(--accent)]"
              >
                <ImagePlus size={15} />
                이미지 바꾸기
              </button>
              {(short.thumb || thumbFile) && !removeThumb && (
                <button
                  type="button"
                  onClick={onRemoveThumb}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--btn)] px-3 py-2 text-sm font-medium hover:border-[var(--danger)] hover:text-[var(--danger)]"
                >
                  <Trash2 size={15} />
                  제거
                </button>
              )}
            </div>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">공개 범위</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "public", label: "공개", hint: "누구나 볼 수 있어요", Icon: Globe },
                { value: "private", label: "비공개", hint: "나만 볼 수 있어요", Icon: Lock },
              ] as const
            ).map(({ value, label, hint, Icon }) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-sm",
                  visibility === value
                    ? "border-[var(--accent)] bg-[var(--accent)]/10"
                    : "border-[var(--border)] hover:border-[var(--accent)]"
                )}
              >
                <input
                  type="radio"
                  name="short-visibility"
                  value={value}
                  checked={visibility === value}
                  onChange={() => setVisibility(value)}
                  className="sr-only"
                />
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Icon size={14} />
                  {label}
                </span>
                <span className="text-xs text-[var(--text-muted)]">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
          <span>
            <span className="block text-sm font-semibold">댓글 허용</span>
            <span className="block text-xs text-[var(--text-muted)]">
              끄면 새 댓글을 쓸 수 없어요. 이미 달린 댓글은 그대로 보여요.
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={commentsEnabled}
            onChange={(e) => setCommentsEnabled(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-[var(--accent)]"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2.5 text-sm font-medium hover:border-[var(--accent)] disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
