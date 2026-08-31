import { EventEmitter } from "node:events";
import type { AppNotification } from "../types";

/** owner_id 를 채널로 쓰는 알림 이벤트 버스. SSE 구독자에게 실시간으로 전달한다. */
export const notificationBus = new EventEmitter();
notificationBus.setMaxListeners(0);

export function publishNotification(
  ownerId: string,
  notification: AppNotification
) {
  notificationBus.emit(ownerId, notification);
}
