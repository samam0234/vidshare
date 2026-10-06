import Link from "next/link";
import { cn } from "@/lib/utils";
import { UPLOAD_TABS, uploadHref, type UploadTab } from "@/lib/upload-tabs";

/** /upload 상단 서브메뉴 — 쇼츠(기본) / 롱폼. 탭마다 주소가 달라 새로고침·뒤로가기가 그대로 동작한다. */
export default function UploadTabs({ active }: { active: UploadTab }) {
  return (
    <nav
      aria-label="업로드 종류"
      className="mx-auto w-full max-w-5xl px-4 pt-6"
    >
      <div className="inline-flex gap-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-1">
        {UPLOAD_TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={uploadHref(tab.id)}
              replace
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-muted)] hover:bg-[var(--btn)] hover:text-[var(--text)]"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
