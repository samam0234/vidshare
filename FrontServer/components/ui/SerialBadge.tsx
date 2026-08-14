import { formatSerial } from "@/lib/content-store";
import { cn } from "@/lib/utils";

export default function SerialBadge({
  id,
  className,
}: {
  id: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-[var(--btn)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--accent)]",
        className
      )}
    >
      {formatSerial(id)}
    </span>
  );
}
