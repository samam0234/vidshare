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

export type ProfileVideo = {
  id: string;
  shortId: string;
  views: string;
  gradient: string;
  thumb?: string;
  title: string;
  likes: number;
  createdAt: string;
};
