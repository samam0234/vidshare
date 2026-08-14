"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImagePlus, Shuffle, Upload } from "lucide-react";
import { randomGradient } from "@/lib/utils";
import UploadPreview from "./UploadPreview";

export default function UploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [thumb, setThumb] = useState<string | null>(null);
  const [gradient, setGradient] = useState(randomGradient());
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setThumb(String(reader.result));
    };
    reader.readAsDataURL(file);
  }

  function onRandom() {
    setThumb(null);
    setGradient(randomGradient());
  }

  function onUpload() {
    if (!title.trim()) {
      alert("제목을 입력해 주세요.");
      return;
    }
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      setDone(true);
      setTimeout(() => router.push("/profile/u-me"), 1200);
    }, 900);
  }

  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-8 lg:grid-cols-2">
      <UploadPreview
        title={title}
        description={desc}
        thumb={thumb}
        gradient={gradient}
      />

      <section className="surface flex flex-col gap-5 rounded-3xl p-6 shadow-sm">
        <div>
          <h1 className="text-xl font-bold">쇼츠 업로드</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            제목과 내용을 입력하고 썸네일을 지정하세요.
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
          <span className="text-sm font-semibold">썸네일</span>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickImage}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
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
          onClick={onUpload}
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
      </section>
    </main>
  );
}
