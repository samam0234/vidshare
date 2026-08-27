import type {
  Author,
  ChatUser,
  Comment,
  FaqItem,
  Message,
  Notification,
  ProfileVideo,
  Short,
} from "@/types";

export const currentUser: Author = {
  id: "u-me",
  handle: "usernumber02345",
  name: "Usernumber 02345",
  bio: "VidShare 크리에이터",
};

export const authors: Author[] = [
  {
    id: "u1",
    handle: "깃털유머",
    name: "깃털유머",
    bio: "웃긴 알바썰 전문",
  },
  {
    id: "u2",
    handle: "오피스유머",
    name: "오피스유머",
    bio: "직장인 공감 콘텐츠",
  },
  {
    id: "u3",
    handle: "일상드립",
    name: "일상드립",
    bio: "매일 드립 한 스푼",
  },
  currentUser,
];

export const shorts: Short[] = [
  {
    id: "s1",
    title: "쉬고 돈 적게 주는 알바의 실체 ㅋㅋㅋ",
    description: "알바생 시점으로 본 진짜 이야기",
    author: authors[0],
    likes: 100000,
    comments: 939,
    views: "1.2M",
    gradient: "linear-gradient(160deg, #7c3aed, #db2777, #f97316)",
    createdAt: "2026-03-01",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  },
  {
    id: "s2",
    title: "진짜 웃긴 직장썰 모음 😂",
    description: "회의실에서 생긴 일들",
    author: authors[1],
    likes: 70000,
    comments: 500,
    views: "4.2M",
    gradient: "linear-gradient(160deg, #0ea5e9, #6366f1, #a855f7)",
    createdAt: "2026-02-20",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  },
  {
    id: "s3",
    title: "출근 5분 전 알람의 공포",
    description: " thrice snooze의 결말",
    author: authors[2],
    likes: 30000,
    comments: 240,
    views: "1.8M",
    gradient: "linear-gradient(160deg, #059669, #14b8a6, #22d3ee)",
    createdAt: "2026-01-15",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  },
  {
    id: "s4",
    title: "카페 알바 첫날 생존기",
    description: "주문 외우기 챌린지",
    author: authors[0],
    likes: 52000,
    comments: 310,
    views: "3.4M",
    gradient: "linear-gradient(160deg, #ea580c, #e11d48, #7c3aed)",
    createdAt: "2025-12-10",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  },
  {
    id: "s5",
    title: "팀장님 피드백 번역기",
    description: "칭찬인 줄 알았는데…",
    author: authors[1],
    likes: 88000,
    comments: 670,
    views: "11.6M",
    gradient: "linear-gradient(160deg, #2563eb, #4f46e5, #c026d3)",
    createdAt: "2025-11-01",
    videoUrl:
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  },
];

export const initialComments: Comment[] = [
  {
    id: "c1",
    shortId: "s1",
    author: "웃긴사람",
    text: "이거 완전 제 알바 스토리예요 ㅋㅋ",
    time: "2시간 전",
  },
  {
    id: "c2",
    shortId: "s1",
    author: "퇴근요정",
    text: "공감 백만 개 눌러드립니다",
    time: "1시간 전",
  },
  {
    id: "c3",
    shortId: "s2",
    author: "회의실탈출",
    text: "3번째 썰에서 진짜 터짐 😂",
    time: "30분 전",
  },
];

export const notifications: Notification[] = [
  {
    id: "n1",
    category: "comment",
    message: "💬 새로운 댓글이 달렸습니다.",
    read: false,
    icon: "💬",
  },
  {
    id: "n2",
    category: "like",
    message: "👍 회원님 영상이 1,000 좋아요를 돌파했습니다!",
    read: false,
    icon: "👍",
  },
  {
    id: "n3",
    category: "follower",
    message: "🔔 새로운 팔로워가 생겼습니다.",
    read: true,
    icon: "🔔",
  },
  {
    id: "n4",
    category: "system",
    message: "📢 공지사항: 시스템 점검 예정 안내",
    read: true,
    icon: "📢",
  },
  {
    id: "n5",
    category: "system",
    message: "🎥 오늘의 추천 영상이 있습니다.",
    read: false,
    icon: "🎥",
  },
  {
    id: "n6",
    category: "mention",
    message: "💡 AI 추천: 취향 맞춤 영상이 있습니다.",
    read: false,
    icon: "💡",
  },
  {
    id: "n7",
    category: "mention",
    message: "📢 친구가 회원님을 멘션했습니다.",
    read: false,
    icon: "📢",
  },
];

