/** 일련번호·시각 포맷 유틸. 각 도메인 데이터는 이제 lib/api.ts로 직접 서버에서 가져온다. */

export function formatSerial(id: number | string) {
  const n = typeof id === "number" ? id : Number(id);
  if (!Number.isFinite(n)) return `#${id}`;
  return `#${String(n).padStart(3, "0")}`;
}

export function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min}`;
}
