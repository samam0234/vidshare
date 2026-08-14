# 007 — 작성 콘텐츠 일련번호 스토어

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `007` |
| **파일명** | `007-content-store-serial-ids.md` |
| **Git 커밋 (short)** | `7668969` |
| **Git 커밋 (full)** | `7668969998eaee17f25ddafe8a2d98a6712d6351` |
| **날짜** | `2026-08-15` |
| **작성자** | VidShare |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

### 제목

```
feat: 작성 콘텐츠 일련번호 스토어 추가
```

### 본문

```
롱폼·커뮤니티·챗봇·메시지·알림이 같은 일련번호 규칙을 쓰도록
localStorage 스토어와 SerialBadge를 먼저 넣는다.

상세 기록: docs/commits/007-content-store-serial-ids.md
```

---

## 2. 개요

더미 시드 대신, 작성 시 `#001`부터 번호를 붙이고 상세 경로로 여는 공통 기반.

### 범위
- `types/content.ts`, `lib/content-store.ts`, `components/ui/SerialBadge.tsx`
- 페이지 UI는 후속 커밋

---

## 3. 변경

- [x] 순번 카운터 + localStorage 영속
- [x] 롱폼/커뮤니티/챗봇/대화/채팅/알림 add API
- [x] SerialBadge

---

## 작성 체크리스트

- [x] 문서 번호·파일명 규칙 준수
- [x] 인덱스·CHANGELOG 반영
- [x] Git 해시 기입 (`7668969`)
- [x] 민감 정보 없음
