import { Router } from "express";
import { HttpError } from "../middleware/errorHandler";
import { getRequestPublicUser } from "../auth/requestUser";
import { localsSystemPrompt, runLocals } from "../chatbot/locals";

const router = Router();

type Product = "locals" | "vide" | "shape";
type ChatTurn = { role: "user" | "assistant"; content: string };

const PRODUCTS: Record<
  Product,
  { memberOnly: boolean; apiModel: string; temperature: number; maxHistory: number }
> = {
  locals: {
    memberOnly: false,
    apiModel: process.env.CHAT_MODEL_LOCALS?.trim() || "grok-4.3",
    temperature: 0.4,
    maxHistory: 48,
  },
  vide: {
    memberOnly: true,
    apiModel: process.env.CHAT_MODEL_VIDE?.trim() || "grok-4.5",
    temperature: 0.5,
    maxHistory: 80,
  },
  shape: {
    memberOnly: true,
    apiModel: process.env.CHAT_MODEL_SHAPE?.trim() || "grok-4.6",
    temperature: 0.3,
    maxHistory: 40,
  },
};

function systemPrompt(product: Product) {
  if (product === "locals") return localsSystemPrompt();
  if (product === "vide") {
    return "너는 VidShare Vide 다. 한국어로 답한다. Locals보다 이 대화를 더 정밀하게 기억하고, 일반 질문도 이어서 깊게 돕는다. 저장된 다른 채팅방은 검색하지 않는다.";
  }
  return "너는 VidShare Shape 다. 한국어로 답한다. 아래에 있는 [저장된 대화에서 찾은 기억]을 우선 참고하고, 근거를 짧게 밝히며 Locals·Vide보다 깊게 추론한다. 기억에 없으면 추측하지 말고 모른다고 한다.";
}

async function callXai(
  model: string,
  messages: Array<{ role: string; content: string }>,
  opts: { temperature: number; maxTokens: number }
): Promise<string> {
  const key = process.env.XAI_API_KEY?.trim();
  if (!key) {
    throw new HttpError(503, "XAI_API_KEY가 없어 이 모델을 호출할 수 없습니다.");
  }
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string } | string;
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!res.ok) {
    const msg =
      typeof body.error === "string"
        ? body.error
        : body.error?.message ?? `모델 호출 실패 (${res.status})`;
    throw new HttpError(
      res.status >= 400 && res.status < 600 ? res.status : 502,
      msg
    );
  }
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new HttpError(502, "모델이 빈 답을 반환했습니다.");
  return text;
}

/** POST /api/chatbot/complete */
router.post("/complete", (req, res, next) => {
  void (async () => {
    const product = String(req.body?.product ?? "locals") as Product;
    if (!PRODUCTS[product]) {
      throw new HttpError(400, "알 수 없는 모델입니다.");
    }

    const spec = PRODUCTS[product];
    if (spec.memberOnly && !getRequestPublicUser(req)) {
      throw new HttpError(401, "회원만 이 모델을 쓸 수 있습니다.");
    }

    const rawTurns = Array.isArray(req.body?.messages)
      ? (req.body.messages as ChatTurn[])
      : [];
    const turns = rawTurns
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim()
      )
      .slice(-spec.maxHistory);

    const lastUser = [...turns].reverse().find((m) => m.role === "user");
    if (!lastUser) throw new HttpError(400, "질문을 입력해 주세요.");

    const memories = Array.isArray(req.body?.memories)
      ? (req.body.memories as unknown[])
          .filter((x) => typeof x === "string" && x.trim())
          .map((x) => String(x).trim())
          .slice(0, 8)
      : [];

    let system = systemPrompt(product);
    if (product === "shape" && memories.length) {
      system += `\n\n[저장된 대화에서 찾은 기억]\n${memories.map((m) => `- ${m}`).join("\n")}`;
    }

    const messages = [
      { role: "system", content: system },
      ...turns.map((m) => ({ role: m.role, content: m.content.trim() })),
    ];

    if (product === "locals") {
      try {
        const text = await callXai(spec.apiModel, messages, {
          temperature: spec.temperature,
          maxTokens: 500,
        });
        res.json({
          success: true,
          data: { text, product, model: spec.apiModel },
        });
        return;
      } catch {
        const text = runLocals(lastUser.content, turns);
        res.json({ success: true, data: { text, product, model: "locals" } });
        return;
      }
    }

    const text = await callXai(spec.apiModel, messages, {
      temperature: spec.temperature,
      maxTokens: product === "shape" ? 900 : 700,
    });
    res.json({ success: true, data: { text, product, model: spec.apiModel } });
  })().catch(next);
});

export default router;
