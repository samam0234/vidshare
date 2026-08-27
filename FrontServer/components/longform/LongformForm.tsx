"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Film, ImagePlus, Shuffle, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { randomGradient } from "@/lib/utils";
import {
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  formatBytes,
  isImageFile,
  isVideoFile,
} from "@/lib/media";

// Stable default so server-rendered HTML matches the client's first render.
// The actual random gradient is applied after mount (client-only) via useEffect.
const DEFAULT_GRADIENT = "linear-gradient(160deg, hsl(220 70% 45%), hsl(260 65% 30%))";

export default function LongformForm() {
  const router = useRouter();
  const videoRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | undefined>();
  const [gradient, setGradient] = useState(DEFAULT_GRADIENT);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: randomize only after hydration to avoid SSR/client mismatch
    setGradient(randomGradient());
  }, []);

  useEffect(() => {
    return () => {
      if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    };
  }, [thumbPreview]);

  function onPickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isVideoFile(file)) {
      setError("영상 형식만 올릴 수 있습니다. (mp4, webm, mov)");
      return;
    }
    if (file.size > VIDEO_MAX_BYTES) {
      setError(`영상은 ${formatBytes(VIDEO_MAX_BYTES)} 이하여야 합니다.`);
      return;
    }
    setError(null);
    setVideoFile(file);
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
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
    setThumbPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  async function onSubmit() {
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError(null);

    let storedVideo = videoUrl.trim() || undefined;
    if (videoFile) {
      const uploaded = await api.uploadFile(videoFile, "video");
      if (!uploaded.success || !uploaded.data) {
        setError(uploaded.error ?? "영상 업로드에 실패했습니다.");
        setBusy(false);
        return;
      }
      storedVideo = uploaded.data.url;
    }

    let storedThumb: string | undefined;
    if (thumbFile) {
      const uploaded = await api.uploadFile(thumbFile, "image");
      if (!uploaded.success || !uploaded.data) {
        setError(uploaded.error ?? "썸네일 업로드에 실패했습니다.");
        setBusy(false);
        return;
      }
      storedThumb = uploaded.data.url;
    }

    const res = await api.createLongform({
      title,
      description: desc,
      videoUrl: storedVideo,
      thumb: storedThumb,
      gradient,
    });
    if (!res.success || !res.data) {
      setError(res.error ?? "등록에 실패했습니다.");
      setBusy(false);
      return;
    }
    router.push(`/longform/${res.data.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">롱폼 등록</h1>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        영상을 파일로 올리거나 외부 URL을 넣을 수 있습니다. 저장하면 상세 페이지로 이동합니다.
      </p>

      <section className="surface mt-6 flex flex-col gap-5 rounded-3xl p-6">
        {error && (
          <p className="rounded-xl bg-[var(--danger)]/10 px-4 py-2.5 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">제목</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="롱폼 제목"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">설명</span>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={5}
            placeholder="영상 소개"
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </label>
        <div className="space-y-2">
          <span className="text-sm font-semibold">영상 파일</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={videoRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              className="hidden"
              onChange={onPickVideo}
            />
            <button
              type="button"
              onClick={() => videoRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2.5 text-sm font-medium hover:border-[var(--accent)]"
            >
              <Film size={16} />
              영상 선택
            </button>
            {videoFile ? (
              <span className="text-xs text-[var(--text-muted)]">
                {videoFile.name} · {formatBytes(videoFile.size)}
              </span>
            ) : (
              <span className="text-xs text-[var(--text-muted)]">
                mp4 / webm / mov, 최대 {formatBytes(VIDEO_MAX_BYTES)}
              </span>
            )}
          </div>
        </div>
        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">
            영상 URL {videoFile ? "(파일이 있으면 무시됨)" : "(선택)"}
          </span>
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://..."
            disabled={Boolean(videoFile)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
          />
        </label>
        <div className="space-y-2">
          <span className="text-sm font-semibold">썸네일</span>
          <div className="flex flex-wrap gap-2">
            <input
              ref={thumbRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
              className="hidden"
              onChange={onPickImage}
            />
            <button
              type="button"
              onClick={() => thumbRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2.5 text-sm font-medium hover:border-[var(--accent)]"
            >
              <ImagePlus size={16} />
              이미지
            </button>
            <button
              type="button"
              onClick={() => {
                setThumbFile(null);
                setThumbPreview((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return undefined;
                });
                setGradient(randomGradient());
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2.5 text-sm font-medium hover:border-[var(--accent)]"
            >
              <Shuffle size={16} />
              랜덤
            </button>
          </div>
          <div
            className="h-32 rounded-2xl bg-cover bg-center"
            style={{
              backgroundImage: thumbPreview ? `url(${thumbPreview})` : gradient,
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          <Upload size={18} />
          {busy ? "등록 중..." : "등록하고 상세 보기"}
        </button>
      </section>
    </main>
  );
}
