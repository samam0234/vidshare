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
  model?: "locals" | "vide" | "shape";
  guest?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotAttachment = {
  name: string;
  mime: string;
  size: number;
  dataUrl?: string;
  text?: string;
};

export type ChatbotMessage = {
  id: number;
  threadId: number;
  role: "user" | "bot";
  content: string;
  attachments?: ChatbotAttachment[];
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

export type SupportInquiry = {
  id: number;
  subject: string;
  body: string;
  authorName: string;
  createdAt: string;
  /** 관리자 콘솔에서 답변이 등록되면 채워진다. */
  adminReply?: string;
  repliedAt?: string;
};
