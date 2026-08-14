export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1).replace(/\.0$/, "")}만`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function nowTimeLabel(): string {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const period = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 || 12;
  return `${period} ${hour12}:${m}`;
}

export function randomGradient(): string {
  const a = Math.floor(Math.random() * 360);
  const b = (a + 40 + Math.floor(Math.random() * 80)) % 360;
  return `linear-gradient(160deg, hsl(${a} 70% 45%), hsl(${b} 65% 30%))`;
}
