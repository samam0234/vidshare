"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onUp: () => void;
  onDown: () => void;
  canUp: boolean;
  canDown: boolean;
  className?: string;
};

export default function ScrollNav({
  onUp,
  onDown,
  canUp,
  canDown,
  className,
}: Props) {
  const btn =
    "flex h-11 w-11 items-center justify-center rounded-full glass-btn text-white transition hover:bg-white/30 disabled:opacity-30 disabled:hover:bg-white/10";

  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-col gap-3",
        className
      )}
    >
      <button
        type="button"
        onClick={onUp}
        disabled={!canUp}
        className={btn}
        aria-label="이전 쇼츠"
      >
        <ChevronUp size={22} />
      </button>
      <button
        type="button"
        onClick={onDown}
        disabled={!canDown}
        className={btn}
        aria-label="다음 쇼츠"
      >
        <ChevronDown size={22} />
      </button>
    </div>
  );
}
