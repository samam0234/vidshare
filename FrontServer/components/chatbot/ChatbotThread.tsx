"use client";

import ChatbotWorkspace from "./ChatbotWorkspace";

export default function ChatbotThread({ id }: { id: string }) {
  return <ChatbotWorkspace threadId={id} />;
}
