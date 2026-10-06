/** /upload 화면의 서브메뉴. 기본은 쇼츠. */
export type UploadTab = "shorts" | "longform";

export const UPLOAD_TABS: { id: UploadTab; label: string }[] = [
  { id: "shorts", label: "쇼츠 업로드" },
  { id: "longform", label: "롱폼 업로드" },
];

/** `?type=` 값을 탭으로 바꾼다. 모르는 값·배열·빈 값은 기본(쇼츠). */
export function parseUploadTab(value: string | string[] | undefined | null): UploadTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim().toLowerCase() === "longform" ? "longform" : "shorts";
}

export function uploadHref(tab: UploadTab) {
  return tab === "longform" ? "/upload?type=longform" : "/upload";
}
