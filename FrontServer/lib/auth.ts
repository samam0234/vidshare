import { request, type ApiResult } from "./api";
import type { Author } from "@/types";

export const authApi = {
  me: () => request<Author>("/api/auth/me"),
  login: (handle: string, password: string) =>
    request<Author>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ handle, password }),
    }),
  register: (input: { handle: string; name: string; password: string }) =>
    request<Author>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  logout: () =>
    request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
};

export type { ApiResult };
