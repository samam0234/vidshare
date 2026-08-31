"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Author } from "@/types";
import { adminApi } from "@/lib/adminApi";

/**
 * FrontServer 의 AuthContext 와 같은 useSyncExternalStore 구조.
 * 회원가입이 없다는 점만 다르다 — 관리자 계정은 서버에서
 * `npm run create-admin` 으로만 만든다.
 */

type AuthSnap = { admin: Author | null; ready: boolean };

let snap: AuthSnap = { admin: null, ready: false };
let loading = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

async function loadMe() {
  if (loading) return;
  loading = true;
  const res = await adminApi.me();
  snap = { admin: res.success && res.data ? res.data : null, ready: true };
  loading = false;
  emit();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (!snap.ready) void loadMe();
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return snap;
}

const serverSnap: AuthSnap = { admin: null, ready: false };

function getServerSnapshot(): AuthSnap {
  return serverSnap;
}

type AdminAuthValue = {
  admin: Author | null;
  ready: boolean;
  refresh: () => Promise<void>;
  login: (handle: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthValue>({
  admin: null,
  ready: false,
  refresh: async () => undefined,
  login: async () => "준비되지 않았습니다.",
  logout: async () => undefined,
});

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { admin, ready } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const refresh = useCallback(async () => {
    await loadMe();
  }, []);

  const login = useCallback(async (handle: string, password: string) => {
    const res = await adminApi.login(handle, password);
    if (!res.success || !res.data) return res.error ?? "로그인에 실패했습니다.";
    snap = { admin: res.data, ready: true };
    emit();
    return null;
  }, []);

  const logout = useCallback(async () => {
    await adminApi.logout();
    snap = { admin: null, ready: true };
    emit();
  }, []);

  const value = useMemo(
    () => ({ admin, ready, refresh, login, logout }),
    [admin, ready, refresh, login, logout]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
