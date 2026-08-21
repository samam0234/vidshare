/** VidShare Vide — LangGraph. 이 방 요약 + 최근 턴 + 실제 플랫폼 데이터로 깊게 답한다. */

import { entrypoint, task } from "@langchain/langgraph";
import { contentText, makeChat, productLlmSpec, supportsVision, withSystem } from "./llm";
import {
  ingestCorpus,
  loadSummary,
  saveSummary,
} from "./store";
import {
  buildPlatformSnapshot,
  formatPlatformHits,
  formatPlatformSnapshot,
  retrievePlatformInfo,
} from "./platform";
import type { ImageInput, PlatformDoc, Turn } from "./types";

export function videSystemPrompt(summary: string, platform: string[], snapshotJson: string) {
  const live = platform.length
    ? `\n[VidShare 실시간 데이터에서 찾은 정보]\n${platform.map((m) => `- ${m}`).join("\n")}`
    : "";
  return [
    "너는 VidShare Vide다. 실제 대화 모델이다. 한국어로 답한다.",
    "이 채팅방을 Locals보다 정밀하게 기억하고 이어서 깊게 돕는다.",
    "일반 질문·설명·초안도 실제로 풀어 답한다. 다른 방 검색은 하지 않는다.",
    "VidShare 관련 질문은 아래 데이터를 근거로 사실대로 답하고, 근거가 없으면 지어내지 않는다.",
    "매 답마다 자기소개하지 않는다.",
    "마크다운 문법을 적극 쓴다: 강조는 **굵게**, 뉘앙스는 *기울임*, 취소된 내용은 ~~취소선~~, 나열은 '- ' 또는 '1. ' 목록.",
    summary
      ? `\n[이 방의 이전 요약]\n${summary}`
      : "",
    `\n[VidShare 전체 현황(JSON)]\n${snapshotJson}`,
    live,
  ]
    .filter(Boolean)
    .join("\n");
}

type VideIn = {
  owner: string;
  threadKey: string;
  turns: Turn[];
  platformDocs: PlatformDoc[];
  images: ImageInput[];
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

const retrievePlatform = task("vide-retrieve-platform", async (input: VideIn) => {
  const last = [...input.turns].reverse().find((m) => m.role === "user");
  const query = last?.content ?? "";
  return retrievePlatformInfo(query, 8, input.platformDocs);
});

const answer = task(
  "vide-answer",
  async (input: VideIn & { summary: string; platformHits: ReturnType<typeof retrievePlatformInfo> }) => {
    const spec = productLlmSpec("vide");
    const llm = makeChat("vide");
    const recent = input.turns.slice(-spec.maxHistory);
    const platform = formatPlatformHits(input.platformHits);
    const snapshotJson = formatPlatformSnapshot(buildPlatformSnapshot(input.platformDocs));
    const out = await llm.invoke(
      withSystem(
        videSystemPrompt(input.summary, platform, snapshotJson),
        recent,
        supportsVision("vide") ? input.images : []
      )
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
  const [summary, platformHits] = await Promise.all([
    distill(input),
    retrievePlatform(input),
  ]);
  const text = await answer({ ...input, summary, platformHits });
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
