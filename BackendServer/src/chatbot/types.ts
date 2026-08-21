export type Product = "locals" | "vide" | "shape";
export type Turn = { role: "user" | "assistant"; content: string };

export type CorpusDoc = {
  threadKey: string;
  title?: string;
  role: "user" | "assistant";
  content: string;
};

/** 프론트 localStorage 전용 커뮤니티·롱폼 글. 백엔드에 저장은 안 하고 매 요청 검색에만 쓴다. */
export type PlatformDoc = {
  kind: "longform" | "community";
  title: string;
  content: string;
};

/** 마지막 사용자 턴에 붙일 이미지. Gemini 계열만 실제로 본다. */
export type ImageInput = {
  mime: string;
  dataBase64: string;
};

export function isProduct(v: string): v is Product {
  return v === "locals" || v === "vide" || v === "shape";
}
