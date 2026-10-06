import { test, expect, type Browser, type Page } from "@playwright/test";
import { gotoStable, loginAsDemo } from "./helpers";

/** playwright.config.ts 의 격리 백엔드 포트 */
const API = "http://localhost:4310";

async function createShortAsDemo(page: Page, title: string) {
  const res = await page.request.post(`${API}/api/shorts`, { data: { title, description: "E2E 용" } });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()).data.id as string;
}

/** 다른 계정으로 가입해 로그인된 새 컨텍스트의 페이지를 돌려준다 */
async function memberPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  // 핸들은 3~20자 — base36 로 짧게 만든다
  const handle = `v${Date.now().toString(36)}${Math.floor(Math.random() * 100)}`;
  const res = await page.request.post(`${API}/api/auth/register`, {
    data: { handle, name: handle, password: "password123" },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return { page, context };
}

/** `/?id=<id>` 는 그 쇼츠를 맨 앞에 놓는다 → 첫 카드가 대상 */
async function openFirstCard(page: Page, id: string) {
  await gotoStable(page, `/?id=${id}`);
  const card = page.locator(".short-snap-item").first();
  await expect(card).toBeVisible();
  return card;
}

const menuButton = (card: ReturnType<Page["locator"]>) =>
  card.getByRole("button", { name: "영상 설정" });

test("업로더: ⋮ 메뉴에서 수정·비공개·댓글 끄기·삭제를 한다", async ({ page }) => {
  await loginAsDemo(page);
  const title = `내 영상 ${Date.now()}`;
  const id = await createShortAsDemo(page, title);
  const card = await openFirstCard(page, id);
  await expect(card.getByRole("heading", { name: title })).toBeVisible();

  // 업로더에게는 수정·삭제만 — 비추천·신고·차단은 없다
  await menuButton(card).click();
  const menu = card.getByRole("menu");
  await expect(menu.getByRole("menuitem", { name: /수정/ })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "삭제" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: /비추천/ })).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name: "신고" })).toHaveCount(0);

  // 수정: 제목 · 비공개 · 댓글 끄기
  await menu.getByRole("menuitem", { name: /수정/ }).click();
  const dialog = page.getByRole("dialog", { name: "영상 수정" });
  await expect(dialog).toBeVisible();
  const newTitle = `${title} (수정됨)`;
  await dialog.getByLabel("제목").fill(newTitle);
  await dialog.getByText("비공개", { exact: true }).click();
  await dialog.getByRole("switch", { name: /댓글 허용/ }).uncheck();
  await dialog.getByRole("button", { name: "저장" }).click();
  await expect(dialog).toBeHidden();

  await expect(card.getByRole("heading", { name: newTitle })).toBeVisible();
  await expect(card.getByText("비공개", { exact: true })).toBeVisible();

  const saved = await (await page.request.get(`${API}/api/shorts/${id}`)).json();
  expect(saved.data.title).toBe(newTitle);
  expect(saved.data.visibility).toBe("private");
  expect(saved.data.commentsEnabled).toBe(false);

  // 삭제
  await menuButton(card).click();
  await card.getByRole("menuitem", { name: "삭제" }).click();
  const confirm = page.getByRole("dialog", { name: "영상을 삭제할까요?" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "삭제" }).click();
  await expect(confirm).toBeHidden();

  const gone = await page.request.get(`${API}/api/shorts/${id}`);
  expect(gone.status()).toBe(404);
  await expect(page.getByRole("heading", { name: newTitle })).toHaveCount(0);
});

test("로그인한 다른 유저: 비추천하면 내 피드에서 빠지고 되돌릴 수 있다", async ({ page, browser }) => {
  await loginAsDemo(page);
  const title = `비추천 대상 ${Date.now()}`;
  const id = await createShortAsDemo(page, title);

  const viewer = await memberPage(browser);
  try {
    const card = await openFirstCard(viewer.page, id);
    await expect(card.getByRole("heading", { name: title })).toBeVisible();

    await menuButton(card).click();
    const menu = card.getByRole("menu");
    for (const name of [/비추천/, /링크 복사/, /작성자 프로필/, "신고", /작성자 차단/]) {
      await expect(menu.getByRole("menuitem", { name })).toBeVisible();
    }
    await expect(menu.getByRole("menuitem", { name: /수정/ })).toHaveCount(0);
    await expect(menu.getByRole("menuitem", { name: "삭제" })).toHaveCount(0);

    await menu.getByRole("menuitem", { name: /비추천/ }).click();
    await expect(viewer.page.getByRole("heading", { name: title })).toHaveCount(0);
    await expect(viewer.page.getByRole("status")).toContainText("추천에서 제외했어요");

    // 새로고침해도(= 서버에 저장되어) 이 유저의 피드에는 없다
    await gotoStable(viewer.page, "/");
    await expect(viewer.page.getByRole("heading", { name: title })).toHaveCount(0);
    // 영상 자체는 남아 있다 — 작성자에게는 그대로
    await gotoStable(page, "/");
    await expect(page.getByRole("heading", { name: title })).toHaveCount(1);

    // 되돌리기
    await gotoStable(viewer.page, `/?id=${id}`).catch(() => undefined);
    const undo = await viewer.page.request.delete(`${API}/api/shorts/${id}/dislike`);
    expect(undo.ok()).toBeTruthy();
    await gotoStable(viewer.page, "/");
    await expect(viewer.page.getByRole("heading", { name: title })).toHaveCount(1);
  } finally {
    await viewer.context.close();
  }
});

