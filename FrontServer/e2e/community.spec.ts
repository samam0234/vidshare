import { test, expect } from "@playwright/test";
import { fillStable, gotoStable, loginAsDemo } from "./helpers";

test("로그인 후 커뮤니티 글을 작성하면 상세 페이지에 보인다", async ({
  page,
}) => {
  await loginAsDemo(page);

  const title = `E2E 테스트 글 ${Date.now()}`;
  const body = "Playwright 로 작성한 본문입니다.";

  await gotoStable(page, "/community/write");
  await fillStable(page.getByLabel("제목"), title);
  await fillStable(page.getByLabel("내용"), body);
  await page.getByRole("button", { name: "작성하고 상세 보기" }).click();

  await page.waitForURL(/\/community\/\d+$/);
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByText(body)).toBeVisible();

  await gotoStable(page, "/community");
  await expect(page.getByText(title)).toBeVisible();
});
