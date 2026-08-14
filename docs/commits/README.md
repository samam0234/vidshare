# 커밋 상세 기록 가이드

Git 커밋 메시지는 짧게 남기고, **배경·구현 범위·검증 방법**은 이 폴더의 Markdown에 남깁니다.

커밋 메시지보다 **항상 더 상세**하게 작성하는 것이 목적입니다.

---

## 왜 따로 쓰나

| Git commit message | `docs/commits/*.md` |
|--------------------|---------------------|
| 한두 줄 요약 | 개요 + 구현 기능 + 기타 |
| `git log` 로 훑기 | 온보딩·회고·인수인계 |
| 변경 파일 목록은 diff | 의도·트레이드오프 설명 |

---

## 파일 규칙

### 파일명

```
NNN-짧은-영문-slug.md
```

- `NNN`: 3자리 순번 (`001`, `002`, …) — **이 폴더 안에서의 문서 번호**
- `slug`: 소문자, 하이픈 (예: `vidshare-frontend-redesign`)

예: `002-vidshare-frontend-redesign.md`

### 순번 vs Git 해시

| 필드 | 의미 |
|------|------|
| 문서 번호 (`NNN`) | docs 안 순서. 사람이 읽기 쉬운 인덱스 |
| Git 커밋 해시 | `git rev-parse --short HEAD` 등 실제 커밋 ID |
| (선택) 전체 해시 | 감사·추적용 |

해시가 아직 없으면 `TBD` 로 두고, **커밋 직후 갱신**합니다.

---

## 작성 절차 (체크리스트)

1. [TEMPLATE.md](./TEMPLATE.md) 복사 → 새 파일명으로 저장
2. **커밋 번호·제목·개요·구현 기능·기타** 작성
3. 아래 [인덱스](#인덱스) 표에 행 추가
4. (권장) [../changelog/CHANGELOG.md](../changelog/CHANGELOG.md) 요약 반영
5. 코드 + 이 MD 를 함께 `git add`
6. `git commit`
7. 생성된 **해시**를 MD의 `Git 커밋` 필드에 기입 후 amend **하지 말고**,  
   해시만 고치는 작은 후속 커밋을 하거나, 커밋 전에 메시지 확정 후  
   `git log -1 --format=%h` 로 채워 **같은 커밋에 포함**하는 방식을 선호

> 실무 팁: 상세 MD를 먼저 쓰고, 커밋 메시지 첫 줄은 MD 제목과 맞춥니다.  
> 해시는 커밋 후 `002` 문서에 패치 커밋으로 넣어도 됩니다.

---

## 템플릿 필수 섹션

1. **메타** — 문서 번호, Git 해시, 날짜, 작성자, 관련 이슈
2. **커밋 내용** — git 메시지에 넣을 한 줄 + 본문 초안
3. **개요** — 왜 이 변경을 했는지
4. **구현 기능 / 변경 사항** — 체크리스트·경로
5. **기타** — 트레이드오프, 후속 과제, 검증, 리스크

전체 골격: [TEMPLATE.md](./TEMPLATE.md)

---

## 인덱스

| 문서 번호 | 파일 | Git (short) | 한 줄 요약 | 날짜 |
|-----------|------|-------------|------------|------|
| 001 | [001-initial-create-next-app.md](./001-initial-create-next-app.md) | `7dcb8d8` | Create Next App 초기 스캐폴드 | 2026-08-14 |
| 002 | [002-vidshare-frontend-redesign.md](./002-vidshare-frontend-redesign.md) | `630d716` | VidShare 프론트 리디자인 + docs | 2026-08-14 |
| 003 | [003-split-front-backend-servers.md](./003-split-front-backend-servers.md) | `5dccd96` | FrontServer / BackendServer 분리 | 2026-08-14 |

---

## 좋은 예 / 나쁜 예

**좋은 커밋 메시지**
```
feat: 쇼츠 피드와 프로필·업로드 UI 추가

mock 데이터 기반 데모. 상세: docs/commits/002-....md
```

**나쁜 예**
```
update
fix
ㅁㄴㅇㄹ
```

---

## 관련 문서

- [docs 가이드](../README.md)
- [CHANGELOG](../changelog/CHANGELOG.md)
- [템플릿](./TEMPLATE.md)
