# 036 — 챗봇 RAG 고도화 & 멀티모달 지원

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `036` |
| **파일명** | `036-chatbot-rag-multimodal.md` |
| **Git 커밋 (short)** | `a5927ad` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-08-22` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **관련 이슈/PR** | 없음 |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용 (Git 메시지 초안)

### 제목

```
feat: 챗봇 RAG 고도화 & 멀티모달 지원
```

### 본문

```
플랫폼 전체 현황(JSON 스냅샷)과 클라이언트 보유 커뮤니티·롱폼 문서를
매 요청마다 검색해 답변에 반영. 이미지/PDF/DOCX 첨부를 읽어 Locals·Vide는
Gemini 비전으로 직접, Shape는 Gemini로 먼저 설명한 뒤 Groq로 추론하는
방식으로 우회 지원. 봇 답변은 마크다운(굵게·이탤릭·취소선·목록)으로 렌더링.

상세 기록: docs/commits/036-chatbot-rag-multimodal.md
```

---

## 2. 개요

### 배경
챗봇이 "쇼츠 몇 개야?", "제일 인기 있는 글 뭐야?" 같은 플랫폼 현황 질문에
답을 못 하고, 이미지·문서 첨부도 읽지 못해 세 모델(Locals/Vide/Shape) 간
실질적 차별점이 부족했다. 특히 최상위 모델인 Shape가 이미지를 못 읽는 것은
등급 구성상 납득이 안 되는 문제였다.

### 목표
- 플랫폼 실데이터(쇼츠·유저·FAQ 개수, 인기글 등)를 항상 최신 상태로 프롬프트에 주입
- 클라이언트가 보유한 커뮤니티/롱폼 글을 키워드 매칭으로 검색해 RAG 컨텍스트로 병합
- 이미지·PDF·DOCX 첨부를 세 모델 모두 (구현 방식은 다르더라도) 이해할 수 있게 함
- 봇 답변의 가독성을 마크다운 서식으로 개선

### 범위 (In Scope)
- 백엔드: platform.ts 신설, llm.ts 비전/이미지 유틸, 세 모델 시스템 프롬프트 갱신
- 프론트: chat-files.ts 신설(PDF/DOCX/이미지 처리), ChatMarkdown 컴포넌트 신설
- Express JSON 바디 제한 확장(2MB → 12MB)

### 범위 밖 (Out of Scope)
- 서버 DB 기반 전체 유저의 커뮤니티/롱폼 인덱싱 (현재는 요청 시점 클라이언트 localStorage만 반영)
- 이미지 임베딩 기반 벡터 검색 (현재는 키워드 스코어링)

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] 플랫폼 JSON 스냅샷(쇼츠/유저/댓글/FAQ 개수, 인기 쇼츠) 매 요청 생성 후 세 모델 프롬프트에 주입
- [x] 클라이언트 제공 커뮤니티·롱폼 문서를 서버 DB 데이터와 병합해 키워드 스코어링 후 상위 K개 검색
- [x] Locals·Vide: 마지막 사용자 턴에 이미지 파트 첨부 (Gemini 비전 직접 지원)
- [x] Shape: Gemini로 이미지 설명을 먼저 생성한 뒤, 설명 텍스트를 RAG 컨텍스트로 병합 (Groq는 비전 미지원이라 우회)
- [x] 세 모델 시스템 프롬프트에 마크다운 서식(굵게/이탤릭/취소선/목록) 사용 지시 추가
- [x] 프론트: PDF(pdfjs-dist)·DOCX(mammoth) 텍스트 추출, 이미지 다운스케일(최대 1280px, JPEG 82%) 후 base64 전송
- [x] 봇 메시지를 react-markdown + remark-gfm으로 렌더링
- [x] Express JSON 바디 제한 2MB → 12MB (base64 이미지 수용)

### 주요 변경 파일·경로
| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `BackendServer/src/chatbot/platform.ts` | 추가 | 플랫폼 스냅샷 생성 + 클라이언트 문서 포함 검색 |
| `BackendServer/src/chatbot/llm.ts` | 수정 | `supportsVision`, `attachImages`, `describeImages`, `withSystem` |
| `BackendServer/src/chatbot/locals.ts` | 수정 | platformDocs/images 전달, withSystem 사용 |
| `BackendServer/src/chatbot/vide.ts` | 수정 | 스냅샷·비전 지시 프롬프트, 조건부 이미지 전달 |
| `BackendServer/src/chatbot/shape.ts` | 수정 | Gemini 비전 설명 선행 태스크 → RAG 컨텍스트 병합 |
| `BackendServer/src/chatbot/complete.ts` | 수정 | `images` 파라미터 라우팅 |
| `BackendServer/src/chatbot/types.ts` | 수정 | `ImageInput`, `PlatformDoc` 타입 추가 |
| `BackendServer/src/routes/chatbot.ts` | 수정 | platformDocs/images 검증(MIME, 개수, 크기 제한) |
| `BackendServer/src/app.ts` | 수정 | JSON 바디 제한 12mb |
| `FrontServer/lib/chat-files.ts` | 추가 | PDF/DOCX 텍스트 추출, 이미지 다운스케일 |
| `FrontServer/components/chatbot/ChatMarkdown.tsx` | 추가 | 마크다운 렌더링 컴포넌트 |
| `FrontServer/components/chatbot/ChatbotWorkspace.tsx` | 수정 | 첨부·플랫폼 코퍼스 수집, 마크다운 렌더 적용 |
| `FrontServer/lib/content-store.ts` | 수정 | `collectPlatformCorpus()` 추가 |
| `FrontServer/lib/api.ts` | 수정 | `chatbotComplete` 페이로드에 `images` 추가 |

### 데이터·API
- `POST /api/chatbot/complete` 요청 바디에 `platformDocs?: PlatformDoc[]`, `images?: ImageInput[]` 추가
- 서버 응답 스키마는 변경 없음 (`text`, `model`, `pipeline`, `retrieved`)

### UI/UX
- 봇 메시지가 굵게·이탤릭·취소선·목록·코드블록 등 마크다운 서식으로 표시
- 파일 첨부 허용 확장자에 `.log/.xml/.yml/.yaml/.pdf/.docx` 추가

---

## 4. 기타

### 검증 방법
```bash
npm --prefix BackendServer run typecheck
npm --prefix FrontServer exec tsc --noEmit

