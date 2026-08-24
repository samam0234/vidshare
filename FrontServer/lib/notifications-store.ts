"use client";

import { useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import type { AppNotification } from "@/types/content";

const EMPTY: AppNotification[] = [];

let items: AppNotification[] = EMPTY;
let loading = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return items;
}

function getServerSnapshot() {
  return EMPTY;
}

const ENABLED_KEY = "vidshare:notifications-enabled";

function readEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(ENABLED_KEY) !== "0";
}

let enabled = readEnabled();
const enabledListeners = new Set<() => void>();

function emitEnabled() {
  enabledListeners.forEach((l) => l());
}

function subscribeEnabled(listener: () => void) {
  enabledListeners.add(listener);
  return () => enabledListeners.delete(listener);
}

function getEnabledSnapshot() {
  return enabled;
}

function getEnabledServerSnapshot() {
  return true;
}

export function isNotificationsEnabled() {
  return enabled;
}

/** 알림 수신 여부 토글. 끄면 배지/목록을 비우고, 켜면 즉시 새로고침. */
export function setNotificationsEnabled(next: boolean) {
  if (enabled === next) return;
  enabled = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ENABLED_KEY, next ? "1" : "0");
  }
  emitEnabled();
  if (next) {
    void refreshNotifications();
  } else {
    items = EMPTY;
    emit();
  }
}

export function useNotificationsEnabled() {
  return useSyncExternalStore(
    subscribeEnabled,
    getEnabledSnapshot,
    getEnabledServerSnapshot
  );
}

/** 로그인 상태일 때 호출. Navbar/알림 페이지가 각자 마운트 시 호출해도 안전(중복 로딩 방지). */
export async function refreshNotifications() {
  if (!enabled) {
    items = EMPTY;
    emit();
    return;
  }
  if (loading) return;
  loading = true;
  const res = await api.getNotifications();
  loading = false;
  if (res.success && res.data) {
    items = res.data;
    emit();
  }
}

/** 로그아웃 시 비우기 */
export function resetNotifications() {
  items = EMPTY;
  emit();
}

export async function markNotificationRead(id: number) {
  items = items.map((n) => (n.id === id ? { ...n, read: true } : n));
  emit();
  await api.patchNotification(id, true);
}

export async function removeNotification(id: number) {
  const prev = items;
  items = items.filter((n) => n.id !== id);
  emit();
  const res = await api.deleteNotification(id);
  if (!res.success) {
    items = prev;
    emit();
  }
}

/** 안읽음 알림을 모두 읽음 처리 */
export async function markAllNotificationsRead() {
  const unread = items.filter((n) => !n.read);
  if (!unread.length) return;
  items = items.map((n) => (n.read ? n : { ...n, read: true }));
  emit();
  const results = await Promise.all(
    unread.map((n) => api.patchNotification(n.id, true))
  );
  if (results.some((r) => !r.success)) void refreshNotifications();
}

/** 알림 전체 삭제 */
export async function clearAllNotifications() {
  if (!items.length) return;
  const prev = items;
  const ids = items.map((n) => n.id);
  items = EMPTY;
  emit();
  const results = await Promise.all(
    ids.map((id) => api.deleteNotification(id))
  );
  if (results.some((r) => !r.success)) {
    items = prev;
    emit();
  }
}

export function useNotifications() {
  const notifications = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}
