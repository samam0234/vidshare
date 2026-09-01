import { HttpError } from "../middleware/errorHandler";
import { hasLlmKey, productLlmSpec } from "./llm";
import { runLocals } from "./locals";
import { runVide } from "./vide";
import { runShape } from "./shape";
import { isProduct, type CorpusDoc, type ImageInput, type PlatformDoc, type Product, type Turn } from "./types";

export type { CorpusDoc, ImageInput, PlatformDoc, Product, Turn };
export { hasLlmKey, isProduct };

/**
 * Node/undici 가 네트워크 실패를 `cause` 로 감싸므로 사슬을 끝까지 훑으면서
 * 이름·코드·메시지를 모두 모은다. 공급자마다 중단을 알리는 방식이 달라서
 * (Groq 는 코드 없이 "Request was aborted." 메시지만 준다) 셋 다 봐야 한다.
 */
function errorSignals(err: unknown): string[] {
  const out: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur; i += 1) {
    if (!(cur instanceof Error)) break;
    out.push(cur.name, cur.message);
    const code = (cur as NodeJS.ErrnoException).code;
    if (code) out.push(code);
    cur = (cur as { cause?: unknown }).cause;
  }
  return out;
}

const TIMEOUT_MARKS = [
  "ETIMEDOUT",
  "AbortError",
  "TimeoutError",
  "APIUserAbortError",
  "aborted",
  "timed out",
  "timeout",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
];
const NETWORK_MARKS = [
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_SOCKET",
  "fetch failed",
];

function matches(signals: string[], marks: string[]) {
  return signals.some((s) => {
    const low = s.toLowerCase();
    return marks.some((m) => low.includes(m.toLowerCase()));
  });
}

/**
 * 모델 호출 실패를 사용자가 읽을 수 있는 메시지로 바꾼다.
 * 이전에는 원본 메시지를 그대로 502에 실어 보내, 업스트림이 멎으면 화면에
 * `ETIMEDOUT` 같은 날 에러 코드가 그대로 떴다.
 */
export function toHttpError(err: unknown): HttpError {
  const signals = errorSignals(err);
  if (matches(signals, TIMEOUT_MARKS)) {
    return new HttpError(
      504,
      "모델이 제한 시간 안에 답하지 못했습니다. 잠시 후 다시 시도해 주세요."
    );
  }
  if (matches(signals, NETWORK_MARKS)) {
    return new HttpError(
      502,
      "모델 서버에 연결하지 못했습니다. 네트워크를 확인해 주세요."
    );
  }
  const msg = err instanceof Error ? err.message : "모델 호출 실패";
  return new HttpError(502, msg);
}

export function productSpec(product: string) {
  if (!isProduct(product)) return undefined;
  const spec = productLlmSpec(product);
  return {
    memberOnly: product !== "locals",
    maxHistory: product === "locals" ? 20 : product === "vide" ? 80 : 40,
    apiModel: spec.apiModel,
  };
}

export async function completeChat(input: {
  product: Product;
  turns: Turn[];
  threadKey?: string;
  owner?: string;
  corpus?: CorpusDoc[];
  platformDocs?: PlatformDoc[];
  images?: ImageInput[];
}): Promise<{
  text: string;
  model: string;
  pipeline: string;
  retrieved?: number;
}> {
  const lastUser = [...input.turns].reverse().find((m) => m.role === "user");
  if (!lastUser) throw new HttpError(400, "질문을 입력해 주세요.");
  const platformDocs = input.platformDocs ?? [];
  const images = input.images ?? [];

  try {
    if (input.product === "locals") {
      return await runLocals(input.turns, platformDocs, images);
    }

    const owner = input.owner?.trim();
    if (!owner) throw new HttpError(401, "회원만 이 모델을 쓸 수 있습니다.");
    const threadKey = (input.threadKey ?? "default").slice(0, 64);

    if (input.product === "vide") {
      return await runVide({ owner, threadKey, turns: input.turns, platformDocs, images });
    }

    return await runShape({
      owner,
      threadKey,
      turns: input.turns,
      corpus: input.corpus ?? [],
      platformDocs,
      images,
    });
  } catch (err) {
    if (err instanceof HttpError) throw err;
    // 원인 추적용으로 서버 로그에는 원본을 남긴다.
    console.error(`[chatbot] ${input.product} 호출 실패:`, err);
    throw toHttpError(err);
  }
}
