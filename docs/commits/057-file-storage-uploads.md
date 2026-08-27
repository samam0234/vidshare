# 057 — 로컬 디스크 파일 스토리지

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `057` |
| **파일명** | `057-file-storage-uploads.md` |
| **Git 커밋 (short)** | `TBD` |
| **Git 커밋 (full)** | `TBD` |
| **날짜** | `2026-08-26` |
| **작성자** | `Grok` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |

---

## 1. 커밋 내용

```
feat: 로컬 디스크 파일 스토리지 (영상·썸네일)

POST /api/uploads 로 파일을 UUID 이름으로 저장하고 /uploads 로 제공한다.
쇼츠·롱폼 작성은 data URL 대신 업로드 URL을 저장한다.

상세: docs/commits/057-file-storage-uploads.md
```

---

## 2. 개요

### 배경
업로드 UI는 썸네일을 FileReader data URL로만 미리보기했고, 실제 영상 파일은 서버에 남기지 않았다.
롱폼 썸네일은 data URL이 SQLite에 들어가 DB가 비대해질 수 있었다.

### 목표
- 로그인 사용자가 영상·이미지를 디스크에 올리고, DB에는 `/uploads/<uuid>.<ext>` 만 저장
- 피드·상세·프로필이 그 파일을 재생/표시

### 범위 (In Scope)
- `POST /api/uploads?kind=image|video`
- `GET /uploads/:file` 정적 서빙
- 쇼츠 `thumb` 컬럼, 생성 시 data URL 거부
- 쇼츠/롱폼 작성 폼의 파일 선택

### 범위 밖 (Out of Scope)
- S3 등 오브젝트 스토리지
- 업로드 진행률 표시
- 트랜스코딩, 썸네일 자동 추출
- 비공개(서명 URL) 미디어

---

## 3. 구현 기능 · 변경 사항

### 기능 / 동작
- [x] 로그인 후 이미지 8MB / 영상 100MB 업로드
- [x] MIME·확장자 화이트리스트 (jpg/png/webp/gif, mp4/webm/mov)
- [x] 파일명은 UUID. 원본 파일명 미사용
- [x] 쇼츠·롱폼 생성 시 `data:` URL 거부, `/uploads/...` 또는 http(s) 허용
- [x] 프론트는 `mediaUrl()` 로 API 호스트를 붙여 재생 (LAN IP 포함)
- [x] 시드 쇼츠의 외부 샘플 URL은 그대로 재생

### 주요 변경 파일·경로

| 경로 | 변경 유형 | 설명 |
|------|-----------|------|
| `BackendServer/src/upload/files.ts` | 추가 | 경로·MIME·URL 검증 |
| `BackendServer/src/routes/uploads.ts` | 추가 | multer 디스크 저장 |
| `BackendServer/src/app.ts` | 수정 | `/uploads` static + 라우트 등록 |
| `BackendServer/src/db/schema.ts` | 수정 | `shorts.thumb` |
| `BackendServer/src/db/client.ts` | 수정 | 기존 DB ALTER 마이그레이션 |
| `FrontServer/lib/api.ts` | 수정 | `uploadFile` (FormData, JSON Content-Type 없음) |
| `FrontServer/lib/media.ts` | 추가 | `mediaUrl`, 용량·형식 검사 |
| `FrontServer/components/upload/*` | 수정 | 영상 파일 선택 |
| `FrontServer/components/longform/LongformForm.tsx` | 수정 | 파일 업로드 + URL 대안 |

### 데이터·API

```
POST /api/uploads?kind=image|video
Content-Type: multipart/form-data
field: file

{ "success": true, "data": { "url": "/uploads/<uuid>.mp4", "mime": "...", "size": 123, "kind": "video" } }
```

생성 API의 `videoUrl`/`thumb` 는 `/uploads/<uuid>.<ext>` 또는 `http(s)://...` 만 허용.

---

## 4. 기타

### 검증 방법
```bash
cd BackendServer && npx tsc --noEmit
cd FrontServer && npx tsc --noEmit && npm run lint
```

수동: 로그인(`demo`/`demo1234`) → `/upload` 에서 mp4 업로드 → 홈 피드에서 재생 → 프로필 그리드에 썸네일.

### 트레이드오프 · 결정 이유
- 로컬 `uploads/` 를 택함. 개인 프로젝트 한 대에 맞고, 계획서의 다음 단계와 일치.
- DB에 blob을 넣지 않음. URL만 저장.
- 업로드 파일은 인증 없이 GET 가능. 피드 재생이 단순하고, 비공개는 후속.

### 리스크 · 알려진 이슈
- 업로드 성공 후 콘텐츠 생성이 실패하면 고아 파일이 남음 (정리 잡 없음)
- 영상 트랜스코딩 없음. 코덱이 브라우저와 안 맞으면 재생 실패
- 100MB 한도는 데모용. 디스크 용량 관리는 운영자 몫

### 후속 작업
- [ ] 알림 벌크 엔드포인트 (A2)
- [ ] 업로드 진행률
- [ ] 고아 파일 정리
- [ ] (필요 시) 오브젝트 스토리지

### 참고 링크
- [로드맵 A1](../features/roadmap.md)
- [아키텍처](../architecture/overview.md)
