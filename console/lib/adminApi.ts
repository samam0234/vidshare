import { request } from "./api";
import type {
  AdminInquiry,
  AdminReport,
  AdminStats,
  AdminUser,
  Author,
  CommunityPost,
  LongformVideo,
  ReportStatus,
  Short,
} from "@/types";

export const adminApi = {
  // 인증
  me: () => request<Author>("/api/admin/auth/me"),
  login: (handle: string, password: string) =>
    request<Author>("/api/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ handle, password }),
    }),
  logout: () =>
    request<{ ok: boolean }>("/api/admin/auth/logout", { method: "POST" }),

  // 대시보드
  getStats: () => request<AdminStats>("/api/admin/dashboard/stats"),

  // 신고
  getReports: (status?: ReportStatus) =>
    request<AdminReport[]>(
      status ? `/api/admin/reports?status=${status}` : "/api/admin/reports"
    ),
  setReportStatus: (id: number, status: ReportStatus) =>
    request<{ id: number; status: ReportStatus }>(`/api/admin/reports/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  // 유저
  getUsers: (q?: string) =>
    request<AdminUser[]>(
      q?.trim() ? `/api/admin/users?q=${encodeURIComponent(q.trim())}` : "/api/admin/users"
    ),
  setUserSuspended: (id: string, suspended: boolean) =>
    request<{ id: string; suspended: boolean }>(
      `/api/admin/users/${encodeURIComponent(id)}/suspend`,
      { method: "PATCH", body: JSON.stringify({ suspended }) }
    ),

  // 콘텐츠 (읽기는 공개 API 를 그대로 쓰고, 삭제만 관리자 경로)
  getShorts: () => request<Short[]>("/api/shorts"),
  getLongform: () => request<LongformVideo[]>("/api/longform"),
  getCommunity: () => request<CommunityPost[]>("/api/community"),

  deleteShort: (id: string) =>
    request<{ deleted: string }>(
      `/api/admin/content/shorts/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    ),
  deleteLongform: (id: number) =>
    request<{ deleted: number }>(`/api/admin/content/longform/${id}`, {
      method: "DELETE",
    }),
  deleteCommunityPost: (id: number) =>
    request<{ deleted: number }>(`/api/admin/content/community/${id}`, {
      method: "DELETE",
    }),
  deleteComment: (id: string) =>
    request<{ deleted: string }>(
      `/api/admin/content/comments/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    ),

  // 고객센터
  getInquiries: (unreplied?: boolean) =>
    request<AdminInquiry[]>(
      unreplied
        ? "/api/admin/support/inquiries?unreplied=1"
        : "/api/admin/support/inquiries"
    ),
  replyToInquiry: (id: number, reply: string) =>
    request<AdminInquiry>(`/api/admin/support/inquiries/${id}/reply`, {
      method: "PATCH",
      body: JSON.stringify({ reply }),
    }),
};
