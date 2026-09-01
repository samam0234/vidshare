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

/**
 * 한 번의 모델 호출을 기다려 줄 상한.
 *
 * 이게 없으면 업스트림(특히 thinking 모델인 Gemini 3.x)이 응답 없이 멎었을 때
 * 우리 쪽에서 끊지 않아, OS의 TCP 타임아웃이 날 때까지 몇 분을 매달린 뒤
 * `ETIMEDOUT` 이 그대로 사용자에게 노출된다. 직접 끊어서 재시도로 넘긴다.
 */
export const CHAT_TIMEOUT_MS =
  Number(process.env.CHAT_TIMEOUT_MS) || 45_000;

/**
 * 모든 `invoke()` 에 함께 넘길 호출 옵션.
 *
 * `timeout` 만으로는 부족하다 — LangChain 의 Google(google-genai) 클라이언트는
 * 이 값을 실제 요청에 전달하지 않아서 그대로 두면 무한정 기다린다(확인함:
 * 300ms 로 두고도 98초짜리 응답이 그대로 성공했다). 공급자와 무관하게 먹히는
 * `AbortSignal` 을 같이 넘겨야 실제로 끊긴다.
 *
 * 신호는 만드는 순간부터 시간을 세므로 호출할 때마다 새로 만든다.
 */
export function chatCallOptions() {
  return {
    timeout: CHAT_TIMEOUT_MS,
    signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
  };
}

/** 이름이 "TimeoutError" 라야 complete.ts 의 에러 변환이 504 로 잡아낸다. */
class ChatTimeoutError extends Error {
  constructor(ms: number) {
    super(`모델이 ${Math.round(ms / 1000)}초 안에 답하지 않았습니다.`);
    this.name = "TimeoutError";
  }
}

/**
 * 공급자가 위 옵션을 무시해도 대기시간을 묶어 주는 최후 방어선.
 *
 * `@langchain/google-genai` 는 `timeout` 도 `signal` 도 실제 요청에 전달하지
 * 않는다(확인함: 300ms 로 두고도 45~98초짜리 응답이 그대로 성공). 이 race 가
 * 없으면 Gemini 가 멎었을 때 OS TCP 타임아웃까지 매달리다 `ETIMEDOUT` 이 난다.
 *
 * race 는 이미 나간 HTTP 요청 자체를 취소하지는 못한다(그 소켓은 응답이 오면
 * 알아서 정리된다). 다만 **사용자가 기다리는 시간**은 확실히 끊는다.
 */
export async function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new ChatTimeoutError(CHAT_TIMEOUT_MS)),
          CHAT_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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
      // 타임아웃(위 CHAT_TIMEOUT_MS)과 곱해지므로 최악 대기시간을 묶어 둔다.
      // 관측상 멎는 건 요청 단위라, 새로 건 시도는 대체로 몇 초 안에 돌아온다.
      maxRetries: 1,
    });
  }
  return new ChatGroq({
    apiKey,
    model: spec.apiModel,
    temperature: spec.temperature,
    maxTokens: spec.maxTokens,
    maxRetries: 1,
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
        const out = await withTimeout(
          vision.invoke(
            [
              new SystemMessage(
                "이미지를 한국어로 자세히, 사실만 설명하라. 보이는 글자가 있으면 그대로 옮겨 적어라. 다른 말은 하지 마라."
              ),
              new HumanMessage({
                content: [
                  { type: "image", mimeType: img.mime, data: img.dataBase64 },
                ],
              }),
            ],
            chatCallOptions()
          )
        );
        return `이미지 ${i + 1}: ${contentText(out.content) || "(설명 없음)"}`;
      } catch {
        return `이미지 ${i + 1}: (비전 분석 실패)`;
      }
    })
  );
}
