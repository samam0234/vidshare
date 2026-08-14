"use client";

import { useState } from "react";
import {
  chatUsers,
  initialMessages,
} from "@/lib/mock-data";
import type { Message } from "@/types";
import { nowTimeLabel } from "@/lib/utils";
import ChatArea from "./ChatArea";
import UserList from "./UserList";

export default function MessagesPageClient() {
  const [activeId, setActiveId] = useState(chatUsers[0].id);
  const [messagesMap, setMessagesMap] =
    useState<Record<string, Message[]>>(initialMessages);

  const activeUser =
    chatUsers.find((u) => u.id === activeId) ?? chatUsers[0];
  const messages = messagesMap[activeId] ?? [];

  function onSend(content: string, isImage = false) {
    const msg: Message = {
      id: `m-${Date.now()}`,
      userId: activeId,
      type: "me",
      content,
      isImage,
      time: nowTimeLabel(),
    };
    setMessagesMap((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] ?? []), msg],
    }));
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-2 py-4 sm:px-4 md:py-6">
      <div className="surface flex min-h-[70vh] flex-1 flex-col overflow-hidden rounded-3xl shadow-sm md:flex-row">
        <UserList
          users={chatUsers}
          activeId={activeId}
          onSelect={setActiveId}
        />
        <ChatArea
          user={activeUser}
          messages={messages}
          onSend={onSend}
        />
      </div>
    </main>
  );
}
