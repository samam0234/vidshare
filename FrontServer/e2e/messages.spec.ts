import { test, expect } from "@playwright/test";
import { fillStable, gotoStable, loginAsDemo } from "./helpers";

test("대화 상대를 추가하고 메시지를 보내면 실시간으로 화면에 반영된다", async ({
  page,
}) => {
  await loginAsDemo(page);

  const targetName = `E2E 상대 ${Date.now()}`;
  const messageText = `안녕하세요, WS 실시간 테스트 ${Date.now()}`;

  await gotoStable(page, "/messages");
  await page.getByRole("button", { name: "상대 추가" }).click();
  await fillStable(page.getByLabel("상대 이름"), targetName);
  await page.getByRole("button", { name: "추가하고 채팅 열기" }).click();

  await page.waitForURL(/\/messages\/\d+$/);
  await expect(page.getByText(targetName, { exact: true })).toBeVisible();

  const input = page.getByPlaceholder("메시지를 입력하세요...");
  await fillStable(input, messageText);
  await input.press("Enter");

  // WS 브로드캐스트를 받아 화면에 반영되는지 확인 (REST 응답이 아니라 서버 push 경로).
  await expect(page.getByText(messageText)).toBeVisible();

  await gotoStable(page, "/messages");
  const preview = messageText.length > 40 ? messageText.slice(0, 40) : messageText;
  await expect(page.getByText(preview)).toBeVisible();
});
