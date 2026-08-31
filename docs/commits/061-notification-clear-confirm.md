# 061 — 알림 전체 삭제 확인 단계

## 메타 정보

| 항목 | 내용 |
|------|------|
| **문서 번호** | `061` |
| **파일명** | `061-notification-clear-confirm.md` |
| **Git 커밋 (short)** | `7ff45bb` |
| **Git 커밋 (full)** | `7ff45bbb61b551a485a87860624beaf83095ac1b` |
| **날짜** | `2026-08-31` |
| **작성자** | `GitHub Copilot (pair)` |
| **브랜치** | `master` |
| **관련 CHANGELOG** | `Unreleased` |
| **로드맵 항목** | Phase A — A4 |

---

## 1. 커밋 내용

```
feat: 알림 전체 삭제에 확인 단계 추가

- 팝업 뷰에 confirmClear 상태 추가 (list / settings / confirmClear)
- 설정의 "알림 전체 삭제"가 즉시 삭제 대신 확인 화면으로 이동
- 확인 화면: 삭제 건수 표시, 취소(설정 복귀) / 삭제(실행 후 목록 복귀)
```

---

## 2. 개요

커밋 055에서 설정 패널에 "알림 전체 삭제"를 넣었으나 **클릭 즉시 삭제**됐다.
`clearAllNotifications()` 는 API 실패 시에만 롤백하고 성공하면 되돌릴 수 없으므로,
오조작 시 사용자가 알림을 전부 잃는다. 055 문서의 "알려진 한계 2번"으로 남겨 둔 항목이다.

---

## 3. 변경 파일

| 파일 | 변경 |
|------|------|
| `FrontServer/components/layout/NotificationPopup.tsx` | 뷰 상태 확장 + 확인 화면 |

백엔드·스토어 변경 없음. 058에서 추가한 `DELETE /api/notifications` 를 그대로 쓴다.

---

## 4. 구현 상세

### 4.1 뷰 상태 확장

```diff
- const [view, setView] = useState<"list" | "settings">("list");
+ const [view, setView] = useState<"list" | "settings" | "confirmClear">("list");
```

팝업을 닫았다 열면 `useEffect` 가 `"list"` 로 되돌리므로,
확인 화면에서 팝업을 닫아도 다음에 열 때 삭제 화면이 남지 않는다.

### 4.2 헤더 대응

| 뷰 | 제목 | 톱니바퀴 |
|------|------|----------|
| `list` | 알림 (+ 미읽 배지) | 비활성 스타일 → 클릭 시 `settings` |
| `settings` | 알림 설정 | 활성 스타일 → 클릭 시 `list` |
| `confirmClear` | 알림 전체 삭제 | 활성 스타일 → 클릭 시 `list` (탈출구) |

톱니바퀴 조건을 `view === "settings"` 에서 `view !== "list"` 로 바꿔,
확인 화면에서도 눌러서 빠져나올 수 있게 했다.

### 4.3 확인 화면

```
⚠ 알림 12건을 모두 삭제할까요?
  삭제한 알림은 되돌릴 수 없습니다.

                    [취소]  [삭제]
```

- 삭제 건수를 문구에 넣어 무엇이 사라지는지 명시
- `취소` → `settings` 로 복귀 (직전 화면)
- `삭제` → `clearAllNotifications()` 실행 후 `list` 로 복귀
- 위험 동작이므로 `삭제` 버튼만 `bg-[var(--danger)]` 채움, `취소` 는 외곽선

---

## 5. 검증

- `npx tsc --noEmit` 통과
- `npm run lint` 통과 (기존 `no-page-custom-font` 경고만 잔존)

수동 확인:
- [x] 설정 → 전체 삭제 → 확인 화면 노출
- [x] 취소 → 설정으로 복귀, 알림 유지
- [x] 삭제 → 알림 0건, 목록 화면 복귀, Navbar 배지 사라짐
- [x] 알림 0건이면 "알림 전체 삭제" 버튼 자체가 비활성

---

## 6. 남은 한계

1. **"모두 읽음"에는 확인이 없다** — 되돌릴 수 있는 동작이라 의도적으로 두지 않았다.
2. **개별 삭제에도 확인이 없다** — 목록 페이지의 항목별 삭제는 즉시 실행된다.
   피해 범위가 1건이라 현재는 유지.
3. **실행 취소(Undo) 없음** — 토스트로 되돌리기를 제공하는 편이 더 낫지만
   토스트 시스템이 아직 없어 확인 단계로 대체했다.

---

## 7. 관련 문서

- [055 — 알림 팝업 위치 및 설정 UI 개편](./055-notification-popup-settings-ui.md) (한계 2번을 해소)
- [058 — 알림 벌크 API](./058-notification-bulk-endpoints.md)
- [로드맵 Phase A](../features/roadmap.md)
