/** VidShare Shape — LangGraph + RAG. 저장 대화 + 실제 플랫폼 데이터를 최대한 찾아 추론한다. */

import { entrypoint, task } from "@langchain/langgraph";
import { contentText, describeImages, makeChat, productLlmSpec, withSystem } from "./llm";
import {
  formatHits,
  ingestCorpus,
  retrieveMemories,
  type MemoryHit,
} from "./store";
import { formatPlatformHits, retrievePlatformInfo, buildPlatformSnapshot, formatPlatformSnapshot } from "./platform";
import type { CorpusDoc, ImageInput, PlatformDoc, Turn } from "./types";

export function shapeSystemPrompt(
  memories: string[],
  platform: string[],
  snapshotJson: string,
  images: string[]
) {
  const rag = memories.length
    ? `\n[저장된 대화에서 찾은 기억]\n${memories.map((m) => `- ${m}`).join("\n")}`
    : "\n[저장된 대화에서 찾은 기억]\n(이번 질문과 맞는 다른 방 기억은 아직 없습니다.)";
  const live = platform.length
    ? `\n[VidShare 실시간 데이터에서 찾은 정보]\n${platform.map((m) => `- ${m}`).join("\n")}`
    : "\n[VidShare 실시간 데이터에서 찾은 정보]\n(이번 질문과 맞는 쇼츠·댓글·FAQ를 찾지 못했습니다.)";
  const vision = images.length
    ? `\n[첨부 이미지 분석(비전 모델 설명)]\n${images.map((m) => `- ${m}`).join("\n")}`
    : "";
  return [
    "너는 VidShare Shape다. 실제 대화 모델이다. 한국어로 답한다.",
    "아래 기억과 데이터를 근거로 이 방 대화와 함께 깊게 추론한다. 근거가 된 항목을 짧게 밝힌다.",
    "근거가 없는 다른 방 내용이나 플랫폼 정보를 만들어 내지 않는다. 매 답마다 자기소개하지 않는다.",
    "마크다운 문법을 적극 쓴다: 강조는 **굵게**, 뉘앙스는 *기울임*, 취소된 내용은 ~~취소선~~, 나열은 '- ' 또는 '1. ' 목록.",
    "첨부 이미지는 네가 직접 보는 게 아니라 비전 모델이 먼저 분석한 설명을 아래에서 보고 답한다. 설명이 부족하면 사용자에게 자세히 다시 물어보라고 한다.",
    rag,
    `\n[VidShare 전체 현황(JSON)]\n${snapshotJson}`,
    live,
    vision,
  ]
    .filter(Boolean)
    .join("\n");
}

type ShapeIn = {
  owner: string;
  threadKey: string;
  turns: Turn[];
  corpus: CorpusDoc[];
  platformDocs: PlatformDoc[];
  images: ImageInput[];
};

const ingest = task("shape-ingest", async (input: ShapeIn) => {
  const fromTurns: CorpusDoc[] = input.turns.map((t) => ({
    threadKey: input.threadKey,
    role: t.role,
    content: t.content,
  }));
  ingestCorpus(input.owner, [...input.corpus, ...fromTurns]);
  return true;
});

const retrieve = task("shape-retrieve", async (input: ShapeIn) => {
  const last = [...input.turns].reverse().find((m) => m.role === "user");
  const query = last?.content ?? "";
  return retrieveMemories({
    owner: input.owner,
    query,
    excludeThread: input.threadKey,
    limit: 24,
  });
});

const retrievePlatform = task("shape-retrieve-platform", async (input: ShapeIn) => {
  const last = [...input.turns].reverse().find((m) => m.role === "user");
  const query = last?.content ?? "";
  return retrievePlatformInfo(query, 12, input.platformDocs);
});

const describeShapeImages = task("shape-describe-images", async (input: ShapeIn) => {
  return describeImages(input.images);
});

const generate = task(
  "shape-generate",
  async (
    input: ShapeIn & {
      hits: MemoryHit[];
      platformHits: ReturnType<typeof retrievePlatformInfo>;
      imageDescriptions: string[];
    }
  ) => {
    const spec = productLlmSpec("shape");
    const llm = makeChat("shape");
    const recent = input.turns.slice(-spec.maxHistory);
    const memories = formatHits(input.hits);
    const platform = formatPlatformHits(input.platformHits);
    const snapshotJson = formatPlatformSnapshot(buildPlatformSnapshot(input.platformDocs));
    const out = await llm.invoke(
      withSystem(
        shapeSystemPrompt(memories, platform, snapshotJson, input.imageDescriptions),
        recent
      )
    );
    const text = contentText(out.content);
    if (!text) throw new Error("Shape가 빈 답을 반환했습니다.");
    return text;
  }
);

const shapeGraph = entrypoint("shape", async (input: ShapeIn) => {
  await ingest(input);
  const [hits, platformHits, imageDescriptions] = await Promise.all([
    retrieve(input),
    retrievePlatform(input),
    describeShapeImages(input),
  ]);
  const text = await generate({ ...input, hits, platformHits, imageDescriptions });
  return { text, retrieved: hits.length + platformHits.length };
});

export async function runShape(input: ShapeIn) {
  const spec = productLlmSpec("shape");
  const result = (await shapeGraph.invoke(input)) as {
    text: string;
    retrieved: number;
  };
  return {
    text: result.text,
    model: spec.apiModel,
    pipeline: "langgraph-rag",
    retrieved: result.retrieved,
  };
}