test("로그인한 다른 유저: 비추천 직후 '되돌리기' 버튼으로 바로 복구한다", async ({ page, browser }) => {
  await loginAsDemo(page);
  const title = `바로 되돌리기 ${Date.now()}`;
  const id = await createShortAsDemo(page, title);

  const viewer = await memberPage(browser);
  try {
    const card = await openFirstCard(viewer.page, id);
    await menuButton(card).click();
    await card.getByRole("menuitem", { name: /비추천/ }).click();
    await expect(viewer.page.getByRole("heading", { name: title })).toHaveCount(0);

    await viewer.page.getByRole("button", { name: "되돌리기" }).click();
    await expect(viewer.page.getByRole("heading", { name: title })).toHaveCount(1);

    await gotoStable(viewer.page, "/");
    await expect(viewer.page.getByRole("heading", { name: title })).toHaveCount(1);
  } finally {
    await viewer.context.close();
  }
});

test("비로그인: 비추천은 로그인 없이 되고 이 브라우저에 저장된다", async ({ page, browser }) => {
  await loginAsDemo(page);
  const title = `게스트 비추천 ${Date.now()}`;
  const id = await createShortAsDemo(page, title);

  const context = await browser.newContext();
  const guest = await context.newPage();
  try {
    const card = await openFirstCard(guest, id);
    await expect(card.getByRole("heading", { name: title })).toBeVisible();

    await menuButton(card).click();
    await expect(card.getByRole("menuitem", { name: /수정/ })).toHaveCount(0);

    // 비추천은 로그인 없이 된다
    await card.getByRole("menuitem", { name: /비추천/ }).click();
    await expect(guest.getByRole("heading", { name: title })).toHaveCount(0);

    // 새로고침해도 이 브라우저에서는 계속 빠져 있다
    await gotoStable(guest, "/");
    await expect(guest.getByRole("heading", { name: title })).toHaveCount(0);
    const stored = await guest.evaluate(() => window.localStorage.getItem("vidshare:hidden-shorts"));
    expect(JSON.parse(stored ?? "[]")).toContain(id);

    // 다른 방문자(작성자)에게는 그대로
    await gotoStable(page, "/");
    await expect(page.getByRole("heading", { name: title })).toHaveCount(1);

    // 되돌리기 (검색어로 직접 찾을 땐 보인다는 규칙도 확인)
    await gotoStable(guest, `/?q=${encodeURIComponent(title)}`);
    await expect(guest.getByRole("heading", { name: title })).toHaveCount(1);
  } finally {
    await context.close();
  }
});

test("비로그인: 신고를 누르면 로그인 화면으로 간다", async ({ page, browser }) => {
  await loginAsDemo(page);
  const id = await createShortAsDemo(page, `신고 안내 ${Date.now()}`);

  const context = await browser.newContext();
  const guest = await context.newPage();
  try {
    const card = await openFirstCard(guest, id);
    await menuButton(card).click();
    await card.getByRole("menuitem", { name: /^신고/ }).click();
    await guest.waitForURL(/\/login/);
  } finally {
    await context.close();
  }
});

test("로그인한 다른 유저: 신고를 접수하면 관리자가 볼 수 있게 저장된다", async ({ page, browser }) => {
  await loginAsDemo(page);
  const title = `신고 접수 ${Date.now()}`;
  const id = await createShortAsDemo(page, title);

  const viewer = await memberPage(browser);
  try {
    const card = await openFirstCard(viewer.page, id);
    await menuButton(card).click();
    await card.getByRole("menuitem", { name: /^신고/ }).click();

    const dialog = viewer.page.getByRole("dialog", { name: "영상 신고" });
    await expect(dialog).toBeVisible();
    const submit = dialog.getByRole("button", { name: "신고하기" });
    await expect(submit).toBeDisabled();

    // 기타는 직접 쓴 내용이 있어야 한다
    await dialog.getByText("기타", { exact: true }).click();
    await expect(submit).toBeDisabled();
    await dialog.getByLabel(/자세한 내용/).fill("테스트 신고입니다");
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(dialog).toBeHidden();
    await expect(viewer.page.getByRole("status")).toContainText("신고가 접수됐어요");
  } finally {
    await viewer.context.close();
  }
});

test("댓글을 닫아 둔 영상은 댓글 패널에 안내가 뜨고 입력창이 없다", async ({ page, browser }) => {
  await loginAsDemo(page);
  const id = await createShortAsDemo(page, `댓글 닫힘 ${Date.now()}`);
  const closed = await page.request.patch(`${API}/api/shorts/${id}`, { data: { commentsEnabled: false } });
  expect(closed.ok()).toBeTruthy();

  const viewer = await memberPage(browser);
  try {
    const card = await openFirstCard(viewer.page, id);
    await card.getByRole("button", { name: "댓글" }).click();
    await expect(viewer.page.getByText(/작성자가 새 댓글을 막아 두었어요/)).toBeVisible();
    await expect(viewer.page.getByPlaceholder("댓글을 입력하세요...")).toHaveCount(0);
  } finally {
    await viewer.context.close();
  }
});
