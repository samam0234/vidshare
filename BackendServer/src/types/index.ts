export type UserRole = "user" | "admin";

export type Author = {
  id: string;
  handle: string;
  name: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
};

/** 관리자 콘솔 전용 유저 표현. 공개 `Author` 에는 없는 운영 정보를 포함한다. */
export type AdminUser = Author & {
  suspended: boolean;
  createdAt: string;
};

export type ReportStatus = "open" | "resolved" | "dismissed";

export type AdminReport = {
  id: number;
  reporterId: string;
  reporterHandle: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
};

export type AdminStats = {
  userCount: number;
  suspendedCount: number;
  openReportCount: number;
  inquiryCount: number;
  unrepliedInquiryCount: number;
  shortCount: number;
  longformCount: number;
  communityCount: number;
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
  parentId?: string;
  authorId?: string;
};

export type NotificationCategory =
  | "comment"
  | "mention"
  | "like"
  | "system"
  | "follower";

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
  adminReply?: string;
  repliedAt?: string;
};

export type AppNotification = {
  id: number;
  category: NotificationCategory;
  message: string;
  read: boolean;
  href?: string;
  createdAt: string;
};
