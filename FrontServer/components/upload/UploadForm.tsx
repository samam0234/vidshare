"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Film, ImagePlus, Shuffle, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { randomGradient } from "@/lib/utils";
import {
  IMAGE_MAX_BYTES,
  VIDEO_MAX_BYTES,
  formatBytes,
  isImageFile,
  isVideoFile,
} from "@/lib/media";
import UploadPreview from "./UploadPreview";

// Stable default so server-rendered HTML matches the client's first render.
// The actual random gradient is applied after mount (client-only) via useEffect.
const DEFAULT_GRADIENT = "linear-gradient(160deg, hsl(220 70% 45%), hsl(260 65% 30%))";

export default function UploadForm() {
  const router = useRouter();
  const { user } = useAuth();
  const videoRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [gradient, setGradient] = useState(DEFAULT_GRADIENT);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: randomize only after hydration to avoid SSR/client mismatch
    setGradient(randomGradient());
  }, []);

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  useEffect(() => {
    return () => {
      if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    };
  }, [thumbPreview]);

  function replacePreview(
    setter: Dispatch<SetStateAction<string | null>>,
    file: File | null
  ) {
    setter((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

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
    replacePreview(setVideoPreview, file);
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
    replacePreview(setThumbPreview, file);
  }

  function onRandom() {
    setThumbFile(null);
    replacePreview(setThumbPreview, null);
    setGradient(randomGradient());
  }

  async function onUpload() {
    if (!title.trim()) {
      setError("제목을 입력해 주세요.");
      return;
    }
    setError(null);
    setUploading(true);

    let videoUrl: string | undefined;
    let thumb: string | undefined;
    if (videoFile) {
      const uploaded = await api.uploadFile(videoFile, "video");
      if (!uploaded.success || !uploaded.data) {
        setUploading(false);
        setError(uploaded.error ?? "영상 업로드에 실패했습니다.");
        return;
      }
      videoUrl = uploaded.data.url;
    }
    if (thumbFile) {
      const uploaded = await api.uploadFile(thumbFile, "image");
      if (!uploaded.success || !uploaded.data) {
        setUploading(false);
        setError(uploaded.error ?? "썸네일 업로드에 실패했습니다.");
        return;
      }
      thumb = uploaded.data.url;
    }

    const res = await api.createShort({
      title: title.trim(),
      description: desc.trim() || undefined,
      gradient,
      videoUrl,
      thumb,
    });
    setUploading(false);
    if (!res.success || !res.data) {
      setError(res.error ?? "업로드에 실패했습니다.");
      return;
    }
    setDone(true);
    setTimeout(
      () => router.push(`/profile/${res.data!.author.id ?? user?.id ?? "u-me"}`),
      1200
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-8 lg:grid-cols-2">
      <UploadPreview
        title={title}
        description={desc}
        thumb={thumbPreview}
        video={videoPreview}
        gradient={gradient}
      />

      <section className="surface flex flex-col gap-5 rounded-3xl p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-bold">쇼츠 업로드</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            영상을 올리면 서버에 파일로 저장됩니다. 썸네일은 선택입니다.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">제목</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-semibold">내용</span>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="내용을 입력하세요..."
            rows={5}
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </label>

        <div className="space-y-2">
          <span className="text-sm font-semibold">영상</span>
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
              이미지 가져오기
            </button>
            <button
              type="button"
              onClick={onRandom}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--btn)] px-4 py-2.5 text-sm font-medium hover:border-[var(--accent)]"
            >
              <Shuffle size={16} />
              랜덤 지정
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void onUpload()}
          disabled={uploading || done}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-5 py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          <Upload size={18} />
          {done
            ? "업로드 완료!"
            : uploading
              ? "업로드 중..."
              : "쇼츠 업로드"}
        </button>

        {done && (
          <p className="text-center text-sm text-[var(--success)]">
            쇼츠 업로드가 완료되었습니다. 프로필로 이동합니다…
          </p>
        )}
        {error && (
          <p className="text-center text-sm text-[var(--danger)]">{error}</p>
        )}
      </section>
    </main>
  );
}
