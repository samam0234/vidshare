/** VidShare Locals — 이 방 대화는 Flash급으로 기억. 다른 방 검색·깊은 추론은 하지 않는다. */

type Card = {
  id: string;
  title: string;
  tags: string[];
  body: string;
};

const HANDBOOK: Card[] = [
  {
    id: "hello",
    title: "인사",
    tags: ["안녕", "hello", "하이", "ㅎㅇ", "소개", "너누구"],
    body: "안녕하세요. VidShare Locals입니다. 이 채팅방에서 말한 내용은 이어서 기억해요. 다른 방에 있던 대화 검색은 Shape, 더 긴 추론은 Vide·Shape가 맡습니다.",
  },
  {
    id: "guest",
    title: "비회원",
    tags: ["비회원", "게스트", "로그인전", "권한", "못함", "제한"],
    body: "비회원은 쇼츠 보기, 롱폼 보기, 커뮤니티 글 읽기, Locals 챗봇만 됩니다. 좋아요·댓글 작성·업로드·메시지·알림·글쓰기·Vide/Shape는 로그인 후입니다.",
  },
  {
    id: "member",
    title: "회원",
    tags: ["회원", "가입하면", "로그인하면", "할수있어"],
    body: "회원은 업로드, 커뮤니티 글쓰기, 롱폼 등록, 메시지, 알림, 좋아요/댓글, Vide·Shape 챗봇, 채팅방 저장 목록을 씁니다.",
  },
  {
    id: "shorts",
    title: "쇼츠",
    tags: ["쇼츠", "shorts", "홈", "세로", "넘기", "피드", "영상보기"],
    body: "홈(쇼츠)에서 위아래로 넘기며 보면 됩니다. 소리 버튼으로 음소거를 풀 수 있어요. 좋아요·댓글 남기기·공유는 회원만 됩니다. 댓글은 비회원도 읽기만 할 수 있습니다.",
  },
  {
    id: "longform",
    title: "롱폼",
    tags: ["롱폼", "긴영상", "longform", "등록", "재생"],
    body: "상단 ‘롱폼 영상’에서 목록을 보고, 항목을 누르면 상세에서 재생됩니다. 롱폼 등록 버튼은 회원만 보입니다.",
  },
  {
    id: "community",
    title: "커뮤니티",
    tags: ["커뮤니티", "글", "게시판", "글쓰기", "읽기"],
    body: "‘커뮤니티’에서 글을 눌러 내용을 봅니다. 글쓰기는 회원만 됩니다. 비회원은 목록과 상세 열람만 됩니다.",
  },
  {
    id: "auth",
    title: "로그인 가입",
    tags: ["로그인", "회원가입", "가입", "계정", "demo", "비밀번호", "핸들"],
    body: "오른쪽 위 로그인/회원가입을 쓰세요. 테스트 계정은 핸들 demo / 비밀번호 demo1234 입니다. 가입은 핸들·이름·비밀번호가 필요합니다. 서버를 재시작해도 계정은 SQLite에 남습니다.",
  },
  {
    id: "chatbot",
    title: "챗봇 모델",
    tags: ["챗봇", "locals", "vide", "shape", "모델", "기억", "추론"],
    body: "Locals는 비회원도 쓰는 가벼운 VidShare 안내 모델입니다. 채팅방 목록/새 방 추가는 회원만 됩니다. Vide는 회원용으로 이 대화 기억을 더 길게 가져갑니다. Shape는 회원용으로 저장된 챗봇 대화를 검색하고 추론이 더 깊습니다.",
  },
  {
    id: "upload",
    title: "업로드",
    tags: ["업로드", "올리기", "게시"],
    body: "업로드는 회원 전용입니다. 로그인 후 네비의 업로드로 들어갑니다.",
  },
  {
    id: "messages",
    title: "메시지",
    tags: ["메시지", "채팅", "상대", "디엠"],
    body: "1:1 메시지는 회원 전용입니다. 로그인 후 말풍선 아이콘에서 상대를 추가하고 대화를 엽니다.",
  },
  {
    id: "like-comment",
    title: "좋아요 댓글",
    tags: ["좋아요", "댓글", "싫어요", "공유"],
    body: "쇼츠 좋아요·싫어요·댓글 작성·공유는 회원만 됩니다. 비회원은 영상을 보고 댓글 목록만 읽을 수 있습니다.",
  },
  {
    id: "profile",
    title: "프로필",
    tags: ["프로필", "채널", "팔로우"],
    body: "영상 아래 핸들을 누르면 프로필을 볼 수 있습니다. 팔로우·메시지는 회원만 됩니다.",
  },
  {
    id: "support",
    title: "고객센터",
    tags: ["고객센터", "문의", "faq", "도움"],
    body: "고객센터 문의는 회원 전용입니다. 로그인 후 네비의 고객센터에서 FAQ와 문의 메시지를 쓸 수 있습니다.",
  },
];

