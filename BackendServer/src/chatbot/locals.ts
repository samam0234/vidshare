/** VidShare Locals — 단순 LangChain 대화. 이 방만 기억하고, 실제 플랫폼 데이터로 가볍게 근거를 댄다. */

import { contentText, makeChat, productLlmSpec, supportsVision, withSystem } from "./llm";
import {
  buildPlatformSnapshot,
  formatPlatformHits,
  formatPlatformSnapshot,
  retrievePlatformInfo,
} from "./platform";
import type { ImageInput, PlatformDoc, Turn } from "./types";

export function localsSystemPrompt(platform: string[], snapshotJson: string) {
  const live = platform.length
    ? `\n[VidShare 실시간 데이터에서 찾은 정보]\n${platform.map((m) => `- ${m}`).join("\n")}`
    : "";
  return [
    "너는 VidShare Locals다. 실제 대화 모델이다. 한국어로 짧고 빠르게 답한다.",
    "이 채팅방의 이전 말만 보고 이어서 대화한다. 다른 방은 모른다.",
    "VidShare(쇼츠, 롱폼, 커뮤니티, 로그인, 업로드) 질문은 아래 데이터를 근거로 사실대로 돕고, 근거가 없으면 지어내지 않는다.",
    "일반 질문도 짧게 받아친다. 매 답마다 자기소개하지 않는다.",
    "마크다운 문법을 적극 쓴다: 강조는 **굵게**, 뉘앙스는 *기울임*, 취소된 내용은 ~~취소선~~, 나열은 '- ' 또는 '1. ' 목록.",
    `\n[VidShare 전체 현황(JSON)]\n${snapshotJson}`,
    live,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function runLocals(
  turns: Turn[],
  platformDocs: PlatformDoc[] = [],
  images: ImageInput[] = []
) {
  const spec = productLlmSpec("locals");
  const llm = makeChat("locals");
  const window = turns.slice(-spec.maxHistory);
  const last = [...turns].reverse().find((m) => m.role === "user");
  const platformHits = retrievePlatformInfo(last?.content ?? "", 6, platformDocs);
  const snapshotJson = formatPlatformSnapshot(buildPlatformSnapshot(platformDocs));
  const system = localsSystemPrompt(formatPlatformHits(platformHits), snapshotJson);
  const out = await llm.invoke(
    withSystem(system, window, supportsVision("locals") ? images : [])
  );
  const text = contentText(out.content);
  if (!text) throw new Error("Locals가 빈 답을 반환했습니다.");
  return { text, model: spec.apiModel, pipeline: "langchain" };
}
