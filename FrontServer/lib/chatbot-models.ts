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
    blurb: "비회원도 가능. 이 방만 짧게 이어서 대화합니다.",
    memberOnly: false,
  },
  {
    id: "vide",
    name: "VidShare Vide",
    blurb: "회원 전용. 이 방을 요약해 더 길게 기억하고, 질문을 깊게 풀어 답합니다.",
    memberOnly: true,
  },
  {
    id: "shape",
    name: "VidShare Shape",
    blurb: "회원 전용. 저장된 대화를 찾아 최대한 많이 기억하고, 근거를 붙여 깊게 추론합니다.",
    memberOnly: true,
  },
];

export function productLabel(id: ChatbotProduct | string | undefined) {
  return CHATBOT_PRODUCTS.find((p) => p.id === id)?.name ?? "VidShare Locals";
}

export function isChatbotProduct(v: string): v is ChatbotProduct {
  return v === "locals" || v === "vide" || v === "shape";
}
