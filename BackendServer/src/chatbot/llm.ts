import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { HttpError } from "../middleware/errorHandler";
import type { ImageInput, Product, Turn } from "./types";

type Provider = "google" | "groq";

function resolveApiKey(provider: Provider) {
  return provider === "google"
    ? process.env.GOOGLE_API_KEY?.trim()
    : process.env.GROQ_API_KEY?.trim();
}

function envNameFor(provider: Provider) {
  return provider === "google" ? "GOOGLE_API_KEY" : "GROQ_API_KEY";
}

export function hasLlmKey() {
  return Object.values(MODELS).every((spec) => Boolean(resolveApiKey(spec.provider)));
}

export function ensureApiKey(product: Product) {
  const spec = MODELS[product];
  const key = resolveApiKey(spec.provider);
  if (!key) {
    throw new HttpError(
      503,
      `챗봇 LLM 키가 없습니다. BackendServer/.env 에 ${envNameFor(spec.provider)} 를 넣으세요.`
    );
  }
  return key;
}

const MODELS: Record<
  Product,
  {
    provider: Provider;
    apiModel: string;
    temperature: number;
    maxTokens: number;
    maxHistory: number;
  }
> = {
  locals: {
    provider: "google",
    apiModel: process.env.CHAT_MODEL_LOCALS?.trim() || "gemini-3.1-flash-lite",
    temperature: 0.5,
    maxTokens: 700,
    maxHistory: 16,
  },
  vide: {
    provider: "google",
    apiModel: process.env.CHAT_MODEL_VIDE?.trim() || "gemini-3.6-flash",
    temperature: 0.55,
    maxTokens: 1400,
    maxHistory: 40,
  },
  shape: {
    provider: "groq",
    apiModel: process.env.CHAT_MODEL_SHAPE?.trim() || "openai/gpt-oss-120b",
    temperature: 0.35,
    maxTokens: 1800,
    maxHistory: 28,
  },
};

export function productLlmSpec(product: Product) {
  return MODELS[product];
}

export function makeChat(product: Product) {
  const spec = MODELS[product];
  const apiKey = ensureApiKey(product);
  if (spec.provider === "google") {
    return new ChatGoogleGenerativeAI({
      apiKey,
      model: spec.apiModel,
      temperature: spec.temperature,
      maxOutputTokens: spec.maxTokens,
      maxRetries: 2,
    });
  }
  return new ChatGroq({
    apiKey,
    model: spec.apiModel,
    temperature: spec.temperature,
    maxTokens: spec.maxTokens,
    maxRetries: 2,
  });
}

export function turnsToMessages(turns: Turn[]): BaseMessage[] {
  return turns
    .filter((m) => m.content.trim())
    .map((m) =>
      m.role === "assistant"
        ? new AIMessage(m.content.trim())
        : new HumanMessage(m.content.trim())
    );
}

/** Gemini만 이미지를 실제로 본다. Groq(gpt-oss)는 텍스트 전용이라 이미지를 붙이면 실패한다. */
export function supportsVision(product: Product) {
  return MODELS[product].provider === "google";
}

/** 마지막 사용자 메시지를 [텍스트 + 이미지] 멀티모달 파트로 바꿔 끼운다. */
function attachImages(messages: BaseMessage[], images: ImageInput[]): BaseMessage[] {
  if (!images.length) return messages;
  const lastUserIdx = messages.map((m) => m.getType()).lastIndexOf("human");
  if (lastUserIdx < 0) return messages;

  const original = messages[lastUserIdx];
  const text = typeof original.content === "string" ? original.content : "";
  const next = [...messages];
  next[lastUserIdx] = new HumanMessage({
    content: [
      { type: "text", text },
      ...images.map((img) => ({
        type: "image" as const,
        mimeType: img.mime,
        data: img.dataBase64,
      })),
    ],
  });
  return next;
}

export function withSystem(
  system: string,
  turns: Turn[],
  images: ImageInput[] = []
): BaseMessage[] {
  return [new SystemMessage(system), ...attachImages(turnsToMessages(turns), images)];
}

export function contentText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: string }).text ?? "");
        }
        return "";
      })
      .join("")
      .trim();
  }
  return String(content ?? "").trim();
}

/**
 * Shape(Groq)는 이미지를 직접 못 본다. 대신 Gemini로 먼저 이미지를 설명·OCR한 뒤
 * 그 결과를 Shape의 텍스트 컨텍스트에 끼워 넣어 "비전 우회 RAG"를 만든다.
 */
export async function describeImages(images: ImageInput[]): Promise<string[]> {
  if (!images.length) return [];
  const vision = makeChat("locals");
  return Promise.all(
    images.map(async (img, i) => {
      try {
        const out = await vision.invoke([
          new SystemMessage(
            "이미지를 한국어로 자세히, 사실만 설명하라. 보이는 글자가 있으면 그대로 옮겨 적어라. 다른 말은 하지 마라."
          ),
          new HumanMessage({
            content: [{ type: "image", mimeType: img.mime, data: img.dataBase64 }],
          }),
        ]);
        return `이미지 ${i + 1}: ${contentText(out.content) || "(설명 없음)"}`;
      } catch {
        return `이미지 ${i + 1}: (비전 분석 실패)`;
      }
    })
  );
}
