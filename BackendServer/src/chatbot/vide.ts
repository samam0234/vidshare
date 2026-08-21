/** VidShare Vide — LangGraph. 이 방 요약 + 최근 턴으로 깊게 답한다. */

import { entrypoint, task } from "@langchain/langgraph";
import { contentText, makeChat, productLlmSpec, withSystem } from "./llm";
import {
  ingestCorpus,
  loadSummary,
  saveSummary,
} from "./store";
import type { Turn } from "./types";

export function videSystemPrompt(summary: string) {
  return [
    "너는 VidShare Vide다. 실제 대화 모델이다. 한국어로 답한다.",
    "이 채팅방을 Locals보다 정밀하게 기억하고 이어서 깊게 돕는다.",
    "일반 질문·설명·초안도 실제로 풀어 답한다. 다른 방 검색은 하지 않는다.",
    "매 답마다 자기소개하지 않는다.",
    summary
      ? `\n[이 방의 이전 요약]\n${summary}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

type VideIn = {
  owner: string;
  threadKey: string;
  turns: Turn[];
};

const distill = task("vide-distill", async (input: VideIn) => {
  const spec = productLlmSpec("vide");
  const older = input.turns.slice(0, -12);
  if (older.length < 8) {
    return loadSummary(input.owner, input.threadKey);
  }
  const llm = makeChat("vide");
  const blob = older
    .map((m) => `${m.role === "user" ? "사용자" : "봇"}: ${m.content}`)
    .join("\n")
    .slice(0, 6000);
  const prev = loadSummary(input.owner, input.threadKey);
  const out = await llm.invoke(
    withSystem(
      "이 대화의 사실을 한국어로 짧게 요약하라. 이름, 결정, 미해결 질문만. 다른 설명은 하지 마라.",
      [
        {
          role: "user",
          content: `${prev ? `이전 요약:\n${prev}\n\n` : ""}새 대화:\n${blob}`,
        },
      ]
    )
  );
  const summary = contentText(out.content);
  if (summary) saveSummary(input.owner, input.threadKey, summary);
  return summary || prev;
});

const answer = task(
  "vide-answer",
  async (input: VideIn & { summary: string }) => {
    const spec = productLlmSpec("vide");
    const llm = makeChat("vide");
    const recent = input.turns.slice(-spec.maxHistory);
    const out = await llm.invoke(
      withSystem(videSystemPrompt(input.summary), recent)
    );
    const text = contentText(out.content);
    if (!text) throw new Error("Vide가 빈 답을 반환했습니다.");
    return text;
  }
);

const videGraph = entrypoint("vide", async (input: VideIn) => {
  ingestCorpus(
    input.owner,
    input.turns.map((t) => ({
      threadKey: input.threadKey,
      role: t.role,
      content: t.content,
    }))
  );
  const summary = await distill(input);
  const text = await answer({ ...input, summary });
  return { text, summary };
});

export async function runVide(input: VideIn) {
  const spec = productLlmSpec("vide");
  const result = (await videGraph.invoke(input)) as {
    text: string;
    summary: string;
  };
  return { text: result.text, model: spec.apiModel, pipeline: "langgraph" };
}
