/** VidShare Shape — LangGraph + RAG. 저장 대화를 최대한 많이 찾아 추론한다. */

import { entrypoint, task } from "@langchain/langgraph";
import { contentText, makeChat, productLlmSpec, withSystem } from "./llm";
import {
  formatHits,
  ingestCorpus,
  retrieveMemories,
  type MemoryHit,
} from "./store";
import type { CorpusDoc, Turn } from "./types";

export function shapeSystemPrompt(memories: string[]) {
  const rag = memories.length
    ? `\n[저장된 대화에서 찾은 기억]\n${memories.map((m) => `- ${m}`).join("\n")}`
    : "\n[저장된 대화에서 찾은 기억]\n(이번 질문과 맞는 다른 방 기억은 아직 없습니다.)";
  return [
    "너는 VidShare Shape다. 실제 대화 모델이다. 한국어로 답한다.",
    "아래 기억을 근거로 이 방 대화와 함께 깊게 추론한다. 근거가 된 기억을 짧게 밝힌다.",
    "기억이 없는 다른 방 내용을 만들어 내지 않는다. 매 답마다 자기소개하지 않는다.",
    rag,
  ].join("\n");
}

type ShapeIn = {
  owner: string;
  threadKey: string;
  turns: Turn[];
  corpus: CorpusDoc[];
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

const generate = task(
  "shape-generate",
  async (input: ShapeIn & { hits: MemoryHit[] }) => {
    const spec = productLlmSpec("shape");
    const llm = makeChat("shape");
    const recent = input.turns.slice(-spec.maxHistory);
    const memories = formatHits(input.hits);
    const out = await llm.invoke(
      withSystem(shapeSystemPrompt(memories), recent)
    );
    const text = contentText(out.content);
    if (!text) throw new Error("Shape가 빈 답을 반환했습니다.");
    return text;
  }
);

const shapeGraph = entrypoint("shape", async (input: ShapeIn) => {
  await ingest(input);
  const hits = await retrieve(input);
  const text = await generate({ ...input, hits });
  return { text, retrieved: hits.length };
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
