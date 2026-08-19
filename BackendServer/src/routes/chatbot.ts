import { Router } from "express";
import { HttpError } from "../middleware/errorHandler";
import { getRequestPublicUser } from "../auth/requestUser";

const router = Router();

type Product = "locals" | "vide" | "shape";
type ChatTurn = { role: "user" | "assistant"; content: string };

const PRODUCTS: Record<
  Product,
  { memberOnly: boolean; apiModel: string; temperature: number; maxHistory: number }
> = {
  locals: {
    memberOnly: false,
    apiModel: process.env.CHAT_MODEL_LOCALS?.trim() || "locals",
    temperature: 0.4,
    maxHistory: 4,
  },
  vide: {
    memberOnly: true,
    apiModel: process.env.CHAT_MODEL_VIDE?.trim() || "grok-4.3",
    temperature: 0.5,
    maxHistory: 24,
  },
  shape: {
    memberOnly: true,
    apiModel: process.env.CHAT_MODEL_SHAPE?.trim() || "grok-4.6",
    temperature: 0.3,
    maxHistory: 16,
  },
};

function systemPrompt(product: Product) {
  const base =
    "너는 VidShare 도우미다. 한국어로 짧고 정확하게 답한다. 쇼츠·롱폼·커뮤니티·메시지·업로드 이용 방법을 안내한다.";
  if (product === "locals") {
    return `${base} 너는 VidShare Locals 다. 빠르고 간단한 무료 모델이다. 긴 맥락은 기억하지 말고 지금 질문 중심으로 답한다.`;
  }
  if (product === "vide") {
    return `${base} 너는 VidShare Vide 다. 이 대화에 나온 내용을 Locals보다 잘 기억하고 이어서 답한다.`;
  }
  return `${base} 너는 VidShare Shape 다. 아래에 있는 [저장된 대화에서 찾은 기억]을 우선 참고하고, 추론을 더 깊게 한다. 기억에 없으면 모른다고 한다.`;
}

function localLocalsReply(text: string) {
  const t = text.toLowerCase();
  if (t.includes("안녕") || t.includes("hello")) {
    return "안녕하세요. VidShare Locals입니다. 쇼츠·롱폼·커뮤니티 보는 법을 바로 안내할게요.";
  }
  if (t.includes("롱폼")) {
    return "롱폼은 상단 ‘롱폼 영상’에서 목록을 보고, 글을 누르면 재생됩니다. 등록은 로그인 후 가능합니다.";
  }
  if (t.includes("커뮤니티")) {
    return "커뮤니티는 글을 눌러 내용만 볼 수 있습니다. 글쓰기는 회원만 됩니다.";
  }
  if (t.includes("쇼츠") || t.includes("shorts")) {
    return "홈의 쇼츠에서 위아래로 넘기며 보면 됩니다. 좋아요·댓글 작성은 로그인 후 가능합니다.";
  }
  if (t.includes("가입") || t.includes("로그인") || t.includes("회원")) {
    return "우측 상단에서 회원가입 또는 로그인하면 Vide·Shape 모델과 업로드·메시지를 쓸 수 있습니다.";
  }
  return `VidShare Locals입니다. “${text.slice(0, 80)}” 기준으로 짧게 안내했어요. 더 구체적인 화면 이름을 말해 주시면 이어서 답할게요.`;
}

async function callXai(
  model: string,
  messages: Array<{ role: string; content: string }>
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
      temperature: 0.4,
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
    throw new HttpError(res.status >= 400 && res.status < 600 ? res.status : 502, msg);
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
        const text = await callXai(spec.apiModel, messages);
        res.json({ success: true, data: { text, product, model: spec.apiModel } });
        return;
      } catch {
        res.json({
          success: true,
          data: {
            text: localLocalsReply(lastUser.content),
            product,
            model: "locals",
          },
        });
        return;
      }
    }

    const text = await callXai(spec.apiModel, messages);
    res.json({ success: true, data: { text, product, model: spec.apiModel } });
  })().catch(next);
});

export default router;
