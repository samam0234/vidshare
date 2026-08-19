export type ChatbotProduct = "locals" | "vide" | "shape";

export const CHATBOT_PRODUCTS: Array<{
  id: ChatbotProduct;
  name: string;
  blurb: string;
  memberOnly: boolean;
}> = [
  {
    id: "locals",
    name: "VidShare Locals",
    blurb: "비회원도 가능. 이 채팅방은 Flash급으로 기억. 다른 방 검색은 안 하고, 답은 짧게 안내합니다.",
    memberOnly: false,
  },
  {
    id: "vide",
    name: "VidShare Vide",
    blurb: "회원 전용. Locals보다 이 대화를 더 정밀하게 기억하고, 일반 질문도 이어서 답합니다.",
    memberOnly: true,
  },
  {
    id: "shape",
    name: "VidShare Shape",
    blurb: "회원 전용. 저장된 챗봇 대화를 검색해 기억하고, 추론이 Locals·Vide보다 깊습니다.",
    memberOnly: true,
  },
];

export function productLabel(id: ChatbotProduct | string | undefined) {
  return CHATBOT_PRODUCTS.find((p) => p.id === id)?.name ?? "VidShare Locals";
}

export function isChatbotProduct(v: string): v is ChatbotProduct {
  return v === "locals" || v === "vide" || v === "shape";
}
