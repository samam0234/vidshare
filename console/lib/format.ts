/** ISO 문자열을 콘솔 표에서 읽기 좋은 형태로. */
export function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 목록 셀에 길게 늘어지는 본문을 자른다. */
export function truncate(text: string, max = 80) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
