export type Author = {
  id: string;
  handle: string;
  name: string;
  avatar?: string;
  bio?: string;
};

export type Short = {
  id: string;
  title: string;
  description?: string;
  author: Author;
  likes: number;
  comments: number;
  views: string;
  videoUrl?: string;
  thumb?: string;
  gradient: string;
  createdAt: string;
};

export type Comment = {
  id: string;
  shortId: string;
  author: string;
  text: string;
  time: string;
};

export type NotificationCategory =
  | "comment"
  | "mention"
  | "like"
  | "system"
  | "follower";

export type Notification = {
  id: string;
  category: NotificationCategory;
  message: string;
  read: boolean;
  icon: string;
};

export type ChatUser = {
  id: string;
  name: string;
  handle: string;
  avatar?: string;
  lastMessage: string;
  online?: boolean;
};

export type Message = {
  id: string;
  userId: string;
  type: "me" | "other";
  content: string;
  isImage?: boolean;
  time: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answers: string[];
};

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

export type ChatbotThreadModel = "locals" | "vide" | "shape";

export type ChatbotAttachment = {
  name: string;
  mime: string;
  size: number;
  dataUrl?: string;
  text?: string;
};

export type ChatbotThread = {
  id: number;
  title: string;
  model: ChatbotThreadModel;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotThreadMessage = {
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

export type SupportInquiry = {
  id: number;
  subject: string;
  body: string;
  authorName: string;
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
