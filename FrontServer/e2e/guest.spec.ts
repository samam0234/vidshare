import { test, expect } from "@playwright/test";

test("비회원도 쇼츠 피드를 볼 수 있다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "로그인" })).toBeVisible();
});

test("비회원이 업로드 페이지에 접근하면 로그인으로 리다이렉트된다", async ({
  page,
}) => {
  await page.goto("/upload");
  await page.waitForURL(/\/login/);
  await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();
});

test("비회원이 메시지함에 접근하면 로그인으로 리다이렉트된다", async ({
  page,
}) => {
  await page.goto("/messages");
  await page.waitForURL(/\/login/);
});
