/**
 * 포트폴리오 사이트에 쓰는 스크린샷을 실제 실행 중인 앱에서 캡처한다.
 *
 * 세 서버(4000/3000/3200)가 이미 떠 있어야 하고, 콘솔 촬영에는 관리자 계정이 필요하다.
 *
 *   cd BackendServer && npm run create-admin -- <handle> <password>
 *   cd FrontServer   && CAPTURE_ADMIN_HANDLE=<handle> CAPTURE_ADMIN_PASSWORD=<password> \
 *                       npm run portfolio:shots
 *
 * 관리자 자격 증명은 환경 변수로만 받는다. 없으면 콘솔 화면은 건너뛰고
 * 나머지는 그대로 찍는다.
 */
import { chromium, type Browser, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const FRONT = process.env.CAPTURE_FRONT_URL ?? "http://localhost:3000";
const CONSOLE_URL = process.env.CAPTURE_CONSOLE_URL ?? "http://localhost:3200";

const OUT = path.resolve(__dirname, "../../portfolio/site/assets/screenshots");

// 데모 계정은 시드에 들어 있는 공개 테스트 계정이라 그대로 둔다.
const DEMO = { handle: "demo", password: "demo1234" };

// 관리자 계정은 환경마다 직접 만든다. 비밀번호를 소스에 두지 않는다.
const ADMIN = {
  handle: process.env.CAPTURE_ADMIN_HANDLE ?? "",
  password: process.env.CAPTURE_ADMIN_PASSWORD ?? "",
};

type Shot = { name: string; url: string; wait?: number; full?: boolean };

const FRONT_GUEST: Shot[] = [
  { name: "front-feed", url: `${FRONT}/`, wait: 2500 },
  { name: "front-longform", url: `${FRONT}/longform` },
  { name: "front-community", url: `${FRONT}/community` },
  { name: "front-search", url: `${FRONT}/search?q=test` },
  { name: "front-login", url: `${FRONT}/login` },
  { name: "front-terms", url: `${FRONT}/terms`, full: true },
  { name: "front-support", url: `${FRONT}/support` },
];

const FRONT_AUTH: Shot[] = [
  { name: "front-upload", url: `${FRONT}/upload` },
  { name: "front-messages", url: `${FRONT}/messages` },
  { name: "front-notifications", url: `${FRONT}/notifications` },
  { name: "front-profile", url: `${FRONT}/profile/u-demo` },
  { name: "front-following", url: `${FRONT}/following` },
  { name: "front-chatbot", url: `${FRONT}/chatbot`, wait: 2500 },
];

const CONSOLE_SHOTS: Shot[] = [
  { name: "console-dashboard", url: `${CONSOLE_URL}/` },
  { name: "console-reports", url: `${CONSOLE_URL}/reports` },
  { name: "console-users", url: `${CONSOLE_URL}/users` },
  { name: "console-content", url: `${CONSOLE_URL}/content` },
  { name: "console-support", url: `${CONSOLE_URL}/support` },
];

// 백엔드는 화면이 없다. API 응답은 브라우저 JSON 뷰어가 한 줄 raw 로 뿌려서
// 스크린샷이 읽히지 않으므로, 소개 사이트에 실제 응답을 코드 블록으로 넣었다.

const failures: string[] = [];

async function shoot(page: Page, shot: Shot) {
  try {
    await page.goto(shot.url, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForTimeout(shot.wait ?? 1200);
    await page.screenshot({
      path: path.join(OUT, `${shot.name}.png`),
      fullPage: shot.full ?? false,
    });
    console.log(`  ok   ${shot.name}`);
  } catch (err) {
    failures.push(`${shot.name} (${shot.url}): ${(err as Error).message.split("\n")[0]}`);
    console.log(`  FAIL ${shot.name}`);
  }
}

async function desktop(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  return { ctx, page: await ctx.newPage() };
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  console.log("게스트 화면");
  {
    const { ctx, page } = await desktop(browser);
    for (const s of FRONT_GUEST) await shoot(page, s);

    // 세로 피드는 모바일 폭이 실제 사용 모습에 가깝다
    const mobile = await browser.newContext({ viewport: { width: 400, height: 860 } });
    const mPage = await mobile.newPage();
    await shoot(mPage, { name: "front-feed-mobile", url: `${FRONT}/`, wait: 2500 });
    await mobile.close();
    await ctx.close();
  }

  console.log("로그인 화면");
  {
    const { ctx, page } = await desktop(browser);
    try {
      await page.goto(`${FRONT}/login`, { waitUntil: "networkidle" });
      await page.getByLabel("핸들").fill(DEMO.handle);
      await page.getByLabel("비밀번호").fill(DEMO.password);
      await page.getByRole("button", { name: "로그인" }).click();
      await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
      for (const s of FRONT_AUTH) await shoot(page, s);
    } catch (err) {
      failures.push(`front login: ${(err as Error).message.split("\n")[0]}`);
      console.log("  FAIL 로그인 — 회원 화면 건너뜀");
    }
    await ctx.close();
  }

  console.log("관리자 콘솔");
  {
    const { ctx, page } = await desktop(browser);
    await shoot(page, { name: "console-login", url: `${CONSOLE_URL}/login` });
    if (!ADMIN.handle || !ADMIN.password) {
      console.log("  건너뜀 — CAPTURE_ADMIN_HANDLE / CAPTURE_ADMIN_PASSWORD 가 없다");
    } else {
      try {
        await page.getByLabel("핸들").fill(ADMIN.handle);
        await page.getByLabel("비밀번호").fill(ADMIN.password);
        await page.getByRole("button", { name: "로그인" }).click();
        await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
        for (const s of CONSOLE_SHOTS) await shoot(page, s);
      } catch (err) {
        failures.push(`console login: ${(err as Error).message.split("\n")[0]}`);
        console.log("  FAIL 관리자 로그인 — 콘솔 화면 건너뜀");
      }
    }
    await ctx.close();
  }

  await browser.close();

  const saved = (await fs.readdir(OUT)).filter((f) => f.endsWith(".png"));
  console.log(`\n저장 ${saved.length}장 → ${OUT}`);
  if (failures.length) {
    console.log(`실패 ${failures.length}건:`);
    for (const f of failures) console.log(`  - ${f}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