function tokens(raw: string) {
  const s = raw.toLowerCase();
  const words = s.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2);
  const hangul = s.replace(/[^\uac00-\ud7a3]/g, "");
  const grams: string[] = [];
  for (let i = 0; i < hangul.length - 1; i++) grams.push(hangul.slice(i, i + 2));
  return [...words, ...grams];
}

function scoreCard(query: string, card: Card) {
  const q = new Set(tokens(query));
  if (q.size === 0) return 0;
  const hay = tokens(`${card.title} ${card.tags.join(" ")} ${card.body}`);
  let hit = 0;
  for (const t of hay) {
    if (q.has(t)) hit += 1;
  }
  for (const tag of card.tags) {
    if (query.toLowerCase().includes(tag.toLowerCase())) hit += 6;
  }
  return hit;
}

function followUpQuery(current: string, previousUser?: string) {
  const short = current.trim().length <= 8;
  const follow =
    /(그건|그거|그게|거기|더|어떻게|왜|언제|누구|응|맞아|그럼)/.test(current);
  if ((short || follow) && previousUser) {
    return `${previousUser} ${current}`;
  }
  return current;
}

function retrieve(query: string, limit = 2) {
  const ranked = HANDBOOK.map((card) => ({
    card,
    score: scoreCard(query, card),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit).map((x) => x.card);
}

export function localsSystemPrompt() {
  const book = HANDBOOK.map((c) => `- ${c.title}: ${c.body}`).join("\n");
  return [
    "너는 VidShare Locals다. 빠르고 가벼운 대화 모델이다.",
    "이 채팅방에 나온 말(이름, 선택, 이전 질문)은 Gemini Flash 급으로 기억하고 이어서 답한다.",
    "다른 채팅방 기록은 검색하지 않는다. 그건 Shape의 일이다.",
    "Vide·Shape보다 답은 짧게, 추론은 얕게. VidShare 사용 안내가 우선이다.",
    "한국어로 답한다.",
    "",
    "[VidShare 핸드북]",
    book,
  ].join("\n");
}

function userFacts(
  recent: Array<{ role: "user" | "assistant"; content: string }>,
  current: string
) {
  return recent
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim())
    .filter((c) => c.length >= 4 && c !== current)
    .slice(-16);
}

/** 키 없을 때 쓰는 Locals. 이 방 대화는 기억하고, 핸드북으로 안내한다. */
export function runLocals(
  userText: string,
  recent?: Array<{ role: "user" | "assistant"; content: string }>
) {
  const turns = recent ?? [];
  const facts = userFacts(turns, userText);
  const prevUser = facts[facts.length - 1];
  const query = followUpQuery(userText, prevUser);
  const hits = retrieve(`${query} ${facts.slice(-4).join(" ")}`, 3);
  const recap =
    facts.length > 0
      ? `이 대화에서 기억한 말: ${facts
          .slice(-8)
          .map((f) => `“${f.slice(0, 80)}”`)
          .join(", ")}.`
      : "";

  const asksRecall =
    /(아까|그거|그건|그게|내가 말|뭐라고 했|이름|기억|이어서|계속)/.test(
      userText
    );

  if (asksRecall && facts.length) {
    const handbook = hits.length
      ? `\n${[...new Set(hits.map((c) => c.body))].join("\n")}`
      : "";
    return `VidShare Locals입니다. ${recap}${handbook}`;
  }

  if (!hits.length) {
    return [
      "VidShare Locals입니다. 이 채팅방 내용은 기억하지만, 안내 범위는 VidShare예요.",
      recap,
      "쇼츠, 롱폼, 커뮤니티, 로그인, 회원 기능, 챗봇 모델 쪽으로 물어보시면 바로 이어갈게요. 다른 방 검색·깊은 추론은 Vide·Shape입니다.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const unique = [...new Set(hits.map((c) => c.body))];
  if (hits[0].id === "hello" && !facts.length) return unique[0];
  return ["VidShare Locals입니다.", recap, unique.join("\n")]
    .filter(Boolean)
    .join("\n");
}
