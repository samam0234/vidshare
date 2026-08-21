export type Product = "locals" | "vide" | "shape";
export type Turn = { role: "user" | "assistant"; content: string };

export type CorpusDoc = {
  threadKey: string;
  title?: string;
  role: "user" | "assistant";
  content: string;
};

export function isProduct(v: string): v is Product {
  return v === "locals" || v === "vide" || v === "shape";
}
