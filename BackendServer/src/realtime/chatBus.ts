import { EventEmitter } from "node:events";
import type { ChatLine } from "../types";

/** owner_id 를 채널로 쓰는 채팅 이벤트 버스. WebSocket 구독자에게 실시간으로 전달한다. */
export const chatBus = new EventEmitter();
chatBus.setMaxListeners(0);

export function publishChatLine(ownerId: string, line: ChatLine) {
  chatBus.emit(ownerId, line);
}
