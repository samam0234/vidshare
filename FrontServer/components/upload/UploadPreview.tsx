type Props = {
  title: string;
  description: string;
  thumb: string | null;
  video: string | null;
  gradient: string;
};

export default function UploadPreview({
  title,
  description,
  thumb,
  video,
  gradient,
}: Props) {
  return (
    <section className="flex flex-col items-center">
      <h2 className="mb-3 self-start text-sm font-semibold text-[var(--text-muted)]">
        미리보기
      </h2>
      <div
        className="relative aspect-[9/16] w-full max-w-sm overflow-hidden rounded-3xl border border-[var(--border)] shadow-[var(--shadow)]"
        style={{
          backgroundImage: !video && thumb ? `url(${thumb})` : gradient,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {video ? (
          <video
            src={video}
            poster={thumb ?? undefined}
            className="absolute inset-0 h-full w-full object-cover"
            muted
            loop
            playsInline
            autoPlay
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 text-white">
          <h3 className="text-lg font-bold leading-snug">
            {title.trim() || "(제목)"}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm text-white/85">
            {description.trim() || "(내용)"}
          </p>
        </div>
      </div>
    </section>
  );
}
