import type { Locator, Page } from "@playwright/test";

export const DEMO = { handle: "demo", password: "demo1234" };

/**
 * Next dev(Turbopack)는 라우트를 처음 방문하면 HTML 응답 이후에도
 * 잠깐 백그라운드에서 Fast Refresh 재컴파일이 돈다(로그상 100ms 안팎).
 * 그 사이에 들어온 입력/클릭이 씹히는 경우가 있어, 페이지 이동 후에는
 * 항상 이 헬퍼로 네트워크가 가라앉고 약간의 여유를 둔 뒤 상호작용한다.
 */
export async function gotoStable(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
}

/** 위와 같은 이유로, 입력 후 값이 실제로 남았는지 확인하고 아니면 재입력한다. */
export async function fillStable(locator: Locator, value: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await locator.fill(value);
    if ((await locator.inputValue()) === value) return;
    await locator.page().waitForTimeout(200);
  }
  throw new Error(`입력값이 유지되지 않는다: ${value}`);
}

export async function loginAsDemo(page: Page) {
  await gotoStable(page, "/login");
  await fillStable(page.getByLabel("핸들"), DEMO.handle);
  await fillStable(page.getByLabel("비밀번호"), DEMO.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}
