# 104 — 관리자 계정 찾기 · 비밀번호 재설정

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `104` |
| **파일명** | `104-admin-password-reset.md` |
| **Git 커밋 (short)** | `b8b5bd7` |
| **Git 커밋 (full)** | `b8b5bd7d822ec3ceed7c7eb695336b7c13fc9e34` |
| **날짜** | `2026-10-02` |
| **작성자** | `Claude` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` — Added |

---

## 1. 배경

관리자 비밀번호를 잃어버리면 복구할 방법이 없었다. 비밀번호는 bcrypt 해시(단방향)라 원래 값을
**찾는 것은 원리상 불가능**하다. 그래서 "찾기"는 **핸들 목록**, "복구"는 **재설정**으로 만든다.

## 2. 무엇을 만들었나

| 도구 | 하는 일 |
|------|---------|
| `npm run list-admins` | 관리자 핸들·이름·id·정지 여부·생성일 |
| `npm run reset-password -- <handle>` | 터미널에서 새 비밀번호 두 번 입력(화면에 안 보임) |
| `… --generate` | 무작위 16자(헷갈리는 0/O/1/l/I 제외, 모듈로 편향 제거)를 만들어 한 번만 출력 |
| `… --stdin` | 표준 입력으로 받기 |
| `deploy/windows/admin-tools.ps1 -List` / `-Reset <handle>` | 이 PC 에서 ssh 로 운영 서버의 위 CLI 실행 |
| 콘솔 로그인 화면 | "핸들·비밀번호를 잊었다면" 접이식 안내 |

재설정은 비밀번호 변경과 **그 계정의 모든 세션 삭제**를 한 트랜잭션으로 한다(`setAccountPassword`).
옛 비밀번호로 이미 로그인해 있던 브라우저도 즉시 끊긴다.

## 3. 왜 웹에 "비밀번호 찾기"를 두지 않았나

이메일·휴대폰 같은 본인 확인 수단이 없다. 웹에서 재설정을 열면 **아무나 관리자 비밀번호를 바꿀 수 있다.**
대신 **서버 SSH 키를 가진 사람 = 운영자**라는 사실을 본인 확인으로 쓴다.
`admin-tools.ps1` 은 원격 셸에 들어가는 핸들 값을 `^@?[A-Za-z0-9._]{3,20}$` 로 제한한다.

## 4. 검증

- 테스트 3건 추가(총 151): 관리자 목록에 일반 계정이 섞이지 않음 / 재설정 후 옛 세션 401·옛 비밀번호 401·새 비밀번호 200 / 없는 계정 null
- 임시 DB 에서 CLI: create → list → `--generate` → `--stdin` → 없는 계정 거부 → 6자 미만 거부
- **운영 서버**: `admin-tools.ps1 -List` 로 실제 관리자 2명 확인. 실제 관리자는 건드리지 않고
  임시 관리자 `zzresettest` 를 만들어 `-Reset` → 운영 API 로 옛 비밀번호 401, 새 비밀번호 200 확인 → **즉시 삭제**
  (비밀번호가 출력됐으므로). 남은 관리자: `whil496`, `portfolioadmin`
- 콘솔 재배포 후 로그인 화면에서 안내 노출 확인

## 5. 사용법

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\admin-tools.ps1 -List
powershell -ExecutionPolicy Bypass -File deploy\windows\admin-tools.ps1 -Reset whil496
```
