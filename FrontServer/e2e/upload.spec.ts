import { test, expect } from "@playwright/test";
import { gotoStable, loginAsDemo } from "./helpers";

test("업로드 화면은 쇼츠가 기본이고 서브메뉴로 롱폼 업로드 화면으로 바뀐다", async ({
  page,
}) => {
  await loginAsDemo(page);

  // 상단 "업로드" 버튼 → 기본은 쇼츠 업로드
  await gotoStable(page, "/");
  await page.getByRole("banner").getByRole("link", { name: "업로드" }).first().click();
  await page.waitForURL(/\/upload$/);
  await expect(page.getByRole("heading", { name: "쇼츠 업로드" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "업로드 종류" });
  await expect(nav.getByRole("link", { name: "쇼츠 업로드" })).toHaveAttribute(
    "aria-current",
    "page"
  );

  // 서브메뉴에서 롱폼 → 롱폼 업로드 화면
  await nav.getByRole("link", { name: "롱폼 업로드" }).click();
  await page.waitForURL(/\/upload\?type=longform$/);
  await expect(page.getByRole("heading", { name: "롱폼 업로드" })).toBeVisible();
  await expect(page.getByLabel("설명")).toBeVisible();
  await expect(nav.getByRole("link", { name: "롱폼 업로드" })).toHaveAttribute(
    "aria-current",
    "page"
  );

  // 다시 쇼츠로
  await nav.getByRole("link", { name: "쇼츠 업로드" }).click();
  await page.waitForURL(/\/upload$/);
  await expect(page.getByRole("heading", { name: "쇼츠 업로드" })).toBeVisible();
});

test("예전 롱폼 등록 주소는 롱폼 업로드 탭으로 이어진다", async ({ page }) => {
  await loginAsDemo(page);
  await page.goto("/longform/write");
  await page.waitForURL(/\/upload\?type=longform$/);
  await expect(page.getByRole("heading", { name: "롱폼 업로드" })).toBeVisible();
});

test("비회원이 롱폼 업로드 주소로 오면 로그인 뒤 그 탭으로 돌아온다", async ({
  page,
}) => {
  await page.goto("/upload?type=longform");
  await page.waitForURL(/\/login\?next=/);
  expect(decodeURIComponent(new URL(page.url()).searchParams.get("next") ?? "")).toBe(
    "/upload?type=longform"
  );
});
