/** VidShare Locals — 단순 LangChain 대화. 이 방만, RAG 없음. */

import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { contentText, makeChat, productLlmSpec, turnsToMessages } from "./llm";
import type { Turn } from "./types";

export function localsSystemPrompt() {
  return [
    "너는 VidShare Locals다. 실제 대화 모델이다. 한국어로 짧고 빠르게 답한다.",
    "이 채팅방의 이전 말만 보고 이어서 대화한다. 다른 방은 모른다.",
    "VidShare(쇼츠, 롱폼, 커뮤니티, 로그인, 업로드) 질문은 사실대로 돕는다.",
    "일반 질문도 짧게 받아친다. 매 답마다 자기소개하지 않는다.",
  ].join("\n");
}

export async function runLocals(turns: Turn[]) {
  const spec = productLlmSpec("locals");
  const llm = makeChat("locals");
  const window = turns.slice(-spec.maxHistory);
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", localsSystemPrompt()],
    new MessagesPlaceholder("history"),
  ]);
  const chain = prompt.pipe(llm);
  const out = await chain.invoke({ history: turnsToMessages(window) });
  const text = contentText(out.content);
  if (!text) throw new Error("Locals가 빈 답을 반환했습니다.");
  return { text, model: spec.apiModel, pipeline: "langchain" };
}
