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

let enabled = true;
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

/** 서버에 저장된 수신 설정을 읽어 온다. 로그인 직후 호출. */
export async function refreshNotificationSettings() {
  const res = await api.getNotificationSettings();
  if (res.success && res.data && res.data.enabled !== enabled) {
    enabled = res.data.enabled;
    emitEnabled();
  }
}

/** 알림 수신 여부 토글. 서버에 저장하고, 끄면 목록을 비운다. 실패 시 되돌린다. */
export async function setNotificationsEnabled(next: boolean) {
  if (enabled === next) return;
  const prev = enabled;
  enabled = next;
  emitEnabled();
  if (next) {
    void refreshNotifications();
  } else {
    items = EMPTY;
    emit();
  }

  const res = await api.patchNotificationSettings(next);
  if (!res.success) {
    enabled = prev;
    emitEnabled();
    if (prev) void refreshNotifications();
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

/** 로그아웃 시 비우기. 수신 설정은 계정별이므로 기본값으로 되돌린다. */
export function resetNotifications() {
  items = EMPTY;
  emit();
  if (!enabled) {
    enabled = true;
    emitEnabled();
  }
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
  const prev = items;
  items = items.map((n) => (n.read ? n : { ...n, read: true }));
  emit();
  const res = await api.markAllNotificationsRead();
  if (!res.success) {
    items = prev;
    emit();
  }
}

/** 알림 전체 삭제 */
export async function clearAllNotifications() {
  if (!items.length) return;
  const prev = items;
  items = EMPTY;
  emit();
  const res = await api.clearAllNotifications();
  if (!res.success) {
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
