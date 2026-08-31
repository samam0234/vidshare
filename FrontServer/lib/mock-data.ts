import type { FaqItem, ProfileVideo, Short } from "@/types";

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

