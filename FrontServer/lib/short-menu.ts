/** 쇼츠 카드의 ⋮ 설정 메뉴가 누구에게 무엇을 보여 주는지. */

export type ShortMenuRole = "owner" | "member" | "guest";

export type ShortMenuAction =
  | "edit"
  | "delete"
  | "notInterested"
  | "copyLink"
  | "profile"
  | "report"
  | "block";

export type ShortMenuItem = {
  action: ShortMenuAction;
  label: string;
  /** 비로그인이 누르면 로그인 화면으로 보낸다 */
  requiresLogin?: boolean;
  danger?: boolean;
};

const OWNER_ITEMS: ShortMenuItem[] = [
  { action: "edit", label: "수정 · 공개/댓글 설정" },
  { action: "delete", label: "삭제", danger: true },
];

const VIEWER_ITEMS: ShortMenuItem[] = [
  { action: "notInterested", label: "비추천 · 내 추천에서 제외" },
  { action: "copyLink", label: "링크 복사" },
  { action: "profile", label: "작성자 프로필" },
  { action: "report", label: "신고", requiresLogin: true, danger: true },
  { action: "block", label: "작성자 차단", requiresLogin: true, danger: true },
];

export function shortMenuRole(opts: { userId?: string | null; authorId: string }): ShortMenuRole {
  if (!opts.userId) return "guest";
  return opts.userId === opts.authorId ? "owner" : "member";
}

export function shortMenuItems(role: ShortMenuRole): ShortMenuItem[] {
  return role === "owner" ? OWNER_ITEMS : VIEWER_ITEMS;
}

export const REPORT_REASONS = [
  "스팸 · 광고",
  "폭력 · 혐오",
  "저작권 침해",
  "성적 · 부적절한 콘텐츠",
  "기타",
] as const;

export const REPORT_REASON_OTHER = "기타";
export const REPORT_REASON_MAX = 500;

/** 신고 사유 문자열을 만든다. "기타"는 직접 쓴 내용이 있어야 한다. 서버 상한(500자)을 넘지 않는다. */
export function buildReportReason(reason: string, detail: string): string | null {
  const base = reason.trim();
  const extra = detail.trim();
  if (!base) return null;
  if (base === REPORT_REASON_OTHER && !extra) return null;
  const text = extra ? `${base} — ${extra}` : base;
  return text.slice(0, REPORT_REASON_MAX);
}
