import type {
  Author,
  ChatUser,
  Comment,
  FaqItem,
  Message,
  Notification,
  Short,
} from "../types";

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

/** In-memory store (데모용 — 서버 재시작 시 초기화) */
export const store = {
  shorts: [
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
  ] as Short[],

  comments: [
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
  ] as Comment[],

  notifications: [
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
  ] as Notification[],

  chatUsers: [
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
  ] as ChatUser[],

  messages: {
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
  } as Record<string, Message[]>,

  faqs: [
    {
      id: "q1",
      question: "영상이 재생되지 않을 때",
      answers: [
        "네트워크 연결 상태를 확인해 주세요.",
        "앱을 새로고침 하거나 다시 실행해 보세요.",
        "캐시가 쌓여 있다면 캐시 삭제 후 다시 시도해 주세요.",
        "문제가 지속되면 잠시 후 다시 이용해 주세요.",
      ],
    },
    {
      id: "q2",
      question: "프로필 링크가 열리지 않을 때",
      answers: [
        "입력한 링크가 올바른지 확인해 주세요.",
        "네트워크 불안정 시 링크가 정상적으로 열리지 않을 수 있어요.",
        "앱 또는 브라우저를 재실행해 주세요.",
        "계속 문제가 발생하면 링크를 다시 등록해 보세요.",
      ],
    },
    {
      id: "q3",
      question: "프로필 사진이 변경되지 않을 때",
      answers: [
        "업로드한 이미지의 용량 또는 형식을 확인해 주세요.",
        "캐시 때문에 이전 이미지가 보일 수 있습니다. 새로고침 또는 재접속해 주세요.",
        "네트워크가 불안정할 경우 업데이트가 지연될 수 있습니다.",
        "잠시 기다리면 변경사항이 자동 반영될 수 있어요.",
      ],
    },
    {
      id: "q4",
      question: "영상 재생이 느릴 때",
      answers: [
        "현재 네트워크 속도를 확인해 주세요.",
        "WIFI와 모바일 데이터를 전환 후 다시 재생해 보세요.",
        "앱의 캐시를 정리하면 로딩 속도가 개선될 수 있어요.",
        "백그라운드에서 실행 중인 앱을 종료 후 다시 시도해 주세요.",
      ],
    },
  ] as FaqItem[],
};
