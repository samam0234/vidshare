import type { NotificationCategory } from "./index";

export type LongformVideo = {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumb?: string;
  gradient: string;
  authorName: string;
  createdAt: string;
};

export type CommunityPost = {
  id: number;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
};

export type ChatbotThread = {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotMessage = {
  id: number;
  threadId: number;
  role: "user" | "bot";
  content: string;
  createdAt: string;
};

export type Conversation = {
  id: number;
  targetName: string;
  targetHandle: string;
  lastMessage: string;
  createdAt: string;
};

export type ChatLine = {
  id: number;
  conversationId: number;
  type: "me" | "other";
  content: string;
  isImage?: boolean;
  createdAt: string;
};

export type AppNotification = {
  id: number;
  category: NotificationCategory;
  message: string;
  read: boolean;
  href?: string;
  createdAt: string;
};

export type ContentState = {
  next: {
    longform: number;
    community: number;
    chatbotThread: number;
    chatbotMessage: number;
    conversation: number;
    chatLine: number;
    notification: number;
  };
  longform: LongformVideo[];
  community: CommunityPost[];
  chatbotThreads: ChatbotThread[];
  chatbotMessages: ChatbotMessage[];
  conversations: Conversation[];
  chatLines: ChatLine[];
  notifications: AppNotification[];
};
