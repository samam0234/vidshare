import { HttpError } from "../middleware/errorHandler";
import { hasLlmKey, productLlmSpec } from "./llm";
import { runLocals } from "./locals";
import { runVide } from "./vide";
import { runShape } from "./shape";
import { isProduct, type CorpusDoc, type Product, type Turn } from "./types";

export type { CorpusDoc, Product, Turn };
export { hasLlmKey, isProduct };

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
}): Promise<{
  text: string;
  model: string;
  pipeline: string;
  retrieved?: number;
}> {
  const lastUser = [...input.turns].reverse().find((m) => m.role === "user");
  if (!lastUser) throw new HttpError(400, "질문을 입력해 주세요.");

  try {
    if (input.product === "locals") {
      return await runLocals(input.turns);
    }

    const owner = input.owner?.trim();
    if (!owner) throw new HttpError(401, "회원만 이 모델을 쓸 수 있습니다.");
    const threadKey = (input.threadKey ?? "default").slice(0, 64);

    if (input.product === "vide") {
      return await runVide({ owner, threadKey, turns: input.turns });
    }

    return await runShape({
      owner,
      threadKey,
      turns: input.turns,
      corpus: input.corpus ?? [],
    });
  } catch (err) {
    if (err instanceof HttpError) throw err;
    const msg = err instanceof Error ? err.message : "모델 호출 실패";
    throw new HttpError(502, msg);
  }
}
