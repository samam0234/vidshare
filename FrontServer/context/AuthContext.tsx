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
import { authApi } from "@/lib/auth";

type AuthSnap = { user: Author | null; ready: boolean };

let snap: AuthSnap = { user: null, ready: false };
let loading = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

async function loadMe() {
  if (loading) return;
  loading = true;
  const res = await authApi.me();
  snap = {
    user: res.success && res.data ? res.data : null,
    ready: true,
  };
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

const serverSnap: AuthSnap = { user: null, ready: false };

function getServerSnapshot(): AuthSnap {
  return serverSnap;
}

type AuthContextValue = {
  user: Author | null;
  ready: boolean;
  refresh: () => Promise<void>;
  login: (handle: string, password: string) => Promise<string | null>;
  register: (input: {
    handle: string;
    name: string;
    password: string;
  }) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ready: false,
  refresh: async () => undefined,
  login: async () => "준비되지 않았습니다.",
  register: async () => "준비되지 않았습니다.",
  logout: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const refresh = useCallback(async () => {
    await loadMe();
  }, []);

  const login = useCallback(async (handle: string, password: string) => {
    const res = await authApi.login(handle, password);
    if (!res.success || !res.data) return res.error ?? "로그인에 실패했습니다.";
    snap = { user: res.data, ready: true };
    emit();
    return null;
  }, []);

  const register = useCallback(
    async (input: { handle: string; name: string; password: string }) => {
      const res = await authApi.register(input);
      if (!res.success || !res.data) {
        return res.error ?? "회원가입에 실패했습니다.";
      }
      snap = { user: res.data, ready: true };
      emit();
      return null;
    },
    []
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    snap = { user: null, ready: true };
    emit();
  }, []);

  const value = useMemo(
    () => ({ user, ready, refresh, login, register, logout }),
    [user, ready, refresh, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
