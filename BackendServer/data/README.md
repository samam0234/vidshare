# Backend SQLite

이 폴더는 BackendServer가 쓰는 **SQLite 파일 DB** 위치입니다.

| 파일 | Git | 설명 |
|------|-----|------|
| `.gitkeep` | 추적 | 빈 `data/` 폴더를 저장소에 유지 |
| `vidshare.sqlite` | 무시 | 실제 DB. 서버 재시작해도 내용이 남음 |
| `vidshare.sqlite-wal` / `-shm` | 무시 | WAL 보조 파일 |

경로를 바꾸려면 `BackendServer/.env` 의 `SQLITE_PATH` 를 씁니다. 비우면 이 폴더의 `vidshare.sqlite` 입니다.

처음 파일이 없거나 `users` 가 비어 있으면 `src/data/seedData.ts` 로 **한 번만** 시드합니다.  
이미 데이터가 있으면 시드하지 않습니다.

초기화: `vidshare.sqlite` 와 `.sqlite-wal` / `.sqlite-shm` 을 지우고 `npm run dev`.

---

## 테이블

| 테이블 | 역할 | 시드 행 |
|--------|------|---------|
| `users` | 계정 (핸들·이름·비밀번호 해시) | 5 |
| `sessions` | 로그인 세션 (`vidshare_sid`) | 0 (로그인 시 생성) |
| `shorts` | 쇼츠 | 5 |
| `comments` | 쇼츠 댓글 | 3 |
| `notifications` | 알림 | 7 |
| `chat_users` | 메시지 상대 | 3 |
| `messages` | 1:1 메시지 | 4 |
| `faqs` | 고객센터 FAQ | 4 |

커뮤니티·롱폼 글은 아직 프론트 `localStorage` 라 여기 없습니다.

---

## 시드로 등록되는 계정 (`users`)

비밀번호가 있는 계정만 `/api/auth/login` 이 됩니다. 해시만 저장합니다.

| id | 핸들 | 이름 | 로그인 |
|----|------|------|--------|
| `u-demo` | `demo` | Demo User | `demo` / `demo1234` |
| `u-me` | `usernumber02345` | Usernumber 02345 | 같은 비밀번호 `demo1234` |
| `u1` | `깃털유머` | 깃털유머 | 불가 (시드 크리에이터) |
| `u2` | `오피스유머` | 오피스유머 | 불가 |
| `u3` | `일상드립` | 일상드립 | 불가 |

회원가입(`POST /api/auth/register`)으로 생긴 계정은 이 표에 없고, 로컬 `vidshare.sqlite` 에만 추가됩니다.

---

## 시드 쇼츠 (`shorts`)

| id | 제목 | 작성자 |
|----|------|--------|
| `s1` | 쉬고 돈 적게 주는 알바의 실체 ㅋㅋㅋ | `u1` 깃털유머 |
| `s2` | 진짜 웃긴 직장썰 모음 | `u2` 오피스유머 |
| `s3` | 출근 5분 전 알람의 공포 | `u3` 일상드립 |
| `s4` | 카페 알바 첫날 생존기 | `u1` 깃털유머 |
| `s5` | 팀장님 피드백 번역기 | `u2` 오피스유머 |

---

## 시드 댓글 (`comments`)

| id | 쇼츠 | 작성 표시명 |
|----|------|-------------|
| `c1` | `s1` | 웃긴사람 |
| `c2` | `s1` | 퇴근요정 |
| `c3` | `s2` | 회의실탈출 |

---

## 그 외 시드

| 테이블 | 내용 |
|--------|------|
| `notifications` | `n1`~`n7` (댓글·좋아요·팔로워·공지·추천·멘션) |
| `chat_users` | `u1` 깃털유머, `u2` 오피스유머, `u3` 일상드립 |
| `messages` | `u1` 대화 2개, `u2` 1개, `u3` 1개 |
| `faqs` | `q1` 재생 안 됨, `q2` 프로필 링크, `q3` 프로필 사진, `q4` 재생이 느림 |

스키마 SQL: `src/db/schema.ts`  
시드 데이터: `src/data/seedData.ts`
