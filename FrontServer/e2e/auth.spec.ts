import { test, expect } from "@playwright/test";
import { fillStable, gotoStable, loginAsDemo } from "./helpers";

test("데모 계정으로 로그인하면 네비게이션에 로그아웃 버튼이 보인다", async ({
  page,
}) => {
  await loginAsDemo(page);
  await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();
  await expect(page.getByRole("link", { name: "@demo" })).toBeVisible();
});

test("잘못된 비밀번호는 로그인에 실패한다", async ({ page }) => {
  await gotoStable(page, "/login");
  await fillStable(page.getByLabel("핸들"), "demo");
  await fillStable(page.getByLabel("비밀번호"), "wrong-password");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(
    page.getByText("핸들 또는 비밀번호가 올바르지 않습니다.")
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("로그아웃하면 다시 게스트 상태가 된다", async ({ page }) => {
  await loginAsDemo(page);
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page.getByRole("link", { name: "로그인" })).toBeVisible();
});