export const chatUsers: ChatUser[] = [
  {
    id: "u1",
    name: "깃털유머",
    handle: "깃털유머",
    lastMessage: "안녕하세요! 메시지 기능 테스트 중입니다.",
    online: true,
  },
  {
    id: "u2",
    name: "오피스유머",
    handle: "오피스유머",
    lastMessage: "다음 콘텐츠 같이 할까요?",
    online: false,
  },
  {
    id: "u3",
    name: "일상드립",
    handle: "일상드립",
    lastMessage: "영상 잘 봤어요!",
    online: true,
  },
];

export const initialMessages: Record<string, Message[]> = {
  u1: [
    {
      id: "m1",
      userId: "u1",
      type: "other",
      content: "안녕하세요! 메시지 기능 테스트 중입니다.",
      time: "오후 3:21",
    },
    {
      id: "m2",
      userId: "u1",
      type: "me",
      content: "네 확인했습니다!",
      time: "오후 3:22",
    },
  ],
  u2: [
    {
      id: "m3",
      userId: "u2",
      type: "other",
      content: "다음 콘텐츠 같이 할까요?",
      time: "오전 11:05",
    },
  ],
  u3: [
    {
      id: "m4",
      userId: "u3",
      type: "other",
      content: "영상 잘 봤어요!",
      time: "어제",
    },
  ],
};

export const faqItems: FaqItem[] = [
  {
    id: "q1",
    question: "쇼츠가 안 넘어가요",
    answers: [
      "화면을 위·아래로 쓸어 넘기거나, 키보드 ▲▼ 로 이동해 보세요.",
      "다른 영상으로 한 칸만 넘긴 뒤 다시 돌아와 보세요.",
    ],
  },
  {
    id: "q2",
    question: "영상이 안 나와요",
    answers: [
      "다음 쇼츠로 넘긴 뒤 이전 영상으로 돌아와 보세요.",
      "브라우저에서 이 탭을 새로고침해 보세요.",
      "소리가 필요하면 기기 음소거와 볼륨을 확인해 보세요.",
    ],
  },
  {
    id: "q3",
    question: "검색이 안 돼요",
    answers: [
      "검색어를 짧게 바꿔 다시 입력해 보세요.",
      "홈(/)에서 검색하면 쇼츠 제목 기준으로 걸러집니다.",
    ],
  },
  {
    id: "q4",
    question: "업로드·글쓰기가 안 돼요",
    answers: [
      "제목(필수)을 채운 뒤 버튼을 다시 눌러 보세요.",
      "커뮤니티는 제목과 내용을 모두 넣어야 저장됩니다.",
    ],
  },
  {
    id: "q5",
    question: "메뉴가 안 보여요",
    answers: [
      "화면이 좁으면 왼쪽 가로 세 줄 버튼을 눌러 목록을 여세요.",
      "창을 넓히면 롱폼·커뮤니티·챗봇 메뉴가 바로 보입니다.",
    ],
  },
  {
    id: "q6",
    question: "화면이 너무 밝거나 어두워요",
    answers: [
      "헤더의 해/달 아이콘을 눌러 테마를 바꿔 보세요.",
    ],
  },
  {
    id: "q7",
    question: "메시지·알림이 안 보여요",
    answers: [
      "헤더 오른쪽 말풍선(메시지)·종(알림) 아이콘을 눌러 보세요.",
      "메시지는 ‘상대 추가’ 후 글을 보내야 목록에 뜹니다.",
    ],
  },
];

export function getAuthorById(id: string): Author | undefined {
  return authors.find((a) => a.id === id || a.handle === id);
}

export function getShortsByAuthor(authorId: string): Short[] {
  return shorts.filter((s) => s.author.id === authorId);
}

export function toProfileVideos(list: Short[]): ProfileVideo[] {
  return list.map((s) => ({
    id: `pv-${s.id}`,
    shortId: s.id,
    views: s.views,
    gradient: s.gradient,
    ...(s.thumb ? { thumb: s.thumb } : {}),
    title: s.title,
    likes: s.likes,
    createdAt: s.createdAt,
  }));
}

export const profileVideosAll: ProfileVideo[] = toProfileVideos(shorts);
