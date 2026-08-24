import { api } from "@/lib/api";
import type { ChatbotThread } from "@/types/content";

type CorpusDoc = {
  threadKey: string;
  title: string;
  role: "user" | "assistant";
  content: string;
};

type PlatformDoc = {
  kind: "longform" | "community";
  title: string;
  content: string;
};

/** Shape 모델의 대화 기억용: 서버에 저장된 다른 대화방 메시지를 모아온다. */
export async function collectChatCorpus(
  excludeThreadId: number,
  limit = 400
): Promise<CorpusDoc[]> {
  const threadsRes = await api.getChatbotThreads();
  if (!threadsRes.success || !threadsRes.data) return [];
  const others: ChatbotThread[] = threadsRes.data.filter(
    (t) => t.id !== excludeThreadId
  );
  const details = await Promise.all(
    others.map((t) => api.getChatbotThread(t.id))
  );
  const out: CorpusDoc[] = [];
  details.forEach((res, i) => {
    if (!res.success || !res.data) return;
    const title = others[i].title;
    for (const m of res.data.messages) {
      const content = m.content.trim();
      if (content.length < 2) continue;
      out.push({
        threadKey: String(others[i].id),
        title,
        role: m.role === "bot" ? "assistant" : "user",
        content,
      });
    }
  });
  return out.slice(-limit);
}

/** 커뮤니티·롱폼은 이제 서버 DB에 있어 매 요청 조회해서 챗봇에게 실어 보낸다. */
export async function collectPlatformCorpus(limit = 200): Promise<PlatformDoc[]> {
  const [longformRes, communityRes] = await Promise.all([
    api.getLongformList(),
    api.getCommunityList(),
  ]);
  const out: PlatformDoc[] = [];
  if (longformRes.success && longformRes.data) {
    for (const v of longformRes.data) {
      out.push({ kind: "longform", title: v.title, content: v.description });
    }
  }
  if (communityRes.success && communityRes.data) {
    for (const p of communityRes.data) {
      out.push({ kind: "community", title: p.title, content: p.body });
    }
  }
  return out.slice(0, limit);
}
