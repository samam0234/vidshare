"use client";

import type { ChatLine } from "@/types/content";
import { api } from "./api";

function resolveWsUrl() {
  return `${api.baseUrl.replace(/^http/, "ws")}/ws/conversations`;
}

let socket: WebSocket | null = null;
let intentionalClose = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(line: ChatLine) => void>();

function handleMessage(event: MessageEvent) {
  try {
    const msg = JSON.parse(event.data as string) as {
      type?: string;
      data?: ChatLine;
    };
    if (msg?.type === "chat_line" && msg.data) {
      listeners.forEach((cb) => cb(msg.data as ChatLine));
    }
  } catch {
    // 파싱 실패한 프레임은 무시한다.
  }
}

/** 로그인 상태일 때 호출. 메시지 실시간 수신(WS) 연결을 연다. 이미 연결돼 있으면 아무 것도 하지 않는다. */
export function connectChatSocket() {
  if (typeof window === "undefined" || socket) return;
  intentionalClose = false;
  socket = new WebSocket(resolveWsUrl());
  socket.addEventListener("message", handleMessage);
  socket.addEventListener("close", () => {
    socket = null;
    if (!intentionalClose) {
      reconnectTimer = setTimeout(connectChatSocket, 3000);
    }
  });
  socket.addEventListener("error", () => {
    socket?.close();
  });
}

/** 로그아웃 시 호출. 재연결 시도를 멈추고 연결을 닫는다. */
export function disconnectChatSocket() {
  intentionalClose = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
}

/** 대화 상대와 무관하게 본인 채널에 새 채팅 줄이 생길 때마다 호출된다. 구독 해제 함수를 반환한다. */
export function onChatLine(callback: (line: ChatLine) => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * WS 로 메시지 전송을 시도한다. 연결이 열려 있지 않으면 false 를 반환하며,
 * 호출부에서 REST(`api.sendChatLine`)로 폴백해야 한다.
 */
export function sendChatLineWS(
  conversationId: number,
  payload: { content: string; isImage?: boolean }
) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify({ type: "send", conversationId, ...payload }));
  return true;
}
