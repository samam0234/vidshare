import { Router } from "express";
import { HttpError } from "../middleware/errorHandler";
import { getRequestPublicUser } from "../auth/requestUser";
import {
  completeChat,
  hasLlmKey,
  productSpec,
  type CorpusDoc,
  type Product,
  type Turn,
} from "../chatbot/complete";

const router = Router();

router.get("/status", (_req, res) => {
  res.json({ success: true, data: { llm: hasLlmKey() } });
});

/** POST /api/chatbot/complete */
router.post("/complete", (req, res, next) => {
  void (async () => {
    const product = String(req.body?.product ?? "locals") as Product;
    const spec = productSpec(product);
    if (!spec) throw new HttpError(400, "알 수 없는 모델입니다.");

    const user = getRequestPublicUser(req);
    if (spec.memberOnly && !user) {
      throw new HttpError(401, "회원만 이 모델을 쓸 수 있습니다.");
    }

    const rawTurns = Array.isArray(req.body?.messages)
      ? (req.body.messages as Turn[])
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

    if (!turns.some((m) => m.role === "user")) {
      throw new HttpError(400, "질문을 입력해 주세요.");
    }

    const rawCorpus = Array.isArray(req.body?.corpus)
      ? (req.body.corpus as CorpusDoc[])
      : [];
    const corpus = rawCorpus
      .filter(
        (d) =>
          d &&
          typeof d.threadKey === "string" &&
          (d.role === "user" || d.role === "assistant") &&
          typeof d.content === "string" &&
          d.content.trim()
      )
      .slice(0, 500)
      .map((d) => ({
        threadKey: d.threadKey.slice(0, 64),
        title: typeof d.title === "string" ? d.title.slice(0, 80) : "",
        role: d.role,
        content: d.content.trim().slice(0, 4000),
      }));

    const threadKey = String(req.body?.threadKey ?? "").slice(0, 64);

    const data = await completeChat({
      product,
      turns,
      threadKey: threadKey || undefined,
      owner: user?.id,
      corpus,
    });
    res.json({ success: true, data: { ...data, product } });
  })().catch(next);
});

export default router;