# 수동 시나리오
# 1) Locals에 "HELLO 42" 텍스트 PNG 첨부 → 이미지 속 문자 정확히 인식
# 2) Shape에 "SHAPE SEES 7" 텍스트 PNG 첨부 → Gemini 설명 경유로 정확히 인식
# 3) "쇼츠 몇 개야? 제일 인기 있는 글은?" 질문 → 실제 DB 카운트/제목 응답
```

### 트레이드오프 · 결정 이유
- Shape(Groq, openai/gpt-oss-120b)는 비전 미지원이라 Gemini 설명 선행 방식을 택함 —
  직접 비전보다 정밀도는 떨어지지만 추가 모델 계약 없이 기능 동등성 확보
- LangChain `ChatPromptTemplate`은 `{}` 를 f-string으로 파싱해 JSON 스냅샷 삽입 시 깨짐 →
  원시 `SystemMessage` 기반 `withSystem()` 으로 교체
- 커뮤니티/롱폼 검색은 벡터 임베딩 대신 키워드 스코어링 사용 (초기 구현 단순화 목적)

### 리스크 · 알려진 이슈
- 커뮤니티/롱폼 스냅샷 개수는 요청 보낸 클라이언트의 localStorage 기준이라 전체 플랫폼 뷰와 다를 수 있음
- Shape의 이미지 인식 품질은 Gemini 설명 텍스트 길이/정확도에 종속

### 후속 작업
- [ ] 서버 DB에 커뮤니티/롱폼을 저장해 전 유저 공통 스냅샷으로 전환
- [ ] 키워드 스코어링을 임베딩 기반 벡터 검색으로 교체 검토

### 참고 링크
- 없음
