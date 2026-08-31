/**
 * 콘솔이 쓰는 최소 타입. BackendServer 의 `src/types/index.ts` 중 관리자
 * API 가 실제로 돌려주는 모양만 옮겨 적었다 — 앱 세 개가 패키지를 공유할
 * 만큼의 규모가 아니라, 소규모 중복을 허용하고 각자 필요한 것만 둔다.
 */

export type UserRole = "user" | "admin";

export type Author = {
  id: string;
  handle: string;
  name: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
};

export type AdminUser = Author & {
  suspended: boolean;
  createdAt: string;
};

export type ReportStatus = "open" | "resolved" | "dismissed";

export type AdminReport = {
  id: number;
  reporterId: string;
  reporterHandle: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
};

export type AdminStats = {
  userCount: number;
  suspendedCount: number;
  openReportCount: number;
  inquiryCount: number;
  unrepliedInquiryCount: number;
  shortCount: number;
  longformCount: number;
  communityCount: number;
};

export type AdminInquiry = {
  id: number;
  subject: string;
  body: string;
  authorName: string;
  authorHandle: string;
  ownerId: string;
  createdAt: string;
  adminReply?: string;
  repliedAt?: string;
};

export type Short = {
  id: string;
  title: string;
  description?: string;
  author: Author;
  likes: number;
  comments: number;
  views: string;
  videoUrl?: string;
  thumb?: string;
  gradient: string;
  createdAt: string;
};

export type LongformVideo = {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumb?: string;
  gradient: string;
  authorName: string;
  createdAt: string;
};

export type CommunityPost = {
  id: number;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
};
