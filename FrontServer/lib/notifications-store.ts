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

/** 로그인 상태일 때 호출. Navbar/알림 페이지가 각자 마운트 시 호출해도 안전(중복 로딩 방지). */
export async function refreshNotifications() {
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

export function useNotifications() {
  const notifications = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}
