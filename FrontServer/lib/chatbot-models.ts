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
    blurb: "비회원도 쓸 수 있는 빠르고 간편한 무료 모델.",
    memberOnly: false,
  },
  {
    id: "vide",
    name: "VidShare Vide",
    blurb: "회원 전용. Locals보다 이 대화의 기억력이 더 뛰어납니다.",
    memberOnly: true,
  },
  {
    id: "shape",
    name: "VidShare Shape",
    blurb: "회원 전용. 저장된 챗봇 대화를 검색해 기억하고, 추론도 더 좋습니다.",
    memberOnly: true,
  },
];

export function productLabel(id: ChatbotProduct | string | undefined) {
  return CHATBOT_PRODUCTS.find((p) => p.id === id)?.name ?? "VidShare Locals";
}

export function isChatbotProduct(v: string): v is ChatbotProduct {
  return v === "locals" || v === "vide" || v === "shape";
}
